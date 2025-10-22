/**
 * Web Scraper for Sports Awards
 * Uses Puppeteer to scrape official team and college websites
 */

import puppeteer from 'puppeteer';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ScrapedAward {
  title: string;
  description: string;
  year: number;
  organization: string;
  source_url: string;
  confidence: number;
}

export interface ScrapingConfig {
  searchTerms: string[];
  selectors: {
    awards: string;
    year: string;
    description: string;
    title: string;
  };
  maxPages?: number;
  delay?: number;
}

/**
 * Main scraping function
 */
export async function scrapePlayerAwards(
  playerName: string,
  team: string,
  college: string
): Promise<ScrapedAward[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const awards: ScrapedAward[] = [];
    
    // 1. Scrape team website
    if (team) {
      const teamAwards = await scrapeTeamWebsite(browser, playerName, team);
      awards.push(...teamAwards);
    }
    
    // 2. Scrape college website
    if (college) {
      const collegeAwards = await scrapeCollegeWebsite(browser, playerName, college);
      awards.push(...collegeAwards);
    }
    
    // 3. Scrape Sports Reference
    const srAwards = await scrapeSportsReference(browser, playerName);
    awards.push(...srAwards);
    
    return awards;
    
  } finally {
    await browser.close();
  }
}

/**
 * Scrape team website for player awards
 */
async function scrapeTeamWebsite(
  browser: puppeteer.Browser,
  playerName: string,
  team: string
): Promise<ScrapedAward[]> {
  const page = await browser.newPage();
  const awards: ScrapedAward[] = [];
  
  try {
    const teamUrl = getTeamUrl(team);
    if (!teamUrl) return awards;
    
    console.log(`🔍 Scraping ${team} website for ${playerName}...`);
    
    await page.goto(teamUrl, { waitUntil: 'networkidle2' });
    
    // Search for player
    const searchResults = await searchForPlayer(page, playerName);
    
    for (const resultUrl of searchResults) {
      try {
        await page.goto(resultUrl, { waitUntil: 'networkidle2' });
        
        // Look for awards/honors sections
        const awardElements = await page.$$eval(
          '.awards, .honors, .achievements, .recognition, [class*="award"], [class*="honor"]',
          (elements) => elements.map(el => ({
            text: el.textContent?.trim() || '',
            html: el.innerHTML
          }))
        );
        
        for (const element of awardElements) {
          const award = await parseAwardFromElement(element, playerName, team);
          if (award) {
            awards.push(award);
          }
        }
        
      } catch (error) {
        console.warn(`Failed to scrape ${resultUrl}:`, error);
      }
    }
    
  } catch (error) {
    console.warn(`Failed to scrape ${team} website:`, error);
  } finally {
    await page.close();
  }
  
  return awards;
}

/**
 * Scrape college website for player awards
 */
async function scrapeCollegeWebsite(
  browser: puppeteer.Browser,
  playerName: string,
  college: string
): Promise<ScrapedAward[]> {
  const page = await browser.newPage();
  const awards: ScrapedAward[] = [];
  
  try {
    const collegeUrl = getCollegeUrl(college);
    if (!collegeUrl) return awards;
    
    console.log(`🔍 Scraping ${college} website for ${playerName}...`);
    
    await page.goto(collegeUrl, { waitUntil: 'networkidle2' });
    
    // Search for player in athletics section
    const searchResults = await searchForPlayer(page, playerName);
    
    for (const resultUrl of searchResults) {
      try {
        await page.goto(resultUrl, { waitUntil: 'networkidle2' });
        
        // Look for awards/honors sections
        const awardElements = await page.$$eval(
          '.awards, .honors, .achievements, .recognition, [class*="award"], [class*="honor"], [class*="all-conference"], [class*="all-american"]',
          (elements) => elements.map(el => ({
            text: el.textContent?.trim() || '',
            html: el.innerHTML
          }))
        );
        
        for (const element of awardElements) {
          const award = await parseAwardFromElement(element, playerName, college);
          if (award) {
            awards.push(award);
          }
        }
        
      } catch (error) {
        console.warn(`Failed to scrape ${resultUrl}:`, error);
      }
    }
    
  } catch (error) {
    console.warn(`Failed to scrape ${college} website:`, error);
  } finally {
    await page.close();
  }
  
  return awards;
}

/**
 * Scrape Sports Reference for player awards
 */
