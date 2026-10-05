"use client";

import Image from "next/image";
import { Card } from "@/components/ui/card";

type Props = {
  fullName: string;
  city?: string;
  bannerUrl: string;   // e.g. your card image
  avatarUrl: string;   // e.g. your player headshot
};

export default function PlayerProfileCard({
  fullName,
  city = "Hometown, USA",
  bannerUrl,
  avatarUrl,
}: Props) {
  const BANNER_HEIGHT = 240; // adjust height of the card image container
  const AVATAR_SIZE = 240;   // headshot size

  return (
    <Card className="overflow-hidden !rounded-sm border-white/10 bg-white/5">
      {/* Stacked container */}
      <div className="relative w-full" style={{ height: BANNER_HEIGHT }}>
        {/* Card background image */}
        <Image
          src={bannerUrl}
          alt="Card background"
          fill
          className="object-contain object-bottom"
          priority
        />

        {/* Player headshot: centered middle */}
<div className="absolute inset-0 flex items-center justify-center">
   <div
     className="relative overflow-hidden"
     style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
   >
    <Image
      src={avatarUrl}
      alt={fullName}
      fill
      className="object-contain object-bottom"
    />
  </div>
</div>

      </div>

      {/* Info section */}
      <div className="px-4 pt-0 pb-5 text-center" style={{ marginTop: 0}}>
        <h2 className="text-lg font-semibold leading-tight">{fullName}</h2>
        <p className="text-sm opacity-75">{city}</p>
      </div>
    </Card>
  );
}
