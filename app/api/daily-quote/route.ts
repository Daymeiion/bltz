import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cache quotes in memory (in production, use Redis or Supabase)
let quoteCache: { date: string; quote: string; author: string } | null = null;

const athleteQuotes = [
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "The only way to prove that you're a good sport is to lose.", author: "Ernie Banks" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { text: "The more difficult the victory, the greater the happiness in winning.", author: "Pelé" },
  { text: "Talent wins games, but teamwork and intelligence win championships.", author: "Michael Jordan" },
  { text: "The will to win means nothing without the will to prepare.", author: "Juma Ikangaa" },
  { text: "Champions aren't made in gyms. Champions are made from something they have deep inside them.", author: "Muhammad Ali" },
  { text: "The difference between the impossible and the possible lies in a person's determination.", author: "Tommy Lasorda" },
  { text: "I've failed over and over and over again in my life. And that is why I succeed.", author: "Michael Jordan" },
  { text: "Don't practice until you get it right. Practice until you can't get it wrong.", author: "Unknown" },
  { text: "Persistence can change failure into extraordinary achievement.", author: "Matt Biondi" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Excellence is not a skill, it's an attitude.", author: "Ralph Marston" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Set your goals high, and don't stop till you get there.", author: "Bo Jackson" },
  { text: "The only person you should try to be better than is the person you were yesterday.", author: "Unknown" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Pressure is a privilege.", author: "Billie Jean King" },
  { text: "The harder the battle, the sweeter the victory.", author: "Les Brown" },
  { text: "Winners never quit, and quitters never win.", author: "Vince Lombardi" },
  { text: "It's hard to beat a person who never gives up.", author: "Babe Ruth" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Today I will do what others won't, so tomorrow I can accomplish what others can't.", author: "Jerry Rice" },
];

export async function GET() {
  try {
    const today = new Date().toDateString();
    
    // Check if we have a cached quote for today
    if (quoteCache && quoteCache.date === today) {
      return NextResponse.json({ 
        quote: quoteCache.quote,
        author: quoteCache.author,
        cached: true 
      });
    }

    // If OpenAI API key is available, use it
    if (process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a motivational coach for athletes. Generate inspiring, concise motivational quotes (max 2 sentences) that encourage hard work, dedication, and excellence in sports. Make them personal and powerful.'
              },
              {
                role: 'user',
                content: 'Generate a unique motivational quote for an athlete to start their day.'
              }
            ],
            max_tokens: 100,
            temperature: 0.9,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices[0]?.message?.content?.trim();
          
          // Try to extract quote and author from OpenAI response
          let quote = content;
          let author = "Unknown";
          
          // If OpenAI fails, fall back to local quote
          if (!content) {
            const localQuote = getRandomQuote();
            quote = localQuote.text;
            author = localQuote.author;
          }
          
          // Cache the quote for today
          quoteCache = { date: today, quote, author };
          
          return NextResponse.json({ 
            quote,
            author,
            cached: false,
            source: 'openai'
          });
        }
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        // Fall through to use local quotes
      }
    }

    // Use local quote rotation based on day of year
    const localQuote = getRandomQuote();
    quoteCache = { date: today, quote: localQuote.text, author: localQuote.author };
    
    return NextResponse.json({ 
      quote: localQuote.text,
      author: localQuote.author,
      cached: false,
      source: 'local'
    });

  } catch (error) {
    console.error('Error fetching daily quote:', error);
    // Return a fallback quote
    return NextResponse.json({ 
      quote: "Today is your day. Go out there and make it count!",
      author: "Unknown",
      error: true
    });
  }
}

// Get a quote based on the day of the year for consistency
function getRandomQuote(): { text: string; author: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  const dayOfYear = Math.floor(diff / oneDay);
  
  // Use day of year to select a consistent quote for the day
  const index = dayOfYear % athleteQuotes.length;
  return athleteQuotes[index];
}

// Optional: Store quotes in Supabase for persistence across server restarts
async function getQuoteFromDatabase(date: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('daily_quotes')
      .select('quote')
      .eq('date', date)
      .single();
    
    if (error || !data) return null;
    return data.quote;
  } catch {
    return null;
  }
}

async function saveQuoteToDatabase(date: string, quote: string) {
  try {
    const supabase = await createClient();
    await supabase
      .from('daily_quotes')
      .upsert({ date, quote, created_at: new Date().toISOString() });
  } catch (error) {
    console.error('Error saving quote to database:', error);
  }
}

