import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      // NFL.com CDN — used for nflverse headshot URLs surfaced on player
      // lockers. URL-only reference, never rehosted on our side.
      {
        protocol: 'https',
        hostname: 'static.www.nfl.com',
      },
      // ESPN CDN — covers headshots, college team logos, and anything else
      // we surface via cfbfastR / nflverse cross-IDs.
      {
        protocol: 'https',
        hostname: 'a.espncdn.com',
      },
      // Wikipedia / Wikimedia — used by the Wikipedia scraper for thumbnail
      // candidates surfaced during onboarding review.
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