async function scrapeSportsReference(
  browser: puppeteer.Browser,
  playerName: string
): Promise<ScrapedAward[]> {
  const page = await browser.newPage();
  const awards: ScrapedAward[] = [];
  
  try {
    console.log(`🔍 Scraping Sports Reference for ${playerName}...`);
    
    // Search for player on Sports Reference
    const searchUrl = `https://www.sports-reference.com/cfb/players/${playerName.toLowerCase().replace(/\s+/g, '-')}-1.html`;
    
    try {
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Look for awards section
      const awardElements = await page.$$eval(
        '.awards, .honors, .achievements, [class*="award"], [class*="honor"]',
        (elements) => elements.map(el => ({
          text: el.textContent?.trim() || '',
          html: el.innerHTML
        }))
      );
      
      for (const element of awardElements) {
        const award = await parseAwardFromElement(element, playerName, 'Sports Reference');
        if (award) {
          awards.push(award);
        }
      }
      
    } catch (error) {
      console.warn(`Failed to scrape Sports Reference:`, error);
    }
    
  } catch (error) {
    console.warn(`Failed to scrape Sports Reference:`, error);
  } finally {
    await page.close();
  }
  
  return awards;
}

/**
 * Search for player on a website
 */
async function searchForPlayer(page: puppeteer.Page, playerName: string): Promise<string[]> {
  try {
    // Try to find search functionality
    const searchInput = await page.$('input[type="search"], input[placeholder*="search"], input[name*="search"]');
    
    if (searchInput) {
      await searchInput.type(playerName);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(2000);
      
      // Get search result links
      const resultLinks = await page.$$eval(
        'a[href*="player"], a[href*="roster"], a[href*="profile"]',
        (links) => links.map(link => link.href)
      );
      
      return resultLinks.slice(0, 5); // Limit to first 5 results
    }
    
    // Fallback: look for player links directly
    const playerLinks = await page.$$eval(
      `a[href*="player"]:contains("${playerName}"), a[href*="roster"]:contains("${playerName}")`,
      (links) => links.map(link => link.href)
    );
    
    return playerLinks.slice(0, 5);
    
  } catch (error) {
    console.warn('Search failed, trying direct links:', error);
    return [];
  }
}

/**
 * Parse award information from HTML element
 */
async function parseAwardFromElement(
  element: { text: string; html: string },
  playerName: string,
  organization: string
): Promise<ScrapedAward | null> {
  try {
    // Use AI to extract structured award data from HTML
    const prompt = `
Extract award information from this HTML content for player "${playerName}":

HTML: ${element.html}
Text: ${element.text}

Return a JSON object with:
- title: Short award name (2-8 words)
- description: When and why the award was won
- year: Year the award was given
- organization: "${organization}"
- source_url: URL if found in links
- confidence: 0.0-1.0 based on how clear the award information is

If no clear award is found, return null.

Example:
{
  "title": "First-Team All-Pac-10",
  "description": "Selected to the First-Team All-Pac-10 for exceptional defensive performance during the 2008 season",
  "year": 2008,
  "organization": "${organization}",
  "source_url": "https://example.com",
  "confidence": 0.9
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response || response.includes('null')) return null;

    const award = JSON.parse(response);
    
    // Validate the award
    if (!award.title || !award.description || !award.year) return null;
    
    return award;
    
  } catch (error) {
    console.warn('Failed to parse award from element:', error);
    return null;
  }
}

/**
 * Get team website URL
 */
function getTeamUrl(team: string): string | null {
  const teamUrls: Record<string, string> = {
    'Indianapolis Colts': 'https://www.colts.com',
    'San Diego Chargers': 'https://www.chargers.com',
    'Los Angeles Chargers': 'https://www.chargers.com',
    'Denver Broncos': 'https://www.denverbroncos.com',
    'Kansas City Chiefs': 'https://www.chiefs.com',
    'Las Vegas Raiders': 'https://www.raiders.com',
    'Los Angeles Rams': 'https://www.therams.com',
    'San Francisco 49ers': 'https://www.49ers.com',
    'Seattle Seahawks': 'https://www.seahawks.com',
    'Arizona Cardinals': 'https://www.azcardinals.com',
  };
  
  return teamUrls[team] || null;
}

/**
 * Get college website URL
 */
function getCollegeUrl(college: string): string | null {
  const collegeUrls: Record<string, string> = {
    'University of California Berkeley': 'https://calbears.com',
    'Cal': 'https://calbears.com',
    'University of California': 'https://calbears.com',
    'Stanford University': 'https://gostanford.com',
    'UCLA': 'https://uclabruins.com',
    'USC': 'https://usctrojans.com',
    'University of Oregon': 'https://goducks.com',
    'Oregon State University': 'https://osubeavers.com',
    'University of Washington': 'https://gohuskies.com',
    'Washington State University': 'https://wsucougars.com',
  };
  
  return collegeUrls[college] || null;
}
