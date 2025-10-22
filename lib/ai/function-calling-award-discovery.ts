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
 * Discover player awards using function calling (simpler approach)
 */
export async function discoverPlayerAwardsWithFunctions(
  playerName: string,
  sport: string,
  college?: string,
  team?: string
): Promise<AwardDiscoveryResult> {
  try {
    console.log(`🔍 Starting function-calling research for ${playerName}...`);

    // Define the function that the AI can call to search for awards
    const functions = [
      {
        name: "search_player_awards",
        description: "Search for awards and achievements for a specific player",
        parameters: {
          type: "object",
          properties: {
            player_name: {
              type: "string",
              description: "The name of the player to search for"
            },
            sport: {
              type: "string", 
              description: "The sport the player plays"
            },
            college: {
              type: "string",
              description: "The college/university the player attended"
            },
            team: {
              type: "string",
              description: "The professional team the player played for"
            },
            award_types: {
              type: "array",
              items: { type: "string" },
              description: "Types of awards to search for"
            }
          },
          required: ["player_name", "sport"]
        }
      },
      {
        name: "create_award_entry",
        description: "Create an award entry for a discovered award",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the award"
            },
            description: {
              type: "string", 
              description: "Description of what the award is for"
            },
            category: {
              type: "string",
              enum: ["sports", "academic", "personal", "professional"],
              description: "The category of the award"
            },
            year: {
              type: "number",
              description: "The year the award was received"
            },
            organization: {
              type: "string",
              description: "The organization that gave the award"
            },
            significance: {
              type: "string",
              enum: ["local", "regional", "national", "international"],
              description: "The significance level of the award"
            },
            source_url: {
              type: "string",
              description: "URL source for verification"
            }
          },
          required: ["name", "description", "category", "year", "organization", "significance"]
        }
      }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert sports researcher with comprehensive knowledge of athlete awards and achievements. 

          Your task is to find verifiable awards, achievements, and recognitions for athletes.

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

          Use the provided functions to search for and create award entries. Be thorough but accurate.`
        },
        {
          role: "user",
          content: `Research awards and achievements for: ${playerName}
          
          Sport: ${sport}
          ${college ? `College: ${college}` : ''}
          ${team ? `Current Team: ${team}` : ''}
          
          IMPORTANT: This player has played for multiple NFL teams including Indianapolis Colts and San Diego Chargers. 
          Search for awards from ALL teams they've played for.
          
          Please search for and create entries for all awards you find.`
        }
      ],
      functions: functions,
      function_call: "auto",
      temperature: 0.2,
      max_tokens: 4000,
    });

    const response = completion.choices[0]?.message;
    if (!response) {
      throw new Error("No response from OpenAI");
    }

    console.log(`✅ Function-calling research completed for ${playerName}`);

    // Process function calls
    const awards: PlayerAward[] = [];
    
    if (response.function_call) {
      const functionName = response.function_call.name;
      const functionArgs = JSON.parse(response.function_call.arguments);
      
      if (functionName === "create_award_entry") {
        const award: PlayerAward = {
          id: `award_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: functionArgs.name,
          description: functionArgs.description,
          category: functionArgs.category,
          year: functionArgs.year,
          organization: functionArgs.organization,
          significance: functionArgs.significance,
          source_url: functionArgs.source_url,
          verified: true
        };
        awards.push(award);
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
      confidence_score: awards.length > 0 ? 0.8 : 0.2
    };

  } catch (error) {
    console.error("Error discovering player awards with functions:", error);
    throw new Error("Failed to discover player awards");
  }
}
