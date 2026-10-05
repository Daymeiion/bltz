/**
 * Batch Revenue Calculation Script
 * 
 * This script calculates revenue distributions for all videos.
 * Should be run periodically (e.g., daily via cron job)
 * 
 * Usage:
 * npx tsx scripts/calculate-all-revenue.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function calculateAllRevenue() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Starting revenue calculations...');

  // Get all public videos
  const { data: videos, error } = await supabase
    .from('videos')
    .select('id, title, player_id, created_at')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching videos:', error);
    return;
  }

  if (!videos || videos.length === 0) {
    console.log('No videos found.');
    return;
  }

  console.log(`Processing ${videos.length} videos...`);

  let processed = 0;
  let errors = 0;

  for (const video of videos) {
    try {
      // Call the API endpoint to calculate revenue
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/revenue/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoId: video.id }),
      });

      if (response.ok) {
        processed++;
        console.log(`✓ Processed: ${video.title} (${processed}/${videos.length})`);
      } else {
        errors++;
        console.error(`✗ Failed: ${video.title}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      errors++;
      console.error(`✗ Error processing ${video.title}:`, error);
    }
  }

  console.log('\n=== Revenue Calculation Complete ===');
  console.log(`Total videos: ${videos.length}`);
  console.log(`Successfully processed: ${processed}`);
  console.log(`Errors: ${errors}`);
}

// Run the script
calculateAllRevenue()
  .then(() => {
    console.log('\nScript completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });

