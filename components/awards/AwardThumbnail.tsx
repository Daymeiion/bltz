"use client";

import { motion } from "motion/react";
import { Trophy, Medal, Star, Award, Crown, BookOpen, Heart, Sparkles, GraduationCap, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface AwardThumbnailProps {
  award: {
    id: string;
    name: string;
    description: string;
    category: string;
    year: number;
    organization: string;
    image_url?: string;
    significance: 'local' | 'regional' | 'national' | 'international';
    verified: boolean;
  };
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

const categoryIcons = {
  'Championship': Trophy,
  'All-Conference': Award,
  'All-American': Star,
  'Academic Honor': BookOpen,
  'Leadership': Crown,
  'Community Service': Heart,
  'Rookie of the Year': Sparkles,
  'Player of the Year': Medal,
  'Scholar-Athlete': GraduationCap,
  'Team Captain': Users,
};

const significanceColors = {
  local: 'border-gray-400',
  regional: 'border-blue-400',
  national: 'border-purple-400',
  international: 'border-yellow-400',
};

const significanceGlow = {
  local: 'shadow-gray-400/20',
  regional: 'shadow-blue-400/30',
  national: 'shadow-purple-400/40',
  international: 'shadow-yellow-400/50',
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function AwardThumbnail({ 
  award, 
  size = 'md', 
  showTooltip = true,
  className 
}: AwardThumbnailProps) {
  const IconComponent = categoryIcons[award.category as keyof typeof categoryIcons] || Trophy;
  
  return (
    <motion.div
      className={cn(
        "relative group cursor-pointer",
        sizeClasses[size],
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Award Container */}
      <div className={cn(
        "relative w-full h-full rounded-xl border-2 transition-all duration-300",
        significanceColors[award.significance],
        significanceGlow[award.significance],
        "bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900",
        "hover:shadow-lg"
      )}>
        {/* Image or Icon */}
        {award.image_url ? (
          <img
            src={award.image_url}
            alt={award.name}
            className="w-full h-full rounded-lg object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <IconComponent className="w-3/4 h-3/4 text-neutral-600 dark:text-neutral-400" />
          </div>
        )}

        {/* Verification Badge */}
        {award.verified && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}

        {/* Significance Indicator */}
        <div className={cn(
          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
          significanceColors[award.significance].replace('border-', 'bg-')
        )} />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <motion.div
          className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          initial={{ opacity: 0, y: 8 }}
          whileHover={{ opacity: 1, y: 0 }}
        >
          <div className="font-bold">{award.name}</div>
          <div className="text-xs opacity-80">{award.organization}</div>
          <div className="text-xs opacity-60">{award.year}</div>
        </motion.div>
      )}
    </motion.div>
  );
}
