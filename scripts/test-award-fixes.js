// Test script for award display and deduplication fixes
// Run with: node scripts/test-award-fixes.js

const { discoverPlayerAwardsSimple } = require('../lib/ai/simple-award-discovery.ts');
require('dotenv').config({ path: '.env.local' });

async function testAwardFixes() {
  try {
    console.log('🧪 Testing award display and deduplication fixes...');
    
    const result = await discoverPlayerAwardsSimple(
      'Daymeion Hughes',
      'Football',
      'University of California Berkeley',
      'Indianapolis Colts'
    );
    
    console.log('✅ Award discovery completed!');
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
        console.log(`   Category: ${award.category}`);
        console.log(`   Significance: ${award.significance}`);
        console.log(`   Image: ${award.image_url ? '✅ Generated' : '❌ No image'}`);
        console.log('');
      });
      
      // Check for duplicates
      const names = result.awards.map(a => a.name);
      const uniqueNames = [...new Set(names)];
      const duplicates = names.length - uniqueNames.length;
      
      console.log(`🔍 Duplicate Check:`);
      console.log(`   Total awards: ${result.awards.length}`);
      console.log(`   Unique names: ${uniqueNames.length}`);
      console.log(`   Duplicates found: ${duplicates}`);
      
      if (duplicates === 0) {
        console.log('✅ No duplicates found!');
      } else {
        console.log('⚠️ Duplicates detected - deduplication needed');
      }
    } else {
      console.log('⚠️ No awards found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testAwardFixes();
