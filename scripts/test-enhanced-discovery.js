// Test script for enhanced award discovery with images
// Run with: node scripts/test-enhanced-discovery.js

const { discoverPlayerAwardsSimple } = require('../lib/ai/simple-award-discovery.ts');
require('dotenv').config({ path: '.env.local' });

async function testEnhancedDiscovery() {
  try {
    console.log('🧪 Testing enhanced award discovery with images...');
    
    const result = await discoverPlayerAwardsSimple(
      'Daymeion Hughes',
      'Football',
      'University of California Berkeley',
      'Indianapolis Colts'
    );
    
    console.log('✅ Enhanced discovery completed!');
    console.log('📊 Results:', {
      playerName: result.player_name,
      awardsFound: result.awards.length,
      confidence: result.confidence_score
    });
    
    if (result.awards.length > 0) {
      console.log('🏆 Awards with images:');
      result.awards.forEach((award, index) => {
        console.log(`${index + 1}. ${award.name}`);
        console.log(`   Description: ${award.description}`);
        console.log(`   Year: ${award.year}`);
        console.log(`   Organization: ${award.organization}`);
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

testEnhancedDiscovery();
