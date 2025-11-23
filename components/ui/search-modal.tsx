"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export type SearchResultType = 'player' | 'team' | 'school';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
  banner_url?: string | null;
  logo_url?: string | null;
  school?: string | null;
  team?: string | null;
  city?: string | null;
  state?: string | null;
}

interface SearchModalProps {
  isOpen: boolean;
  results: SearchResult[];
  isLoading: boolean;
  searchQuery: string;
  onClose: () => void;
}

export function SearchModal({ isOpen, results, isLoading, searchQuery, onClose }: SearchModalProps) {
  if (!isOpen) return null;

  // Group results by type
  const players = results.filter(r => r.type === 'player');
  const teams = results.filter(r => r.type === 'team');
  const schools = results.filter(r => r.type === 'school');

  return (
    <>
      {/* Dark gradient backdrop - on top of app background, but below navbar */}
      <div 
        className="fixed left-0 right-0 bottom-0 bg-gradient-to-b from-black/95 via-black/90 to-black/95 z-[9998]"
        style={{ top: '70px' }} // Start below navbar (adjust based on navbar height)
        onClick={onClose}
      />
      
      {/* Modal - above backdrop */}
      <div className="fixed left-0 right-0 bottom-0 z-[9999] flex items-start justify-center pt-32 px-4 pointer-events-none" style={{ top: '70px' }}>
        <div className="w-full max-w-4xl pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <ResultCardSkeleton key={i} />
                  ))}
                </div>
              ) : results.length > 0 ? (
                <div className="space-y-6">
                  {players.length > 0 && (
                    <div>
                      <h3 className="text-white/80 text-sm font-semibold mb-3 uppercase tracking-wide">Players</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {players.map((result) => (
                          <PlayerCard key={result.id} result={result} onClick={onClose} />
                        ))}
                      </div>
                    </div>
                  )}
                  {teams.length > 0 && (
                    <div>
                      <h3 className="text-white/80 text-sm font-semibold mb-3 uppercase tracking-wide">Teams</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {teams.map((result) => (
                          <TeamCard key={result.id} result={result} onClick={onClose} />
                        ))}
                      </div>
                    </div>
                  )}
                  {schools.length > 0 && (
                    <div>
                      <h3 className="text-white/80 text-sm font-semibold mb-3 uppercase tracking-wide">Schools</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {schools.map((result) => (
                          <SchoolCard key={result.id} result={result} onClick={onClose} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : searchQuery.trim().length > 0 ? (
                <div className="text-center py-12 text-white/60">
                  <p className="text-lg">No results found</p>
                  <p className="text-sm mt-2">Try a different search term</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PlayerCard({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  return (
    <Link href={`/player/${result.slug}`} onClick={onClick}>
      <div className="group relative rounded-lg overflow-hidden border border-white/10 bg-black/20 hover:border-accent/50 transition-all cursor-pointer">
        {/* Card Image */}
        <div className="relative w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900">
          {result.banner_url ? (
            <Image
              src={result.banner_url}
              alt={result.name}
              fill
              className="object-cover"
              unoptimized
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
          )}
          
          {/* Profile Headshot Overlay */}
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-24 h-24 rounded-full border-4 border-black overflow-hidden bg-black/50">
            {result.image_url ? (
              <Image
                src={result.image_url}
                alt={result.name}
                fill
                className="object-cover"
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                <span className="text-white/40 text-2xl font-bold">
                  {result.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Player Info */}
        <div className="pt-16 pb-4 px-4 text-center">
          <h3 className="text-white font-semibold text-lg mb-1 truncate">
            {result.name}
          </h3>
          {result.school && (
            <p className="text-white/60 text-sm truncate">
              {result.school}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function TeamCard({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  return (
    <Link href={`/team/${result.slug}`} onClick={onClick}>
      <div className="group relative rounded-lg overflow-hidden border border-white/10 bg-black/20 hover:border-accent/50 transition-all cursor-pointer">
        {/* Card Image */}
        <div className="relative w-full h-48 bg-gradient-to-br from-blue-800 to-blue-900">
          {result.logo_url ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <Image
                src={result.logo_url}
                alt={result.name}
                width={120}
                height={120}
                className="object-contain"
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-800 to-blue-900 flex items-center justify-center">
              <span className="text-white/40 text-4xl font-bold">
                {result.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Team Info */}
        <div className="pt-4 pb-4 px-4 text-center">
          <h3 className="text-white font-semibold text-lg mb-1 truncate">
            {result.name}
          </h3>
          {result.school && (
            <p className="text-white/60 text-sm truncate">
              {result.school}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function SchoolCard({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  return (
    <Link href={`/school/${result.slug}`} onClick={onClick}>
      <div className="group relative rounded-lg overflow-hidden border border-white/10 bg-black/20 hover:border-accent/50 transition-all cursor-pointer">
        {/* Card Image */}
        <div className="relative w-full h-48 bg-gradient-to-br from-purple-800 to-purple-900">
          {result.logo_url ? (
            <div className="w-full h-full flex items-center justify-center p-8">
              <Image
                src={result.logo_url}
                alt={result.name}
                width={120}
                height={120}
                className="object-contain"
                unoptimized
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-800 to-purple-900 flex items-center justify-center">
              <span className="text-white/40 text-4xl font-bold">
                {result.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* School Info */}
        <div className="pt-4 pb-4 px-4 text-center">
          <h3 className="text-white font-semibold text-lg mb-1 truncate">
            {result.name}
          </h3>
          {(result.city || result.state) && (
            <p className="text-white/60 text-sm truncate">
              {[result.city, result.state].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function ResultCardSkeleton() {
  return (
    <div className="relative rounded-lg overflow-hidden border border-white/10 bg-black/20">
      {/* Card Image Skeleton */}
      <Skeleton className="w-full h-48 bg-gray-800/50" />
      
      {/* Info Skeleton */}
      <div className="pt-4 pb-4 px-4 text-center space-y-2">
        <Skeleton className="h-5 w-3/4 mx-auto bg-gray-700/50" />
        <Skeleton className="h-4 w-1/2 mx-auto bg-gray-800/50" />
      </div>
    </div>
  );
}

