import Image from 'next/image';
// import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface HeroHeaderProps {
  backgroundImage: string;
  cardImage: string;
  profileImage: string;
  alt?: string;
}

export default function HeroHeader({ backgroundImage, cardImage, profileImage, alt }: HeroHeaderProps) {
  return (
    <div className="relative w-full h-[300px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <Image
        src={backgroundImage}
        alt="Background"
        fill
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        className="z-0"
        priority
      />
      {/* Card Image Absolutely Bottom Center, Always Flush */}
      <Image
        src={cardImage}
        alt="Card"
        width={260}
        height={320}
        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10"
        priority
      />
      {/* Profile Image Absolutely Bottom Center, Overlaying Card */}
      <Image
        src={profileImage}
        alt={alt || 'Profile'}
        width={180}
        height={220}
        className="absolute left-1/2 -translate-x-1/2 bottom-0 z-20"
        priority
      />
    </div>
  );
} 