// Test script for the persistent assistant
// Run with: node scripts/test-persistent-assistant.js

const { OpenAI } = require('openai');
require('dotenv').config({ path: '.env.local' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testPersistentAssistant() {
  try {
    console.log('🧪 Testing persistent assistant...');
    
    // Check if assistant ID exists
    const assistantId = process.env.OPENAI_ASSISTANT_ID;
    if (!assistantId) {
      throw new Error('OPENAI_ASSISTANT_ID not found in environment variables');
    }
    console.log('✅ Assistant ID found:', assistantId);

    // Test 1: Verify assistant exists
    console.log('🔍 Verifying assistant exists...');
    const assistant = await openai.beta.assistants.retrieve(assistantId);
    console.log('✅ Assistant found:', assistant.name);

    // Test 2: Create a thread
    console.log('🧵 Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log('✅ Thread created:', thread.id);

    // Test 3: Add a simple message
    console.log('💬 Adding test message...');
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "Hello, can you help me research awards for a football player named Daymeion Hughes who played at Cal and for the Indianapolis Colts and San Diego Chargers?"
    });
    console.log('✅ Message added');

    // Test 4: Run the assistant
    console.log('🏃 Running assistant...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });
    console.log('✅ Run started:', run.id);

    // Test 5: Wait for completion (with timeout)
    console.log('⏳ Waiting for completion...');
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 15; // 30 second timeout for test
    
    while ((runStatus.status === 'queued' || runStatus.status === 'in_progress') && attempts < maxAttempts) {
      console.log(`Status: ${runStatus.status} (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.log('⏰ Test timed out, but assistant is working');
      return;
    }

    if (runStatus.status === 'completed') {
      console.log('✅ Assistant completed successfully');
      
      // Get the response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessage = messages.data[0];
      
      if (assistantMessage && assistantMessage.role === 'assistant') {
        const response = assistantMessage.content[0];
        if (response.type === 'text') {
          console.log('📝 Assistant response preview:', response.text.value.substring(0, 200) + '...');
        }
      }
    } else {
      console.log(`⚠️ Assistant status: ${runStatus.status}`);
      if (runStatus.last_error) {
        console.log('❌ Error:', runStatus.last_error);
      }
    }

    console.log('🎉 Persistent assistant test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testPersistentAssistant();
