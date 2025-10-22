"use client";

import { motion, AnimatePresence } from "motion/react";
import { Trophy, Calendar, Building, Globe, Shield, ExternalLink, Award, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface AwardDetailsProps {
  award: {
    id: string;
    name: string;
    description: string;
    category: string;
    year: number;
    organization: string;
    image_url?: string;
    source_url?: string;
    significance: 'local' | 'regional' | 'national' | 'international';
    verified: boolean;
    confidence_score?: number;
  };
  playerHeadshot?: string;
  className?: string;
}

const significanceLabels = {
  local: 'Local Recognition',
  regional: 'Regional Recognition', 
  national: 'National Recognition',
  international: 'International Recognition'
};

const significanceColors = {
  local: 'text-gray-400 border-gray-400',
  regional: 'text-blue-400 border-blue-400',
  national: 'text-purple-400 border-purple-400',
  international: 'text-yellow-400 border-yellow-400',
};

export function AwardDetails({ award, playerHeadshot, className }: AwardDetailsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative group",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-bltz-blue/20 to-bltz-gold/20 blur-2xl rounded-2xl" />
      <div className={cn(
        "relative bg-black/60 backdrop-blur-md rounded-2xl border-2 overflow-hidden card-hover",
        significanceColors[award.significance].split(' ')[1]
      )}>
        <div className="p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Award/Player Image */}
            <div className="flex-shrink-0">
              <div className={cn(
                "w-24 h-24 rounded-2xl overflow-hidden border-2",
                significanceColors[award.significance].split(' ')[1]
              )}>
                {award.image_url ? (
                  <img
                    src={award.image_url}
                    alt={award.name}
                    className="w-full h-full object-cover"
                  />
                ) : playerHeadshot ? (
                  <img
                    src={playerHeadshot}
                    alt="Player headshot"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-bltz-blue/20 to-bltz-gold/20 flex items-center justify-center">
                    <Trophy className="w-12 h-12 text-bltz-gold" />
                  </div>
                )}
              </div>
            </div>

            {/* Award Details */}
            <div className="flex-1 text-center md:text-left">
              {/* Award Title with Icon */}
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-6 h-6 text-bltz-gold" />
                  <h2 className="text-3xl font-black text-white">{award.name}</h2>
                </div>
                {award.verified && (
                  <div className="flex items-center gap-1 text-green-400">
                    <Shield className="w-4 h-4" />
                    <span className="text-xs font-bold">VERIFIED</span>
                  </div>
                )}
              </div>
              
              {/* Award Description with Icon */}
              <div className="flex items-start gap-3 mb-6">
                <FileText className="w-5 h-5 text-bltz-blue mt-1 flex-shrink-0" />
                <p className="text-bltz-white/70 text-lg font-medium">
                  {award.description}
                </p>
              </div>

              {/* Simplified Award Info */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2 text-bltz-white/70">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Won in {award.year}</span>
                </div>
                
                <div className="flex items-center gap-2 text-bltz-white/70">
                  <Building className="w-4 h-4" />
                  <span className="font-medium">Awarded by {award.organization}</span>
                </div>
              </div>


              {/* Source Link */}
              {award.source_url && (
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <a
                    href={award.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-bltz-blue hover:text-bltz-gold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span className="font-medium">View Source</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
