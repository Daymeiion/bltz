"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Star, Target, Zap, Shield, Crown, Award, Medal, Search, Loader2 } from "lucide-react";
import { fetchAchievementsFromAPI } from "@/lib/queries/achievements-client";
import { FloatingDock } from "@/components/ui/floating-dock";
import { AwardThumbnail } from "@/components/awards/AwardThumbnail";
import { AwardDetails } from "@/components/awards/AwardDetails";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  iconComponent: React.ComponentType<any>;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
  category: string;
}

interface PlayerAward {
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
}

const achievementIcons = {
  Trophy,
  Star,
  Target,
  Zap,
  Shield,
  Crown,
  Award,
  Medal,
};

const sampleAchievements: Achievement[] = [
  {
    id: "first-video",
    name: "First Steps",
    description: "Upload your first video to the platform",
    icon: "Trophy",
    iconComponent: Trophy,
    rarity: 'common',
    unlocked: true,
    unlockedAt: "2024-01-15T10:30:00Z",
    category: "Content Creation"
  },
  {
    id: "viral-video",
    name: "Viral Sensation",
    description: "Get 10,000 views on a single video",
    icon: "Star",
    iconComponent: Star,
    rarity: 'epic',
    unlocked: true,
    unlockedAt: "2024-02-20T15:45:00Z",
    category: "Engagement"
  },
  {
    id: "consistent-creator",
    name: "Consistent Creator",
    description: "Upload 10 videos in a month",
    icon: "Target",
    iconComponent: Target,
    rarity: 'rare',
    unlocked: false,
    progress: 7,
    maxProgress: 10,
    category: "Content Creation"
  },
  {
    id: "lightning-fast",
    name: "Lightning Fast",
    description: "Get 1,000 views within 24 hours of upload",
    icon: "Zap",
    iconComponent: Zap,
    rarity: 'rare',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    category: "Engagement"
  },
  {
    id: "community-guardian",
    name: "Community Guardian",
    description: "Moderate 50 comments or reports",
    icon: "Shield",
    iconComponent: Shield,
    rarity: 'epic',
    unlocked: false,
    progress: 12,
    maxProgress: 50,
    category: "Community"
  },
  {
    id: "royalty",
    name: "Royalty",
    description: "Become a top 10 player in rankings",
    icon: "Crown",
    iconComponent: Crown,
    rarity: 'legendary',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    category: "Rankings"
  },
  {
    id: "award-winner",
    name: "Award Winner",
    description: "Win a monthly content award",
    icon: "Award",
    iconComponent: Award,
    rarity: 'epic',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    category: "Recognition"
  },
  {
    id: "medal-collector",
    name: "Medal Collector",
    description: "Unlock 25 different achievements",
    icon: "Medal",
    iconComponent: Medal,
    rarity: 'legendary',
    unlocked: false,
    progress: 2,
    maxProgress: 25,
    category: "Collection"
  }
];

const rarityColors = {
  common: 'text-gray-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400'
};

const rarityBorders = {
  common: 'border-gray-400/30',
  rare: 'border-blue-400/30',
  epic: 'border-purple-400/30',
  legendary: 'border-yellow-400/30'
};

