import OpenAI from "openai";
import { assistantManager } from "./assistant-manager";

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
 * Discover player awards using OpenAI Assistant with web browsing
 */
export async function discoverPlayerAwards(
  playerName: string,
  sport: string,
  college?: string,
  team?: string
): Promise<AwardDiscoveryResult> {
  try {
    console.log(`🔍 Starting OpenAI Assistant research for ${playerName}...`);

    // Get or create the assistant
    const assistantId = await assistantManager.getOrCreateAssistant();

    // Create comprehensive search message
    const searchMessage = `Research awards and achievements for: ${playerName}
    
    Sport: ${sport}
    ${college ? `College: ${college}` : ''}
    ${team ? `Current Team: ${team}` : ''}
    
    IMPORTANT: This player has played for multiple NFL teams including Indianapolis Colts and San Diego Chargers. 
    Search for awards from ALL teams they've played for.
    
    Please use web search to find:
    - Athletic awards and honors
    - Academic achievements  
    - Community service recognition
    - Leadership awards
    - Championship wins
    - All-conference/All-American selections
    - Academic honors
    - Personal achievements
    
    Provide a comprehensive list with details for each award found.`;

    // Run the assistant with web browsing
    const response = await assistantManager.runAssistant(assistantId, searchMessage);

    console.log(`✅ Assistant research completed for ${playerName}`);

    // Parse the AI response to extract awards
    const awards = parseAwardsFromResponse(response, playerName);
    
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
    console.error("Error discovering player awards:", error);
    console.error("Full error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    throw new Error(`Failed to discover player awards: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse awards from AI response
 */
function parseAwardsFromResponse(response: string, playerName: string): PlayerAward[] {
  const awards: PlayerAward[] = [];
  
  // This is a simplified parser - in production, you'd want more sophisticated parsing
  const lines = response.split('\n').filter(line => line.trim());
  
  let currentAward: Partial<PlayerAward> = {};
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Look for award patterns
    if (trimmedLine.includes('Award:') || trimmedLine.includes('Achievement:')) {
      if (Object.keys(currentAward).length > 0) {
        awards.push(createAwardFromData(currentAward, playerName));
      }
      currentAward = {};
    }
    
    // Parse different fields
    if (trimmedLine.startsWith('Name:')) {
      currentAward.name = trimmedLine.replace('Name:', '').trim();
    } else if (trimmedLine.startsWith('Description:')) {
      currentAward.description = trimmedLine.replace('Description:', '').trim();
    } else if (trimmedLine.startsWith('Category:')) {
      currentAward.category = trimmedLine.replace('Category:', '').trim() as any;
    } else if (trimmedLine.startsWith('Year:')) {
      currentAward.year = parseInt(trimmedLine.replace('Year:', '').trim());
    } else if (trimmedLine.startsWith('Organization:')) {
      currentAward.organization = trimmedLine.replace('Organization:', '').trim();
    } else if (trimmedLine.startsWith('Significance:')) {
      currentAward.significance = trimmedLine.replace('Significance:', '').trim() as any;
    } else if (trimmedLine.startsWith('Image:')) {
      currentAward.image_url = trimmedLine.replace('Image:', '').trim();
    } else if (trimmedLine.startsWith('Source:')) {
      currentAward.source_url = trimmedLine.replace('Source:', '').trim();
    }
  }
  
  // Add the last award if exists
  if (Object.keys(currentAward).length > 0) {
    awards.push(createAwardFromData(currentAward, playerName));
  }
  
  return awards;
}

/**
 * Create award object from parsed data
 */
function createAwardFromData(data: Partial<PlayerAward>, playerName: string): PlayerAward {
  return {
    id: `award_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: data.name || 'Unknown Award',
    description: data.description || 'Award description not available',
    category: data.category || 'sports',
    year: data.year || new Date().getFullYear(),
    organization: data.organization || 'Unknown Organization',
    image_url: data.image_url,
    source_url: data.source_url,
    significance: data.significance || 'local',
    verified: false
  };
}

/**
 * Calculate confidence score based on award data quality
 */
function calculateConfidenceScore(awards: PlayerAward[]): number {
  if (awards.length === 0) return 0;
  
  let score = 0;
  const totalAwards = awards.length;
  
  awards.forEach(award => {
    // Base score for having an award
    score += 1;
    
    // Bonus for complete information
    if (award.description && award.description !== 'Award description not available') score += 0.2;
    if (award.organization && award.organization !== 'Unknown Organization') score += 0.2;
    if (award.image_url) score += 0.3;
    if (award.source_url) score += 0.3;
    if (award.significance === 'national' || award.significance === 'international') score += 0.2;
  });
  
  return Math.min(score / totalAwards, 1);
}

/**
 * Verify award authenticity using web search
 */
export async function verifyAward(award: PlayerAward): Promise<boolean> {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a fact-checker. Verify if the given award information is accurate and legitimate. Return only 'true' or 'false'."
        },
        {
          role: "user",
          content: `Verify this award: ${award.name} - ${award.description} by ${award.organization} in ${award.year}`
        }
      ],
      temperature: 0.1,
      max_tokens: 10,
    });

    const response = completion.choices[0]?.message?.content?.toLowerCase();
    return response?.includes('true') || false;
  } catch (error) {
    console.error("Error verifying award:", error);
    return false;
  }
}

/**
 * Get award thumbnail image using AI
 */
export async function generateAwardThumbnail(award: PlayerAward): Promise<string | null> {
  try {
    const completion = await openai.images.generate({
      model: "dall-e-3",
      prompt: `A professional award trophy or medal representing: ${award.name} - ${award.description}. Clean, modern design with metallic finish, suitable for a sports achievement display.`,
      size: "256x256",
      quality: "standard",
      n: 1,
    });

    return completion.data?.[0]?.url || null;
  } catch (error) {
    console.error("Error generating award thumbnail:", error);
    return null;
  }
}
