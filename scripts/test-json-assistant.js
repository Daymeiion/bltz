// Test script for JSON assistant award discovery
// Run with: node scripts/test-json-assistant.js

const { discoverPlayerAwardsStructured } = require('../lib/ai/awards-assistant-json.ts');
require('dotenv').config({ path: '.env.local' });

async function testJsonAssistant() {
  try {
    console.log('🧪 Testing JSON assistant award discovery...');
    console.log('─'.repeat(80));
    
    const result = await discoverPlayerAwardsStructured(
      'Daymeion Hughes',
      'Football',
      'University of California Berkeley',
      'Indianapolis Colts'
    );
    
    console.log('─'.repeat(80));
    console.log('✅ JSON assistant discovery completed!');
    console.log('📊 Summary:', {
      playerName: result.player_name,
      awardsFound: result.awards.length,
      confidence: result.confidence_score
    });
    
    if (result.awards.length > 0) {
      console.log('\n🏆 Discovered Awards:');
      console.log('─'.repeat(80));
      
      result.awards.forEach((award, index) => {
        console.log(`\n${index + 1}. ${award.name}`);
        console.log(`   📝 Description: ${award.description}`);
        console.log(`   📅 Year: ${award.year}`);
        console.log(`   🏢 Organization: ${award.organization}`);
        console.log(`   🔗 Source: ${award.source_url}`);
        console.log(`   📷 Image: ${award.image_url || 'None'}`);
        console.log(`   📊 Category: ${award.category} | Significance: ${award.significance}`);
        
        // Check for potential issues
        if (award.name.length > 80) {
          console.log(`   ⚠️  WARNING: Name is too long (${award.name.length} chars)`);
        }
        if (award.description.length < 20) {
          console.log(`   ⚠️  WARNING: Description is too short (${award.description.length} chars)`);
        }
        if (/\b(recognizes|honors|awarded|given|for\b)\b/i.test(award.name)) {
          console.log(`   ⚠️  WARNING: Name looks like a description`);
        }
      });
      
      console.log('\n─'.repeat(80));
      console.log('📊 Quality Metrics:');
      const avgNameLength = result.awards.reduce((sum, a) => sum + a.name.length, 0) / result.awards.length;
      const avgDescLength = result.awards.reduce((sum, a) => sum + a.description.length, 0) / result.awards.length;
      const withSources = result.awards.filter(a => a.source_url).length;
      const withImages = result.awards.filter(a => a.image_url).length;
      
      console.log(`   Average name length: ${Math.round(avgNameLength)} chars`);
      console.log(`   Average description length: ${Math.round(avgDescLength)} chars`);
      console.log(`   Awards with sources: ${withSources}/${result.awards.length}`);
      console.log(`   Awards with images: ${withImages}/${result.awards.length}`);
      
      // Check for duplicates
      const names = result.awards.map(a => a.name.toLowerCase().trim());
      const uniqueNames = [...new Set(names)];
      const duplicates = names.length - uniqueNames.length;
      
      console.log(`\n🔍 Duplicate Check:`);
      console.log(`   Total awards: ${result.awards.length}`);
      console.log(`   Unique names: ${uniqueNames.length}`);
      console.log(`   Duplicates: ${duplicates}`);
      
      if (duplicates === 0) {
        console.log('   ✅ No duplicates found!');
      } else {
        console.log('   ⚠️  Duplicates detected');
      }
      
    } else {
      console.log('⚠️  No awards found');
    }
    
    console.log('─'.repeat(80));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testJsonAssistant();