export function AchievementsPageClient() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [awards, setAwards] = useState<PlayerAward[]>([]);
  const [selectedItem, setSelectedItem] = useState<Achievement | PlayerAward | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscoveringAwards, setIsDiscoveringAwards] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [discoverySuccess, setDiscoverySuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'achievements' | 'awards'>('achievements');
  const [playerHeadshot, setPlayerHeadshot] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalAchievements: 0,
    unlockedAchievements: 0,
    completionRate: 0,
    legendaryCount: 0,
    epicCount: 0,
    rareCount: 0,
    commonCount: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load achievements
        const { achievements: achievementsData, stats: statsData } = await fetchAchievementsFromAPI();

        // Transform the data to match our interface
        const transformedAchievements: Achievement[] = achievementsData.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          icon: item.icon,
          iconComponent: achievementIcons[item.icon as keyof typeof achievementIcons] || Trophy,
          rarity: item.rarity,
          unlocked: item.player_achievement?.is_unlocked || false,
          unlockedAt: item.player_achievement?.unlocked_at,
          progress: item.progress?.current_progress || 0,
          maxProgress: item.progress?.max_progress || 1,
          category: item.category
        }));

        setAchievements(transformedAchievements);
        setSelectedItem(transformedAchievements[0] || null);
        setStats(statsData);

          // Load existing awards
          await loadAwards();
          
          // Load player headshot
          await loadPlayerHeadshot();
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to sample data
        setAchievements(sampleAchievements);
        setSelectedItem(sampleAchievements[0]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const loadAwards = async () => {
    try {
      const response = await fetch('/api/awards/discover');
      if (response.ok) {
        const { awards } = await response.json();
        // Deduplicate awards by name and year with more robust logic
        const uniqueAwards = (awards || []).reduce((acc: PlayerAward[], award: PlayerAward) => {
          const exists = acc.find(a => 
            a.name.toLowerCase().trim() === award.name.toLowerCase().trim() && 
            a.year === award.year
          );
          if (!exists) {
            acc.push(award);
          }
          return acc;
        }, []);
        setAwards(uniqueAwards);
      }
    } catch (error) {
      console.error('Error loading awards:', error);
    }
  };

  const loadPlayerHeadshot = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const { playerProfile } = await response.json();
        if (playerProfile?.profile_image) {
          setPlayerHeadshot(playerProfile.profile_image);
        }
      }
    } catch (error) {
      console.error('Error loading player headshot:', error);
    }
  };

  const discoverAwards = async () => {
    setIsDiscoveringAwards(true);
    setDiscoveryError(null);
    setDiscoverySuccess(false);
    
    try {
      const response = await fetch('/api/awards/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // No body needed - API now fetches real player data from database
      });

      if (response.ok) {
        const { awards } = await response.json();
        // Deduplicate awards by name and year with more robust logic
        const uniqueAwards = (awards || []).reduce((acc: PlayerAward[], award: PlayerAward) => {
          const exists = acc.find(a => 
            a.name.toLowerCase().trim() === award.name.toLowerCase().trim() && 
            a.year === award.year
          );
          if (!exists) {
            acc.push(award);
          }
          return acc;
        }, []);
        setAwards(uniqueAwards);
        setActiveTab('awards');
        if (uniqueAwards && uniqueAwards.length > 0) {
          setSelectedItem(uniqueAwards[0]);
          setDiscoverySuccess(true);
          // Clear success message after 3 seconds
          setTimeout(() => setDiscoverySuccess(false), 3000);
        } else {
          setDiscoveryError('No awards found. The AI may need more time to research your career.');
        }
      } else {
        const errorData = await response.json();
        setDiscoveryError(errorData.error || 'Failed to discover awards');
      }
    } catch (error) {
      console.error('Error discovering awards:', error);
      setDiscoveryError('Network error. Please try again.');
    } finally {
      setIsDiscoveringAwards(false);
    }
  };

  const handleItemSelect = (item: Achievement | PlayerAward) => {
    setSelectedItem(item);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] p-6 md:p-10 scrollbar-hide">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bltz-gold"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] p-6 md:p-10 scrollbar-hide">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="relative mb-10">
          <div className="absolute -top-2 -left-2 w-64 h-64 bg-bltz-gold/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-2 -right-2 w-72 h-72 bg-bltz-blue/10 rounded-full blur-3xl" />
          
          <div className="relative text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
              Your <span className="text-gradient-blue-gold">Achievements & Awards</span>
            </h1>
            <p className="text-bltz-white/70 text-lg font-medium">
              Showcase your accomplishments and discover your real-world awards
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8">
          <div className="bg-black/40 backdrop-blur-md rounded-lg border-2 border-gray-600/50 p-1">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('achievements')}
                className={`px-6 py-3 rounded-md font-bold transition-all duration-300 ${
                  activeTab === 'achievements'
                    ? 'bg-gradient-to-r from-bltz-blue to-bltz-gold text-white shadow-lg'
                    : 'text-bltz-white/60 hover:text-bltz-white hover:bg-bltz-blue/20'
                }`}
              >
                Achievements
              </button>
              <button
                onClick={() => setActiveTab('awards')}
                className={`px-6 py-3 rounded-md font-bold transition-all duration-300 ${
                  activeTab === 'awards'
                    ? 'bg-gradient-to-r from-bltz-blue to-bltz-gold text-white shadow-lg'
                    : 'text-bltz-white/60 hover:text-bltz-white hover:bg-bltz-blue/20'
                }`}
              >
                Real Awards
              </button>
            </div>
          </div>
        </div>

          {/* Award Discovery Button */}
          {activeTab === 'awards' && (
            <div className="flex justify-center mb-8">
              <button
                onClick={discoverAwards}
                disabled={isDiscoveringAwards}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-bltz-blue to-bltz-gold text-white rounded-lg font-bold transition-all duration-300 hover:shadow-lg hover:shadow-bltz-gold/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDiscoveringAwards ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="animate-pulse">AI is researching your awards...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Discover My Awards
                  </>
                )}
              </button>
            </div>
          )}

          {/* Loading State for Award Discovery */}
          {isDiscoveringAwards && (
            <div className="mb-12">
              <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-bltz-gold/30 p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-bltz-gold/20 border-t-bltz-gold rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Search className="w-6 h-6 text-bltz-gold animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">AI is researching your awards...</h3>
                    <p className="text-bltz-white/70">Searching sports databases for your career at Cal, Indianapolis Colts, and San Diego Chargers</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-bltz-gold">
                      <div className="w-2 h-2 bg-bltz-gold rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-bltz-gold rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-bltz-gold rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Success State for Award Discovery */}
          {discoverySuccess && (
            <div className="mb-12">
              <div className="bg-green-900/20 backdrop-blur-md rounded-2xl border-2 border-green-500/30 p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-green-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Awards Discovered!</h3>
                    <p className="text-green-300">AI found your real-world awards and achievements</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error State for Award Discovery */}
          {discoveryError && (
            <div className="mb-12">
              <div className="bg-red-900/20 backdrop-blur-md rounded-2xl border-2 border-red-500/30 p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Search className="w-8 h-8 text-red-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Award Discovery Failed</h3>
                    <p className="text-red-300">{discoveryError}</p>
                    <button
                      onClick={discoverAwards}
                      className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Item Carousel */}
        <div className="mb-12">
          {selectedItem ? (
            <AnimatePresence mode="wait">
              {activeTab === 'achievements' && 'rarity' in selectedItem ? (
                // Achievement Display
                <motion.div
                  key={selectedItem.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-bltz-blue/20 to-bltz-gold/20 blur-2xl rounded-2xl" />
                  <div className={`relative bg-black/60 backdrop-blur-md rounded-2xl border-2 ${rarityBorders[selectedItem.rarity]} overflow-hidden card-hover`}>
                    <div className="p-8 md:p-12">
                      <div className="flex flex-col md:flex-row items-center gap-8">
                        {/* Achievement Icon */}
                        <div className="flex-shrink-0">
                          <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br from-bltz-blue/20 to-bltz-gold/20 flex items-center justify-center border-2 ${rarityBorders[selectedItem.rarity]}`}>
                            <selectedItem.iconComponent className={`w-12 h-12 ${rarityColors[selectedItem.rarity]}`} />
                          </div>
                        </div>

                        {/* Achievement Details */}
                        <div className="flex-1 text-center md:text-left">
                          <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
                            <h2 className="text-3xl font-black text-white">{selectedItem.name}</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${rarityColors[selectedItem.rarity]} bg-black/40 border ${rarityBorders[selectedItem.rarity]}`}>
                              {selectedItem.rarity}
                            </span>
                          </div>
                          
                          <p className="text-bltz-white/70 text-lg font-medium mb-4">
                            {selectedItem.description}
                          </p>

                          {/* Progress Bar */}
                          {!selectedItem.unlocked && selectedItem.progress !== undefined && (
                            <div className="mb-4">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-bold text-bltz-white/70">Progress</span>
                                <span className="text-sm font-bold text-bltz-white/70">
                                  {selectedItem.progress}/{selectedItem.maxProgress}
                                </span>
                              </div>
                              <div className="w-full bg-black/40 rounded-full h-3 border border-bltz-blue/30">
                                <div 
                                  className="h-full bg-gradient-to-r from-bltz-blue to-bltz-gold rounded-full transition-all duration-500"
                                  style={{ width: `${(selectedItem.progress / selectedItem.maxProgress!) * 100}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Unlocked Status */}
                          {selectedItem.unlocked && (
                            <div className="flex items-center justify-center md:justify-start gap-2 text-bltz-gold">
                              <Trophy className="w-5 h-5" />
                              <span className="font-bold">Unlocked</span>
                              {selectedItem.unlockedAt && (
                                <span className="text-bltz-white/50 text-sm">
                                  {new Date(selectedItem.unlockedAt).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
                ) : activeTab === 'awards' && 'year' in selectedItem ? (
                  // Award Display
                  <AwardDetails award={selectedItem} playerHeadshot={playerHeadshot || undefined} />
                ) : null}
            </AnimatePresence>
          ) : (
            <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-gray-600/50 p-16 text-center">
              <Trophy className="w-24 h-24 mx-auto mb-6 text-bltz-gold/50" />
              <h3 className="text-2xl font-black text-white mb-3">
                {activeTab === 'achievements' ? 'No Achievements Available' : 'No Awards Found'}
              </h3>
              <p className="text-bltz-white/70 text-lg">
                {activeTab === 'achievements' 
                  ? 'Start playing to unlock achievements!' 
                  : 'Click "Discover My Awards" to find your real-world accomplishments'
                }
              </p>
            </div>
          )}
        </div>

        {/* macOS Style Dock */}
        <div className="flex justify-center">
          {isDiscoveringAwards ? (
            // Loading skeleton for dock
            <div className="flex items-center gap-1 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 px-2 py-2 backdrop-blur-md border border-neutral-200/50 dark:border-neutral-800/50 shadow-lg">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-center w-10 h-10 rounded-xl bg-neutral-200/60 dark:bg-neutral-800/60 animate-pulse">
                  <div className="w-6 h-6 bg-neutral-300 dark:bg-neutral-700 rounded-full animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : (
            <FloatingDock
            items={activeTab === 'achievements' 
              ? achievements.map((achievement) => {
                  const IconComponent = achievement.iconComponent;
                  return {
                    title: achievement.name,
                    icon: (
                      <div className="relative">
                        <IconComponent 
                          className={`w-5 h-5 ${
                            achievement.unlocked 
                              ? 'text-neutral-600 dark:text-neutral-300' 
                              : 'text-neutral-400 dark:text-neutral-600'
                          }`} 
                        />
                        {/* Lock Icon for Unlocked */}
                        {!achievement.unlocked && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-neutral-400 dark:bg-neutral-600 rounded-full flex items-center justify-center">
                              <div className="w-1.5 h-1.5 border border-neutral-500 dark:border-neutral-700 rounded-full" />
                            </div>
                          </div>
                        )}
                      </div>
                    ),
                    onClick: () => handleItemSelect(achievement)
                  };
                })
              : awards.map((award) => ({
                  title: award.name,
                  icon: (
                    <AwardThumbnail 
                      award={award} 
                      size="sm" 
                      showTooltip={false}
                      className="w-5 h-5"
                    />
                  ),
                  onClick: () => handleItemSelect(award)
                }))
            }
          />
          )}
        </div>

      </div>
    </div>
  );
}
