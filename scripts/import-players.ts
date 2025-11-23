/**
 * Import Players from Excel File
 * 
 * This script reads an Excel file and imports players, schools, and teams into Supabase.
 * It automatically extracts unique schools and teams from the player data and creates them.
 * 
 * Usage:
 *   npx tsx scripts/import-players.ts [file-path] [--school "School Name"] [--team "Team Name"]
 * 
 * Examples:
 *   # Import from default location (scripts/players.xlsx or public/Cal_NFL.xls.xlsx)
 *   npx tsx scripts/import-players.ts
 * 
 *   # Import specific file
 *   npx tsx scripts/import-players.ts public/Cal_NFL.xls.xlsx
 * 
 *   # Import with default school for all players
 *   npx tsx scripts/import-players.ts public/Cal_NFL.xls.xlsx --school "Cal Berkeley"
 * 
 *   # Import with default school and team
 *   npx tsx scripts/import-players.ts public/Cal_NFL.xls.xlsx --school "Cal Berkeley" --team "NFL"
 * 
 * Expected Excel columns (flexible mapping):
 * - Name variations: "name", "full name", "player name", "athlete", "player"
 * - School variations: "school", "college", "university", "college name"
 * - Team variations: "team", "nfl team", "pro team", "current team", "nfl"
 * - Image variations: "image", "image url", "profile image", "avatar", "photo", "headshot"
 * - Banner variations: "banner", "banner url", "card image", "cover image"
 * - Location variations: "city", "location", "hometown", "birthplace"
 * - Any other fields will be stored in the meta JSON field
 * 
 * Note: Players are automatically linked to lockers via their slug. 
 * Search will find players and clicking them goes to /player/[slug] which shows their locker.
 */

import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Environment variables not found!');
  console.error('\nPlease ensure .env.local exists in the with-supabase-app directory with:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
  console.error('\nChecked path:', path.join(__dirname, '..', '.env.local'));
  console.error('\nCurrent values:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
let EXCEL_FILE_PATH = '';
let DEFAULT_SCHOOL = '';
let DEFAULT_TEAM = '';

// Parse arguments
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--school' && args[i + 1]) {
    DEFAULT_SCHOOL = args[i + 1];
    i++;
  } else if (args[i] === '--team' && args[i + 1]) {
    DEFAULT_TEAM = args[i + 1];
    i++;
  } else if (!EXCEL_FILE_PATH && !args[i].startsWith('--')) {
    EXCEL_FILE_PATH = args[i];
  }
}

// Default file paths to check
if (!EXCEL_FILE_PATH) {
  const possiblePaths = [
    path.join(__dirname, 'players.xlsx'),
    path.join(__dirname, 'players.xls'),
    path.join(__dirname, '..', 'public', 'Cal_NFL.xls.xlsx'),
    path.join(__dirname, '..', 'public', 'cal-nfl.xls'),
    path.join(__dirname, '..', 'public', 'cal-nfl.xlsx'),
  ];
  
  for (const possiblePath of possiblePaths) {
    if (fs.existsSync(possiblePath)) {
      EXCEL_FILE_PATH = possiblePath;
      break;
    }
  }
  
  if (!EXCEL_FILE_PATH) {
    EXCEL_FILE_PATH = path.join(__dirname, 'players.xlsx');
  }
}

// Helper function to generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper function to normalize column names (handle variations)
function normalizeColumnName(col: string): string {
  const normalized = col.toLowerCase().trim();
  const mappings: Record<string, string> = {
    // Name variations
    'name': 'full_name',
    'full name': 'full_name',
    'player name': 'full_name',
    'player': 'full_name',
    'athlete': 'full_name',
    'athlete name': 'full_name',
    'player full name': 'full_name',
    // School variations
    'school': 'school',
    'college': 'school',
    'university': 'school',
    'college/university': 'school',
    'college name': 'school',
    'school name': 'school',
    // Team variations
    'team': 'team',
    'nfl team': 'team',
    'pro team': 'team',
    'current team': 'team',
    'nfl': 'team',
    'team name': 'team',
    // Image variations
    'image': 'image_url',
    'image url': 'image_url',
    'profile image': 'image_url',
    'avatar': 'image_url',
    'photo': 'image_url',
    'picture': 'image_url',
    'headshot': 'image_url',
    'profile_image': 'image_url',
    // Location variations
    'city': 'city',
    'location': 'city',
    'hometown': 'city',
    'birth city': 'city',
    'birthplace': 'city',
  };
  
  return mappings[normalized] || normalized;
}

