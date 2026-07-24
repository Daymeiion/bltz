import type { Metadata } from "next";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: {
    default: "BLTZ | The Athlete Media Infrastructure",
    template: "%s | BLTZ",
  },
  description:
    "BLTZ brings an athlete's highlights, stories, interviews, photos, and career milestones into one verified Player Locker.",
  openGraph: {
    title: "Claim Your Player Locker | BLTZ",
    description: "One career. Every chapter. One Locker.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Claim Your Player Locker | BLTZ",
    description: "One career. Every chapter. One Locker.",
  },
};
