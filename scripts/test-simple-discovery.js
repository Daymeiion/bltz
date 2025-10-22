// Test script for simple award discovery
// Run with: node scripts/test-simple-discovery.js

const { discoverPlayerAwardsSimple } = require('../lib/ai/simple-award-discovery.ts');
require('dotenv').config({ path: '.env.local' });

async function testSimpleDiscovery() {
  try {
    console.log('🧪 Testing simple award discovery...');
    
    const result = await discoverPlayerAwardsSimple(
      'Daymeion Hughes',
      'Football',
      'University of California Berkeley',
      'Indianapolis Colts'
    );
    
    console.log('✅ Simple discovery completed!');
    console.log('📊 Results:', {
      playerName: result.player_name,
      awardsFound: result.awards.length,
      confidence: result.confidence_score,
      searchTerms: result.search_terms.slice(0, 3) // Show first 3 search terms
    });
    
    if (result.awards.length > 0) {
      console.log('🏆 Sample awards:');
      result.awards.slice(0, 3).forEach((award, index) => {
        console.log(`${index + 1}. ${award.name} (${award.year}) - ${award.organization}`);
      });
    } else {
      console.log('⚠️ No awards found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testSimpleDiscovery();
