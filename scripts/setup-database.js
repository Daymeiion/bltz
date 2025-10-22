#!/usr/bin/env node

/**
 * Database Setup Script for BLTZ Messaging System
 * This script helps you set up the messaging system database tables
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 BLTZ Database Setup Helper');
console.log('================================\n');

// Read the SQL files
const messagingSqlPath = path.join(__dirname, 'setup-messaging.sql');
const storageSqlPath = path.join(__dirname, 'setup-storage.sql');

try {
  const messagingSql = fs.readFileSync(messagingSqlPath, 'utf8');
  const storageSql = fs.readFileSync(storageSqlPath, 'utf8');

  console.log('📋 Setup Instructions:');
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Navigate to SQL Editor (left sidebar)');
  console.log('4. Create a new query and run the messaging setup script\n');

  console.log('📄 Messaging Setup SQL:');
  console.log('Copy and paste this into Supabase SQL Editor:');
  console.log('===============================================');
  console.log(messagingSql);
  console.log('\n===============================================\n');

  console.log('📄 Storage Setup SQL:');
  console.log('Create another new query and run this:');
  console.log('===============================================');
  console.log(storageSql);
  console.log('\n===============================================\n');

  console.log('✅ After running both scripts, your messaging system will be ready!');
  console.log('🔗 The API endpoints will work and you can start sending messages.');

} catch (error) {
  console.error('❌ Error reading SQL files:', error.message);
  console.log('\n📁 Make sure you have the following files:');
  console.log('   - scripts/setup-messaging.sql');
  console.log('   - scripts/setup-storage.sql');
}
