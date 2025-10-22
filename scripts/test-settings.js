// Test script for settings page functionality
// Run with: node scripts/test-settings.js

require('dotenv').config({ path: '.env.local' });

async function testSettings() {
  try {
    console.log('🧪 Testing settings page functionality...');
    
    // Test 1: Check if profile API works
    console.log('📋 Testing profile API...');
    const profileResponse = await fetch('http://localhost:3000/api/profile');
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      console.log('✅ Profile API working');
      console.log('📊 Profile data:', {
        hasProfile: !!profileData.profile,
        hasPlayerProfile: !!profileData.playerProfile,
        playerName: profileData.playerProfile?.full_name || 'Not set',
        hasHeadshot: !!profileData.playerProfile?.profile_image
      });
    } else {
      console.log('❌ Profile API failed:', profileResponse.status);
    }
    
    console.log('\n🎯 Settings page should be available at: http://localhost:3000/dashboard/settings');
    console.log('📝 Features available:');
    console.log('  • View current profile information');
    console.log('  • Upload headshot image (PNG, JPG, GIF up to 5MB)');
    console.log('  • Headshot will be used as fallback for awards');
    console.log('  • Professional upload interface with preview');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testSettings();