async function importPlayers() {
  // Check if file exists
  const filePath = path.resolve(EXCEL_FILE_PATH);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: Excel file not found at ${filePath}`);
    console.log('\nUsage:');
    console.log('  npx tsx scripts/import-players.ts [path-to-excel-file] [--school "School Name"] [--team "Team Name"]');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/import-players.ts public/Cal_NFL.xls.xlsx');
    console.log('  npx tsx scripts/import-players.ts public/Cal_NFL.xls.xlsx --school "Cal Berkeley"');
    console.log('\nThe script will also check these default locations:');
    console.log('  - scripts/players.xlsx');
    console.log('  - public/Cal_NFL.xls.xlsx');
    process.exit(1);
  }

  console.log(`Reading Excel file: ${filePath}\n`);
  
  // Read Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0]; // Use first sheet
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert to JSON
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: false });
  
  if (data.length === 0) {
    console.error('Error: No data found in Excel file');
    process.exit(1);
  }

  console.log(`Found ${data.length} rows in Excel file`);
  
  // Show detected columns for debugging
  if (data.length > 0) {
    const firstRow = data[0] as any;
    console.log('\nDetected columns:', Object.keys(firstRow).join(', '));
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: Extract unique schools and teams from all rows
  console.log('\n=== Step 1: Extracting unique schools and teams ===');
  const schoolNames = new Set<string>();
  const teamNames = new Set<string>();
  const schoolToTeamMap = new Map<string, string>(); // Map school name to team name for linking

  // Add default school if provided
  if (DEFAULT_SCHOOL) {
    schoolNames.add(DEFAULT_SCHOOL);
    console.log(`Using default school: ${DEFAULT_SCHOOL}`);
  }

  // Add default team if provided
  if (DEFAULT_TEAM) {
    teamNames.add(DEFAULT_TEAM);
    console.log(`Using default team: ${DEFAULT_TEAM}`);
  }

  for (const row of data as any[]) {
    const normalizedRow: any = {};
    for (const [key, value] of Object.entries(row)) {
      const normalizedKey = normalizeColumnName(key);
      if (normalizedKey === 'school' || normalizedKey === 'team') {
        normalizedRow[normalizedKey] = value;
      }
    }

    const schoolName = normalizedRow.school?.toString().trim() || DEFAULT_SCHOOL;
    const teamName = normalizedRow.team?.toString().trim() || DEFAULT_TEAM;

    if (schoolName) {
      schoolNames.add(schoolName);
      if (teamName) {
        schoolToTeamMap.set(schoolName, teamName);
      }
    }
    if (teamName) {
      teamNames.add(teamName);
    }
  }

  console.log(`Found ${schoolNames.size} unique schools`);
  console.log(`Found ${teamNames.size} unique teams`);

  // Step 2: Create schools
  console.log('\n=== Step 2: Creating schools ===');
  const schoolIdMap = new Map<string, string>(); // Map school name to school ID
  let schoolsCreated = 0;
  let schoolsSkipped = 0;

  for (const schoolName of schoolNames) {
    if (!schoolName) continue;
    
    const slug = generateSlug(schoolName);
    const schoolData = {
      name: schoolName,
      slug,
      meta: {
        imported_at: new Date().toISOString(),
        source: 'excel_import'
      }
    };

    const { data: school, error } = await supabase
      .from('schools')
      .upsert(schoolData, { onConflict: 'slug' })
      .select('id, name')
      .single();

    if (error) {
      console.error(`✗ Failed to create school "${schoolName}": ${error.message}`);
    } else {
      schoolIdMap.set(schoolName, school.id);
      if (school) {
        schoolsCreated++;
        console.log(`✓ School: ${schoolName}`);
      } else {
        schoolsSkipped++;
      }
    }
  }

  // Step 3: Create teams
  console.log('\n=== Step 3: Creating teams ===');
  const teamIdMap = new Map<string, string>(); // Map team name to team ID
  let teamsCreated = 0;
  let teamsSkipped = 0;

  for (const teamName of teamNames) {
    if (!teamName) continue;
    
    const slug = generateSlug(teamName);
    
    // Try to link team to school if we have a mapping
    let schoolId: string | null = null;
    for (const [schoolName, mappedTeamName] of schoolToTeamMap.entries()) {
      if (mappedTeamName === teamName) {
        schoolId = schoolIdMap.get(schoolName) || null;
        break;
      }
    }

    const teamData: any = {
      name: teamName,
      slug,
      school_id: schoolId,
      meta: {
        imported_at: new Date().toISOString(),
        source: 'excel_import'
      }
    };

    const { data: team, error } = await supabase
      .from('teams')
      .upsert(teamData, { onConflict: 'slug' })
      .select('id, name')
      .single();

    if (error) {
      console.error(`✗ Failed to create team "${teamName}": ${error.message}`);
    } else {
      teamIdMap.set(teamName, team.id);
      if (team) {
        teamsCreated++;
        console.log(`✓ Team: ${teamName}${schoolId ? ` (linked to school)` : ''}`);
      } else {
        teamsSkipped++;
      }
    }
  }

  // Step 4: Import players with school_id and team_id
  console.log('\n=== Step 4: Importing players ===');
  let successCount = 0;
  let errorCount = 0;
  const errors: Array<{ row: number; error: string }> = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any;
    
    try {
      // Normalize column names
      const normalizedRow: any = {};
      const meta: any = {};
      
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = normalizeColumnName(key);
        if (normalizedKey === 'full_name' || normalizedKey === 'school' || normalizedKey === 'team' || normalizedKey === 'image_url' || normalizedKey === 'city' || normalizedKey === 'hometown') {
          normalizedRow[normalizedKey] = value;
        } else {
          // Store other fields in meta (including banner_url, position, stats, etc.)
          meta[key] = value;
        }
      }

      // Validate required fields
      if (!normalizedRow.full_name || !normalizedRow.full_name.toString().trim()) {
        throw new Error('Missing required field: full_name');
      }

      const fullName = normalizedRow.full_name.toString().trim();
      const slug = generateSlug(fullName);
      
      // Get school and team IDs (use defaults if not in row)
      const schoolName = normalizedRow.school?.toString().trim() || DEFAULT_SCHOOL;
      const teamName = normalizedRow.team?.toString().trim() || DEFAULT_TEAM;
      const schoolId = schoolName ? schoolIdMap.get(schoolName) || null : null;
      const teamId = teamName ? teamIdMap.get(teamName) || null : null;
      
      // Prepare player data - only include fields that exist in the schema
      const playerData: any = {
        slug,
        name: fullName, // name column is required (not null)
        full_name: fullName,
        school_id: schoolId,
        team_id: teamId,
        // Keep old text fields for backward compatibility during migration
        school: schoolName || null,
        team: teamName || null,
      };

      // Only add city if it exists in the schema (check via hometown column)
      if (normalizedRow.city) {
        playerData.hometown = normalizedRow.city.toString().trim();
      }

      // Map image_url to profile_image (the actual column name in the schema)
      if (normalizedRow.image_url) {
        playerData.profile_image = normalizedRow.image_url.toString().trim();
      }

      // Note: meta column doesn't exist in players table
      // Additional fields from Excel are stored in the meta object but not inserted
      // You can access them via the meta variable if needed for future use

      // Upsert player (insert or update if slug exists)
      const { data: player, error } = await supabase
        .from('players')
        .upsert(playerData, { onConflict: 'slug' })
        .select('id, full_name, slug')
        .single();

      if (error) {
        throw error;
      }

      successCount++;
      console.log(`✓ Imported: ${fullName} (${slug})${schoolName ? ` - ${schoolName}` : ''}${teamName ? ` - ${teamName}` : ''}`);
      
    } catch (error: any) {
      errorCount++;
      const errorMsg = error.message || 'Unknown error';
      errors.push({ row: i + 2, error: errorMsg }); // +2 because Excel rows start at 1 and we have header
      console.error(`✗ Row ${i + 2}: ${errorMsg}`);
    }
  }

  // Summary
  console.log('\n=== Import Summary ===');
  console.log(`Schools created: ${schoolsCreated}`);
  console.log(`Teams created: ${teamsCreated}`);
  console.log(`Total player rows: ${data.length}`);
  console.log(`Successfully imported players: ${successCount}`);
  console.log(`Player import errors: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(({ row, error }) => {
      console.log(`  Row ${row}: ${error}`);
    });
  }
  
  console.log('\nImport complete!');
}

// Run the import
importPlayers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

