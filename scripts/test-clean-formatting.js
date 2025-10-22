// Test script for clean award formatting
// Run with: node scripts/test-clean-formatting.js

const { discoverPlayerAwardsSimple } = require('../lib/ai/simple-award-discovery.ts');
require('dotenv').config({ path: '.env.local' });

async function testCleanFormatting() {
  try {
    console.log('🧪 Testing clean award formatting...');
    
    const result = await discoverPlayerAwardsSimple(
      'Daymeion Hughes',
      'Football',
      'University of California Berkeley',
      'Indianapolis Colts'
    );
    
    console.log('✅ Clean formatting test completed!');
    console.log('📊 Results:', {
      playerName: result.player_name,
      awardsFound: result.awards.length,
      confidence: result.confidence_score
    });
    
    if (result.awards.length > 0) {
      console.log('🏆 Awards with clean formatting:');
      result.awards.forEach((award, index) => {
        console.log(`${index + 1}. Award Name: "${award.name}"`);
        console.log(`   Description: "${award.description}"`);
        console.log(`   Year: ${award.year}`);
        console.log(`   Organization: "${award.organization}"`);
        console.log(`   Image: ${award.image_url ? '✅ Generated' : '❌ No image'}`);
        console.log('');
      });
    } else {
      console.log('⚠️ No awards found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testCleanFormatting();
