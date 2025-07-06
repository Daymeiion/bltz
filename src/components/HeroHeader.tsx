import Image from 'next/image';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';

interface HeroHeaderProps {
  backgroundImage: string;
  cardImage: string;
  profileImage: string;
  alt?: string;
}

export default function HeroHeader({ backgroundImage, cardImage, profileImage, alt }: HeroHeaderProps) {
  return (
    <div className="relative w-full h-[400px] flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <Image
        src={backgroundImage}
        alt="Background"
        fill
        style={{ objectFit: 'cover' }}
        className="z-0"
        priority
      />
      {/* Settings Icon */}
      <div className="absolute top-4 right-4 z-20 bg-black/60 rounded-full p-2">
        <Cog6ToothIcon className="w-6 h-6 text-white" />
      </div>
      {/* Card and Profile Images Centered at Bottom */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[260px] h-[320px] z-10">
        <Image
          src={cardImage}
          alt="Card"
          width={260}
          height={320}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 drop-shadow-xl"
          priority
        />
        <Image
          src={profileImage}
          alt={alt || 'Profile'}
          width={180}
          height={220}
          className="absolute left-1/2 -translate-x-1/2 bottom-0 z-10"
          priority
        />
      </div>
    </div>
  );
} 