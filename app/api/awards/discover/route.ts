import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/rbac";
import { discoverPlayerAwards, generateAwardThumbnail } from "@/lib/ai/award-discovery";
import { discoverPlayerAwardsStructured } from "@/lib/ai/awards-assistant-json";
import { assistantManager } from "@/lib/ai/assistant-manager";
import { discoverPlayerAwardsWithFunctions } from "@/lib/ai/function-calling-award-discovery";
import { discoverPlayerAwardsSimple } from "@/lib/ai/simple-award-discovery";

export async function POST(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile?.player_id) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Fetch actual player data from database
    const supabaseClient = await createClient();
    const { data: player, error: playerError } = await supabaseClient
      .from('players')
      .select('full_name, school, team, position, name')
      .eq('id', profile.player_id)
      .single();

    if (playerError || !player) {
      return NextResponse.json({ error: "Player data not found" }, { status: 404 });
    }

    // Use actual player data for AI search
    const playerData = {
      playerName: player.full_name || player.name || 'Unknown Player',
      sport: 'Football', // Default sport, could be made dynamic
      college: player.school || 'Unknown School',
      team: player.team || 'Unknown Team',
      position: player.position || 'Unknown Position'
    };

    console.log('🔍 Starting award discovery for:', playerData);

    let discoveryResult;
    
    try {
      // 1) Try structured JSON assistant first
      console.log('🤖 Attempting structured JSON discovery...');
      discoveryResult = await discoverPlayerAwardsStructured(
        playerData.playerName,
        playerData.sport,
        playerData.college,
        playerData.team
      );
      console.log('✅ Structured JSON discovery successful');
    } catch (jsonAssistantError) {
      console.warn('⚠️ JSON assistant failed, trying simple discovery...', jsonAssistantError);
      try {
        // 2) Fallback: simple completion
        console.log('🔧 Attempting simple discovery...');
        discoveryResult = await discoverPlayerAwardsSimple(
          playerData.playerName,
          playerData.sport,
          playerData.college,
          playerData.team
        );
        console.log('✅ Simple discovery successful');
      } catch (simpleError) {
        console.warn('⚠️ Simple discovery failed, trying legacy assistant...', simpleError);
        try {
          // 3) Fallback: legacy assistant
          console.log('🤖 Attempting assistant-based discovery...');
          discoveryResult = await discoverPlayerAwards(
            playerData.playerName,
            playerData.sport,
            playerData.college,
            playerData.team
          );
          console.log('✅ Assistant discovery successful');
        } catch (assistantError) {
          console.warn('⚠️ Assistant discovery failed, trying function-calling...', assistantError);
          try {
            // 4) Final fallback: function calling
            console.log('🔧 Attempting function calling discovery...');
            discoveryResult = await discoverPlayerAwardsWithFunctions(
              playerData.playerName,
              playerData.sport,
              playerData.college,
              playerData.team
            );
            console.log('✅ Function calling discovery successful');
          } catch (functionError) {
            console.error('❌ All discovery methods failed:', functionError);
            throw new Error(
              `Award discovery failed: JSON assistant - ${jsonAssistantError instanceof Error ? jsonAssistantError.message : 'Unknown'}, Simple - ${simpleError instanceof Error ? simpleError.message : 'Unknown'}, Assistant - ${assistantError instanceof Error ? assistantError.message : 'Unknown'}, Function - ${functionError instanceof Error ? functionError.message : 'Unknown'}`
            );
          }
        }
      }
    }

    console.log('🎯 Discovery result:', {
      awardsFound: discoveryResult.awards.length,
      confidence: discoveryResult.confidence_score,
      searchTerms: discoveryResult.search_terms
    });

    // Use the same supabase client

    // Deduplicate awards before saving with more robust logic
    const uniqueAwards = discoveryResult.awards.reduce((acc: any[], award: any) => {
      const exists = acc.find(a => 
        a.name.toLowerCase().trim() === award.name.toLowerCase().trim() && 
        a.year === award.year
      );
      if (!exists) {
        acc.push(award);
      }
      return acc;
    }, []);

    // Save discovered awards to database
    const savedAwards = [];
    for (const award of uniqueAwards) {
      // Generate thumbnail if no image provided
      let imageUrl = award.image_url;
      if (!imageUrl) {
        imageUrl = await generateAwardThumbnail(award) || undefined;
      }

      // Check if award already exists
      const { data: existingAward } = await supabaseClient
        .from('player_awards')
        .select('id')
        .eq('player_id', profile.player_id)
        .eq('name', award.name)
        .eq('year', award.year)
        .single();

      if (existingAward) {
        console.log(`Award already exists: ${award.name} (${award.year})`);
        continue;
      }

      const { data: savedAward, error } = await supabaseClient
        .from('player_awards')
        .insert({
          player_id: profile.player_id,
          name: award.name,
          description: award.description,
          category: award.category,
          year: award.year,
          organization: award.organization,
          image_url: imageUrl,
          source_url: award.source_url,
          significance: award.significance,
          verified: award.verified,
          ai_discovered: true,
          confidence_score: discoveryResult.confidence_score
        })
        .select()
        .single();

      if (error) {
        console.error("Error saving award:", error);
        continue;
      }

      savedAwards.push(savedAward);
    }

    return NextResponse.json({
      success: true,
      awards: savedAwards,
      discovery_result: discoveryResult
    });

  } catch (error) {
    console.error("Error discovering awards:", error);
    return NextResponse.json(
      { error: "Failed to discover awards" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile?.player_id) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    const supabase = await createClient();

    // Get player's awards
    const { data: awards, error } = await supabase
      .from('player_awards')
      .select('*')
      .eq('player_id', profile.player_id)
      .order('year', { ascending: false });

    if (error) {
      console.error("Error fetching awards:", error);
      return NextResponse.json(
        { error: "Failed to fetch awards" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      awards: awards || []
    });

  } catch (error) {
    console.error("Error fetching awards:", error);
    return NextResponse.json(
      { error: "Failed to fetch awards" },
      { status: 500 }
    );
  }
}
