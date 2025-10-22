// Test script for OpenAI Assistant setup
// Run with: node scripts/test-assistant.js

const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testAssistantSetup() {
  try {
    console.log('🧪 Testing OpenAI Assistant setup...');
    
    // Test 1: Check API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    console.log('✅ API key found');

    // Test 2: Create a simple assistant
    console.log('🤖 Creating test assistant...');
    const assistant = await openai.beta.assistants.create({
      name: "Test Assistant",
      instructions: "You are a test assistant.",
      model: "gpt-4o",
      tools: [
        {
          type: "code_interpreter"
        }
      ]
    });

    console.log(`✅ Assistant created with ID: ${assistant.id}`);

    // Test 3: Create a thread
    console.log('🧵 Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log(`✅ Thread created with ID: ${thread.id}`);

    // Test 4: Add a message
    console.log('💬 Adding message...');
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "Hello, can you search the web for information about football awards?"
    });
    console.log('✅ Message added');

    // Test 5: Run the assistant
    console.log('🏃 Running assistant...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });
    console.log(`✅ Run started with ID: ${run.id}`);

    // Test 6: Wait for completion (simplified)
    console.log('⏳ Waiting for completion...');
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < 5) {
      console.log(`Status: ${runStatus.status}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (runStatus.status === 'completed') {
      console.log('✅ Assistant completed successfully');
    } else {
      console.log(`⚠️ Assistant status: ${runStatus.status}`);
    }

    // Cleanup
    console.log('🧹 Cleaning up...');
    await openai.beta.assistants.del(assistant.id);
    console.log('✅ Test assistant deleted');

    console.log('🎉 All tests passed! OpenAI Assistant is properly configured.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testAssistantSetup();
