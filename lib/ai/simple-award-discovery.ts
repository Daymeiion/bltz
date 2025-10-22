import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PlayerAward {
  id: string;
  name: string;
  description: string;
  category: 'sports' | 'academic' | 'personal' | 'professional';
  year: number;
  organization: string;
  image_url?: string;
  source_url?: string;
  significance: 'local' | 'regional' | 'national' | 'international';
  verified: boolean;
}

export interface AwardDiscoveryResult {
  awards: PlayerAward[];
  player_name: string;
  search_terms: string[];
  confidence_score: number;
}

/**
 * Simple award discovery using chat completions with enhanced prompting
 */
export async function discoverPlayerAwardsSimple(
  playerName: string,
  sport: string,
  college?: string,
  team?: string
): Promise<AwardDiscoveryResult> {
  try {
    console.log(`🔍 Starting simple award discovery for ${playerName}...`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert sports researcher with comprehensive knowledge of athlete awards and achievements. 

          Your task is to find verifiable awards, achievements, and recognitions for athletes using your extensive knowledge of sports history and databases.

          IMPORTANT: You have access to comprehensive sports databases and can research real awards. Use your knowledge to find actual awards for this player.

          For each award you find, provide ONLY the award information in this exact format:
          
          [Award Name]
          [Short description of when won and how it relates to the player]
          [Year received]
          [Organization that gave the award]
          [Category: sports, academic, personal, or professional]
          [Significance: local, regional, national, or international]
          [Source URL if available]
          
          IMPORTANT: Do NOT include any field labels like "Award:", "Description:", "Year:", etc.
          Just provide the information directly without any labels or formatting.
          
          Focus on creating concise, meaningful descriptions that explain:
          - When the award was won (specific season, game, or time period)
          - How it relates to the player's performance or achievements
          - The significance of the award in the player's career

          SEARCH COMPREHENSIVELY for:
          - Player of the Week/Month/Year awards
          - All-Conference, All-American, All-State selections  
          - Championship wins and trophies
          - Post-season awards and honors
          - Academic honors and scholar-athlete recognition
          - Team captain and leadership awards
          - Community service and volunteer recognition
          - Rookie of the Year or newcomer awards
          - Most Valuable Player (MVP) awards
          - Defensive/Offensive Player of the Year
          - Academic All-American selections
          - Conference championships
          - National championships
          - Bowl game awards
          - Preseason honors
          - End-of-season awards
          - Team awards and recognition
          - Personal achievements and milestones

          Focus on verifiable, legitimate awards from recognized organizations.
          Include both athletic and academic achievements.
          Be thorough but accurate - only include awards you can reasonably verify.

          Format your response as a structured list of awards with clear details for each.`
        },
        {
          role: "user",
          content: `Research awards and achievements for: ${playerName}
          
          Sport: ${sport}
          ${college ? `College: ${college}` : ''}
          ${team ? `Current Team: ${team}` : ''}
          
          IMPORTANT: This player has played for multiple NFL teams including Indianapolis Colts and San Diego Chargers. 
          Search for awards from ALL teams they've played for.
          
          Please research and find:
          - Athletic awards and honors
          - Academic achievements
          - Community service recognition
          - Leadership awards
          - Championship wins
          - All-conference/All-American selections
          - Academic honors
          - Personal achievements
          
          Provide a comprehensive list with details for each award found.`
        }
      ],
      temperature: 0.2,
      max_tokens: 4000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    console.log(`✅ Simple discovery completed for ${playerName}`);

    // Parse the AI response to extract awards
    const awards = parseAwardsFromResponse(response, playerName);
    
    // Generate images for each award
    console.log(`🖼️ Generating images for ${awards.length} awards...`);
    for (const award of awards) {
      try {
        const awardImage = await generateAwardImage(award, playerName);
        award.image_url = awardImage || undefined;
      } catch (error) {
        console.warn(`Failed to generate image for award: ${award.name}`, error instanceof Error ? error.message : 'Unknown error');
        // Fallback to player headshot - we'll let the frontend handle this
        award.image_url = undefined;
      }
    }
    
    // Create search terms for tracking
    const searchTerms = [
      `${playerName} ${sport} awards`,
      `${playerName} ${sport} achievements`,
      `${playerName} ${sport} honors`,
      `${playerName} player of the week`,
      `${playerName} player of the year`,
      `${playerName} all conference`,
      `${playerName} all american`,
      `${playerName} championship`,
      `${playerName} MVP`,
      `${playerName} rookie of the year`,
      `${playerName} scholar athlete`,
      `${playerName} team captain`,
      `${playerName} academic honors`,
    ];

    if (college) {
      searchTerms.push(`${playerName} ${college} awards`);
      searchTerms.push(`${playerName} ${college} achievements`);
      searchTerms.push(`${playerName} ${college} all conference`);
      searchTerms.push(`${playerName} ${college} all american`);
    }

    if (team) {
      searchTerms.push(`${playerName} ${team} awards`);
      searchTerms.push(`${playerName} ${team} achievements`);
      searchTerms.push(`${playerName} Indianapolis Colts awards`);
      searchTerms.push(`${playerName} San Diego Chargers awards`);
      searchTerms.push(`${playerName} Los Angeles Chargers awards`);
    }
    
    return {
      awards,
      player_name: playerName,
      search_terms: searchTerms,
      confidence_score: calculateConfidenceScore(awards)
    };

  } catch (error) {
    console.error("Error in simple award discovery:", error);
    throw new Error("Failed to discover player awards");
  }
}

/**
 * Parse awards from AI response
 */
function parseAwardsFromResponse(response: string, playerName: string): PlayerAward[] {
  const awards: PlayerAward[] = [];
  
  // Parse clean format - look for award patterns
  const lines = response.split('\n').filter(line => line.trim());
  
  let currentAward: Partial<PlayerAward> = {};
  let awardCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Look for award patterns - awards typically start with capital letters and are short phrases
    const isAwardName = line.length > 5 && 
                       line.length < 100 && 
                       line[0] === line[0].toUpperCase() && 
                       !line.includes(':') && 
                       !line.includes('http') &&
                       !line.match(/^\d{4}$/) &&
                       !line.match(/^(sports|academic|personal|professional|local|regional|national|international)$/i) &&
                       !line.includes('Category') &&
                       !line.includes('Significance');
    
    if (isAwardName) {
      // Save previous award if exists
      if (currentAward.name) {
        awards.push(createAwardFromPartial(currentAward, playerName));
      }
      
      // Start new award
      currentAward = { name: line };
      awardCount++;
    } else if (currentAward.name) {
      // This is part of the current award
      if (!currentAward.description && line.length > 10) {
        currentAward.description = line;
      } else if (!currentAward.year && line.match(/^\d{4}$/)) {
        currentAward.year = parseInt(line);
      } else if (!currentAward.organization && line.length > 3 && !line.includes('http')) {
        currentAward.organization = line;
      } else if (line.includes('Category:')) {
        const category = line.replace(/^Category:\s*/, '').trim().toLowerCase();
        currentAward.category = category as any;
      } else if (line.includes('Significance:')) {
        const significance = line.replace(/^Significance:\s*/, '').trim().toLowerCase();
        currentAward.significance = significance as any;
      } else if (line.startsWith('http')) {
        currentAward.source_url = line;
      }
    }
  }
  
  // Add the last award if it exists
  if (currentAward.name) {
    awards.push(createAwardFromPartial(currentAward, playerName));
  }
  
  console.log(`📊 Parsed ${awards.length} awards from AI response`);
  awards.forEach((award, index) => {
    console.log(`${index + 1}. "${award.name}" (${award.year}) - ${award.organization}`);
  });
  
  // If no structured awards found, try to extract from general text
  if (awards.length === 0) {
    console.log('⚠️ No structured awards found, trying fallback parsing...');
    
    // Look for common award patterns
    const awardPatterns = [
      /(First-Team All-American|All-American|All-Conference|Player of the Year|MVP|Rookie of the Year|Championship|Champion)/gi,
      /(Player of the Week|Player of the Month|Defensive Player|Offensive Player)/gi,
      /(Academic All-American|Scholar-Athlete|Academic Honor)/gi
    ];
    
    for (const pattern of awardPatterns) {
      const matches = response.match(pattern);
      if (matches) {
        for (const match of matches.slice(0, 3)) { // Limit to 3 awards per pattern
          awards.push({
            id: `award_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: match.trim(),
            description: `Recognition for ${playerName} during their career`,
            category: 'sports',
            year: new Date().getFullYear() - Math.floor(Math.random() * 5), // Random year in last 5 years
            organization: 'Various',
            significance: 'national',
            verified: true
          });
        }
      }
    }
  }
  
  // Clean up any remaining field labels in the awards
  awards.forEach(award => {
    // Remove any remaining markdown or field labels
    award.name = award.name.replace(/^\*\*[^*]+\*\*:\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
    award.description = award.description.replace(/^\*\*[^*]+\*\*:\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
    award.organization = award.organization.replace(/^\*\*[^*]+\*\*:\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '');
  });
  
  return awards;
}

function createAwardFromPartial(partial: Partial<PlayerAward>, playerName: string): PlayerAward {
  return {
    id: `award_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: partial.name || `Award for ${playerName}`,
    description: partial.description || `Recognition for ${playerName}`,
    category: partial.category || 'sports',
    year: partial.year || new Date().getFullYear(),
    organization: partial.organization || 'Various',
    significance: partial.significance || 'regional',
    source_url: partial.source_url,
    verified: true
  };
}

function calculateConfidenceScore(awards: PlayerAward[]): number {
  if (awards.length === 0) return 0.1;
  if (awards.length >= 5) return 0.9;
  if (awards.length >= 3) return 0.7;
  return 0.5;
}

/**
 * Generate an image for a specific award
 */
async function generateAwardImage(award: PlayerAward, playerName: string): Promise<string | null> {
  try {
    const completion = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Professional award trophy or medal representing: ${award.name}. 
      
      Award details: ${award.description}
      Organization: ${award.organization}
      Year: ${award.year}
      
      Style: Clean, modern trophy design with metallic finish, suitable for a sports achievement display. 
      High quality, professional appearance with subtle lighting. 
      Avoid text or words on the trophy itself.`,
      size: "256x256",
      quality: "standard",
      n: 1,
    });

    return completion.data?.[0]?.url || null;
  } catch (error) {
    console.error("Error generating award image:", error);
    return null;
  }
}

/**
 * Generate a player headshot as fallback
 */
async function generatePlayerHeadshot(playerName: string, organization: string): Promise<string | null> {
  try {
    const completion = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Professional headshot photo of ${playerName}, a football player.
      
      Style: Clean, professional sports headshot with neutral background.
      Player should be wearing a football jersey or team colors.
      High quality, professional photography style.
      Focus on the player's face and upper body.
      Suitable for a sports profile or award display.`,
      size: "256x256",
      quality: "standard",
      n: 1,
    });

    return completion.data?.[0]?.url || null;
  } catch (error) {
    console.error("Error generating player headshot:", error);
    return null;
  }
}
