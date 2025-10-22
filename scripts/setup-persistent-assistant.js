// Script to create a persistent OpenAI Assistant for award discovery
// Run with: node scripts/setup-persistent-assistant.js

const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function createPersistentAssistant() {
  try {
    console.log('🤖 Creating persistent Award Discovery Assistant...');
    
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    console.log('✅ API key found');

    // Create the assistant
    const assistant = await openai.beta.assistants.create({
      name: "BLTZ Award Discovery Assistant",
      instructions: `You are an expert sports researcher specializing in discovering athlete awards and achievements for the BLTZ platform.

      Your task is to find verifiable awards, achievements, and recognitions for athletes using your comprehensive knowledge of sports history and databases.

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

      For each award you find, provide:
      1. Award name
      2. Description of what the award is for
      3. Category (sports, academic, personal, professional)
      4. Year received
      5. Organization that gave the award
      6. Significance level (local, regional, national, international)
      7. Any image URLs if available
      8. Source URLs for verification

      Focus on verifiable, legitimate awards from recognized organizations.
      Include both athletic and academic achievements.
      Be thorough but accurate - only include awards you can reasonably verify.

      Format your response as a structured list of awards with clear details for each.`,
      model: "gpt-4o",
      tools: [
        {
          type: "code_interpreter"
        }
      ]
    });

    console.log(`✅ Persistent Assistant created successfully!`);
    console.log(`📋 Assistant ID: ${assistant.id}`);
    console.log(`📋 Assistant Name: ${assistant.name}`);
    console.log(`📋 Model: ${assistant.model}`);
    console.log(`📋 Tools: ${assistant.tools.map(t => t.type).join(', ')}`);
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Copy the Assistant ID above');
    console.log('2. Add it to your .env.local file as: OPENAI_ASSISTANT_ID=your_assistant_id_here');
    console.log('3. Update the assistant-manager.ts to use this persistent assistant');
    
    return assistant.id;

  } catch (error) {
    console.error('❌ Failed to create assistant:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

createPersistentAssistant();
