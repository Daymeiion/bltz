/**
 * Hybrid Award Discovery System
 * Combines web scraping, API calls, and AI validation for reliable award data
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AwardSource {
  name: string;
  description: string;
  year: number;
  organization: string;
  category: 'sports' | 'academic' | 'personal';
  significance: 'local' | 'conference' | 'national' | 'professional';
  source_url: string;
  image_url?: string;
  confidence: number; // 0-1, based on source reliability
  verified: boolean;
}

export interface DiscoveryResult {
  player_name: string;
  awards: AwardSource[];
  sources_checked: string[];
  total_found: number;
  verified_count: number;
  confidence_score: number;
}

/**
 * Primary discovery method - combines multiple sources
 */
export async function discoverPlayerAwardsHybrid(
  playerName: string,
  sport: string,
  college: string,
  teams: string[]
): Promise<DiscoveryResult> {
  const sources_checked: string[] = [];
  const allAwards: AwardSource[] = [];
  
  try {
    // 1. Scrape official team websites
    const teamAwards = await scrapeTeamWebsites(playerName, teams);
    allAwards.push(...teamAwards);
    sources_checked.push('team_websites');
    
    // 2. Scrape college athletics sites
    const collegeAwards = await scrapeCollegeSites(playerName, college);
    allAwards.push(...collegeAwards);
    sources_checked.push('college_athletics');
    
    // 3. Query sports databases
    const databaseAwards = await querySportsDatabases(playerName, sport);
    allAwards.push(...databaseAwards);
    sources_checked.push('sports_databases');
    
    // 4. AI validation and deduplication
    const validatedAwards = await validateAndDeduplicateAwards(allAwards, playerName);
    
    // 5. Generate missing images
    const awardsWithImages = await generateMissingImages(validatedAwards);
    
    const verified_count = awardsWithImages.filter(a => a.verified).length;
    const confidence_score = calculateConfidenceScore(awardsWithImages);
    
    return {
      player_name: playerName,
      awards: awardsWithImages,
      sources_checked,
      total_found: awardsWithImages.length,
      verified_count,
      confidence_score
    };
    
  } catch (error) {
    console.error('Hybrid discovery failed:', error);
    throw new Error(`Award discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Scrape official team websites for award information
 */
async function scrapeTeamWebsites(playerName: string, teams: string[]): Promise<AwardSource[]> {
  const awards: AwardSource[] = [];
  
  for (const team of teams) {
    try {
      // Example: Scrape Colts website for player awards
      const teamUrl = getTeamWebsite(team);
      if (!teamUrl) continue;
      
      // Use a headless browser or scraping service
      const scrapedData = await scrapeWebsite(teamUrl, {
        searchTerms: [playerName, 'award', 'honor', 'recognition'],
        selectors: {
          awards: '.awards, .honors, .achievements',
          year: '.year, .season',
          description: '.description, .details'
        }
      });
      
      // Convert scraped data to AwardSource format
      const teamAwards = scrapedData.map(item => ({
        name: item.title,
        description: item.description,
        year: extractYear(item.year),
        organization: team,
        category: 'sports' as const,
        significance: determineSignificance(item.title),
        source_url: item.url,
        confidence: 0.9, // High confidence for official team sites
        verified: true
      }));
      
      awards.push(...teamAwards);
      
    } catch (error) {
      console.warn(`Failed to scrape ${team} website:`, error);
    }
  }
  
  return awards;
}

/**
 * Scrape college athletics websites
 */
async function scrapeCollegeSites(playerName: string, college: string): Promise<AwardSource[]> {
  const awards: AwardSource[] = [];
  
  try {
    const collegeUrl = getCollegeWebsite(college);
    if (!collegeUrl) return awards;
    
    const scrapedData = await scrapeWebsite(collegeUrl, {
      searchTerms: [playerName, 'all-conference', 'all-american', 'academic'],
      selectors: {
        awards: '.honors, .awards, .recognition',
        year: '.year, .season',
        description: '.description'
      }
    });
    
    const collegeAwards = scrapedData.map(item => ({
      name: item.title,
      description: item.description,
      year: extractYear(item.year),
      organization: college,
      category: 'sports' as const,
      significance: determineSignificance(item.title),
      source_url: item.url,
      confidence: 0.85, // High confidence for official college sites
      verified: true
    }));
    
    awards.push(...collegeAwards);
    
  } catch (error) {
    console.warn(`Failed to scrape ${college} website:`, error);
  }
  
  return awards;
}

/**
 * Query sports databases and APIs
 */
async function querySportsDatabases(playerName: string, sport: string): Promise<AwardSource[]> {
  const awards: AwardSource[] = [];
  
  try {
    // ESPN API (if available)
    const espnAwards = await queryESPN(playerName, sport);
    awards.push(...espnAwards);
    
    // Sports Reference scraping
    const srAwards = await scrapeSportsReference(playerName, sport);
    awards.push(...srAwards);
    
    // NCAA database
    const ncaaAwards = await queryNCAA(playerName, sport);
    awards.push(...ncaaAwards);
    
  } catch (error) {
    console.warn('Failed to query sports databases:', error);
  }
  
  return awards;
}

/**
 * Use AI to validate and deduplicate awards
 */
async function validateAndDeduplicateAwards(
  awards: AwardSource[], 
  playerName: string
): Promise<AwardSource[]> {
  try {
    const prompt = `
You are a sports data expert. Validate and deduplicate these awards for ${playerName}.

Awards to validate:
${JSON.stringify(awards, null, 2)}

Return a JSON array of valid, deduplicated awards. For each award:
1. Verify it's actually an award (not just a statistic or mention)
2. Ensure the name is concise (2-8 words)
3. Ensure the description explains when/why it was won
4. Remove duplicates (same award, same year)
5. Set confidence based on source reliability
6. Mark as verified if from official sources

Return format:
{
  "awards": [
    {
      "name": "Award Name",
      "description": "When and why won",
      "year": 2020,
      "organization": "Issuing Organization",
      "category": "sports|academic|personal",
      "significance": "local|conference|national|professional",
      "source_url": "https://...",
      "confidence": 0.9,
      "verified": true
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 4000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return awards;

    const parsed = JSON.parse(response);
    return parsed.awards || awards;

  } catch (error) {
    console.warn('AI validation failed, returning original awards:', error);
    return awards;
  }
}

/**
 * Generate missing images using DALL-E
 */
async function generateMissingImages(awards: AwardSource[]): Promise<AwardSource[]> {
  return Promise.all(awards.map(async (award) => {
    if (award.image_url) return award;
    
    try {
      const imageUrl = await generateAwardImage(award);
      return { ...award, image_url: imageUrl };
    } catch (error) {
      console.warn(`Failed to generate image for ${award.name}:`, error);
      return award;
    }
  }));
}

// Helper functions
function getTeamWebsite(team: string): string | null {
  const teamSites: Record<string, string> = {
    'Indianapolis Colts': 'https://www.colts.com',
    'San Diego Chargers': 'https://www.chargers.com',
    'Los Angeles Chargers': 'https://www.chargers.com',
    // Add more teams
  };
  return teamSites[team] || null;
}

function getCollegeWebsite(college: string): string | null {
  const collegeSites: Record<string, string> = {
    'University of California Berkeley': 'https://calbears.com',
    'Cal': 'https://calbears.com',
    // Add more colleges
  };
  return collegeSites[college] || null;
}

async function scrapeWebsite(url: string, config: any): Promise<any[]> {
  // Implement web scraping logic here
  // Could use Puppeteer, Playwright, or a scraping service
  return [];
}

async function queryESPN(playerName: string, sport: string): Promise<AwardSource[]> {
  // Implement ESPN API calls
  return [];
}

async function scrapeSportsReference(playerName: string, sport: string): Promise<AwardSource[]> {
  // Implement Sports Reference scraping
  return [];
}

async function queryNCAA(playerName: string, sport: string): Promise<AwardSource[]> {
  // Implement NCAA database queries
  return [];
}

function extractYear(text: string): number {
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  return yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
}

function determineSignificance(title: string): 'local' | 'conference' | 'national' | 'professional' {
  const lower = title.toLowerCase();
  if (lower.includes('all-american') || lower.includes('national')) return 'national';
  if (lower.includes('all-conference') || lower.includes('pac-10') || lower.includes('pac-12')) return 'conference';
  if (lower.includes('nfl') || lower.includes('professional')) return 'professional';
  return 'local';
}

function calculateConfidenceScore(awards: AwardSource[]): number {
  if (awards.length === 0) return 0;
  const totalConfidence = awards.reduce((sum, award) => sum + award.confidence, 0);
  return totalConfidence / awards.length;
}

async function generateAwardImage(award: AwardSource): Promise<string> {
  try {
    const prompt = `Award trophy or medal for "${award.name}" - ${award.organization} ${award.year}. Professional sports award, clean background, high quality`;
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });
    
    return response.data[0]?.url || '';
  } catch (error) {
    console.warn('Failed to generate award image:', error);
    return '';
  }
}
