# Import Players from Excel

This guide explains how to import players from an Excel file into your Supabase database.

## Prerequisites

1. **Excel file** (.xls or .xlsx) with player data
2. **Environment variables** set in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Excel File Format

Your Excel file should have the following columns (first row should be headers):

### Required Columns
- **full_name** (or "name", "player name", "full name") - Player's full name

### Optional Columns
- **school** (or "college", "university") - School name
- **image_url** (or "image", "profile image", "avatar") - URL to player's profile image
- **banner_url** (or "banner", "banner url", "card image") - URL to player's banner/card image
- **city** (or "location", "hometown") - Player's city

Any other columns will be stored in the `meta` JSON field in the database.

### Example Excel Structure

| full_name | school | image_url | banner_url | city |
|-----------|--------|-----------|------------|------|
| John Doe | University of California | https://... | https://... | Los Angeles |
| Jane Smith | Stanford University | https://... | https://... | San Francisco |

## Steps to Import

1. **Place your Excel file** in the `scripts` directory:
   ```
   with-supabase-app/scripts/players.xlsx
   ```
   
   Or update the `EXCEL_FILE_PATH` variable in `scripts/import-players.ts` to point to your file location.

2. **Install dependencies** (if not already installed):
   ```bash
   npm install tsx --save-dev --legacy-peer-deps
   ```

3. **Run the import script**:
   ```bash
   npx tsx scripts/import-players.ts
   ```

4. **Check the output** - The script will show:
   - Progress for each player imported
   - Summary of successful imports
   - Any errors encountered

## How It Works

1. The script reads the Excel file and converts it to JSON
2. For each row:
   - Generates a unique slug from the player's name
   - Normalizes column names (handles variations like "name" → "full_name")
   - Inserts or updates the player in Supabase (uses slug as unique identifier)
   - Stores any extra columns in the `meta` JSON field

3. If a player with the same slug already exists, it will be updated (upsert)

## Troubleshooting

### "Excel file not found"
- Make sure the file is in the `scripts` directory
- Or update `EXCEL_FILE_PATH` in the script to the correct path

### "Missing required field: full_name"
- Make sure your Excel file has a column with player names
- The column can be named: "full_name", "name", "player name", or "full name"

### Environment variables not set
- Check your `.env.local` file has:
  - `NEXT_PUBLIC_SUPABASE_URL=your_supabase_url`
  - `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`

### Import errors
- Check the error messages in the output
- Common issues:
  - Invalid URLs for images
  - Database connection issues
  - Missing required fields

## After Import

Once imported, players will automatically appear in:
- Search results when users type in the search bar
- Player profile pages at `/player/[slug]`

The search functionality will match players by:
- Full name
- School name

