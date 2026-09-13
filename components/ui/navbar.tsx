"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SearchModal, SearchResult } from './search-modal';
import { UserRound } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';
import { Popover, PopoverTrigger, PopoverContent } from './popover';

export const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Debounced search function
  const searchAll = useCallback(async (query: string) => {
    if (!query || query.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      setShowSearchModal(false);
      return;
    }

    setIsSearching(true);
    setShowSearchModal(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=9`);
      if (response.ok) {
        const data = await response.json();
        console.log('[NAVBAR] Search response:', { 
          query, 
          resultsCount: data.results?.length || 0,
          playersCount: data.players?.length || 0,
          teamsCount: data.teams?.length || 0,
          schoolsCount: data.schools?.length || 0,
          data 
        });
        // Use the combined results array
        setSearchResults(data.results || []);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('[NAVBAR] Search failed:', { 
          status: response.status, 
          statusText: response.statusText,
          error: errorData 
        });
        setSearchResults([]);
      }
    } catch (error) {
      console.error('[NAVBAR] Error searching:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Show modal immediately when user starts typing, then debounce search
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setShowSearchModal(true);
      setIsSearching(true);
    } else {
      setShowSearchModal(false);
      setIsSearching(false);
      setSearchResults([]);
    }

    const timer = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        searchAll(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchAll]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCloseSearch = () => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showSearchModal) {
        setShowSearchModal(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    if (showSearchModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showSearchModal]);

  return (
    <header className="antialiased relative overflow-visible z-[10000]">
  <nav className="backdrop-blur-md border-gray-200 px-4 lg:px-6 py-2.5 overflow-visible relative z-[10000]">
      <div className="flex flex-wrap justify-between items-center overflow-visible">
          <div className="flex justify-start items-center">
              <a href="/" className="flex mr-4">
                <img src="/bltz-white-logo.svg" className="mr-3 h-8" alt="BLTZ Logo" />
              </a>
            </div>
            
            {/* Centered Search Bar */}
            <div className="flex-1 flex justify-center relative z-[10001]">
              <form action="#" method="GET" className="hidden lg:block w-full max-w-lg">
                <label htmlFor="topbar-search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none z-10">
                      <svg className="w-5 h-5 text-primary-500 dark:text-primary-400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20"> <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/> </svg>
                  </div>
                  <input 
                    type="text" 
                    name="email" 
                    id="topbar-search" 
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (searchQuery.trim().length > 0) {
                        setShowSearchModal(true);
                      }
                    }}
                    className="bg-white/10 dark:bg-white/5 border border-white/30 dark:border-gray-500/50 text-gray-900 dark:text-white sm:text-sm font-regular rounded-[100px] focus:border-primary-500 focus:border-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20 block w-full pl-9 pr-10 py-2.5 placeholder-gray-400 dark:placeholder-gray-400 backdrop-blur-sm transition-all z-[10001] relative shadow-lg" 
                    style={{ borderWidth: '1.5px' }} 
                    placeholder="Search players, schools, and teams..." 
                    autoComplete="off"
                  />
                  {searchQuery.length > 0 && (
                    <button
                      onClick={handleCloseSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white z-10"
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </form>
            </div>
          <div className="flex items-center lg:order-2">
              {/* Mobile Search - shows when typing */}
              {(searchQuery.length > 0 || showSearchModal) && (
                <div className="lg:hidden absolute top-full left-0 right-0 px-4 py-2 bg-gray-900/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-700 z-[10001]">
                  <div className="relative">
                    <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none z-10">
                      <svg className="w-5 h-5 text-primary-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                      </svg>
                    </div>
                    <input 
                      type="text" 
                      id="mobile-search" 
                      value={searchQuery}
                      onChange={handleSearchChange}
                      className="bg-white/10 dark:bg-white/5 border border-white/30 dark:border-gray-500/50 text-white sm:text-sm font-regular rounded-[100px] focus:border-primary-500 focus:border-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20 block w-full pl-9 pr-10 py-2.5 placeholder-gray-400 backdrop-blur-sm transition-all" 
                      style={{ borderWidth: '1.5px' }} 
                      placeholder="Search players, schools, and teams..." 
                      autoComplete="off"
                    />
                    {searchQuery.length > 0 && (
                      <button
                        onClick={handleCloseSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
              <button 
                id="toggleSidebarMobileSearch" 
                type="button" 
                onClick={() => setShowSearchModal(true)}
                className="p-2 text-gray-500 rounded-lg lg:hidden hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              >
                  <span className="sr-only">Search players, Schools and Teams ... </span>
                  {/* Search icon */}
                    <svg className="w-4 h-4" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                    </svg>
              </button>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" aria-label="Account" className="flex mx-3 p-2 text-sm rounded-full md:mr-0 focus-visible:ring-4 focus-visible:ring-gray-300 dark:focus-visible:ring-gray-600">
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" aria-label="Account" className="z-[10001] w-56">
                  <LogoutButton variant="ghost" className="w-full justify-start">Sign out</LogoutButton>
                </PopoverContent>
              </Popover>
          </div>
      </div>
  </nav>
  

  {/* Search Modal */}
  <SearchModal
    isOpen={showSearchModal}
    results={searchResults}
    isLoading={isSearching}
    searchQuery={searchQuery}
    onClose={handleCloseSearch}
  />
</header>
  );
};
