"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { SearchModal, SearchResult } from './search-modal';

export const Navbar = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
              <button type="button" className="hidden sm:inline-flex items-center justify-center text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-light rounded-lg text-xs px-3 py-1.5 mr-2 dark:bg-primary-600 dark:hover:bg-primary-700 focus:outline-none dark:focus:ring-primary-800"><svg aria-hidden="true" className="mr-1 -ml-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path></svg> New Widget</button>
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
              {/* Notifications */}
              <button type="button"               onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }} className="p-2 mr-1 text-gray-500 rounded-xl hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-700 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600">
                  <span className="sr-only">View notifications</span>
                  {/* Bell icon */}
                  <svg className="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 14 20"><path d="M12.133 10.632v-1.8A5.406 5.406 0 0 0 7.979 3.57.946.946 0 0 0 8 3.464V1.1a1 1 0 0 0-2 0v2.364a.946.946 0 0 0 .021.106 5.406 5.406 0 0 0-4.154 5.262v1.8C1.867 13.018 0 13.614 0 14.807 0 15.4 0 16 .538 16h12.924C14 16 14 15.4 14 14.807c0-1.193-1.867-1.789-1.867-4.175ZM3.823 17a3.453 3.453 0 0 0 6.354 0H3.823Z"/></svg>
              </button>
              {/* User Menu */}
              <button type="button"               onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }} className="flex mx-3 text-sm bg-gray-800 rounded-full md:mr-0 focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600" id="user-menu-button" aria-expanded="false">
                  <span className="sr-only">Open user menu</span>
                  <img className="w-8 h-8 rounded-full" src="https://flowbite.com/docs/images/people/profile-picture-5.jpg" alt="user photo" />
              </button>
          </div>
      </div>
  </nav>
  
  {/* Dropdown Menus */}
  {/* Notifications Dropdown */}
  {showNotifications && (
    <div className="absolute right-4 top-full mt-2 z-[100] max-w-sm text-base list-none bg-white rounded-lg divide-y divide-gray-100 shadow-xl border border-gray-200 dark:divide-gray-600 dark:bg-gray-700 dark:border-gray-600">
      <div className="block py-2 px-4 text-base font-medium text-center text-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-gray-400 rounded-t-lg">
        Notifications
      </div>
      <div>
        <a href="#" className="flex py-3 px-4 border-b hover:bg-gray-100 dark:hover:bg-gray-600 dark:border-gray-600">
          <div className="flex-shrink-0">
            <img className="w-11 h-11 rounded-full" src="https://flowbite.s3.amazonaws.com/blocks/marketing-ui/avatars/bonnie-green.png" alt="Bonnie Green avatar" />
          </div>
          <div className="pl-3 w-full">
            <div className="text-gray-500 font-normal text-sm mb-1.5 dark:text-gray-400">New message from <span className="font-semibold text-gray-900 dark:text-white">Bonnie Green</span>: "Hey, what's up?"</div>
            <div className="text-xs font-medium text-primary-700 dark:text-primary-400">a few moments ago</div>
          </div>
        </a>
      </div>
      <a href="#" className="block py-2 text-base font-medium text-center text-gray-900 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:underline rounded-b-lg">
        View all
      </a>
    </div>
  )}


  {/* User Menu Dropdown */}
  {showUserMenu && (
    <div className="absolute right-4 top-full mt-2 z-[100] w-56 text-base list-none bg-white rounded divide-y divide-gray-100 shadow dark:bg-gray-700 dark:divide-gray-600">
      <div className="py-3 px-4">
        <span className="block text-sm font-semibold text-gray-900 dark:text-white">Neil sims</span>
        <span className="block text-sm text-gray-500 truncate dark:text-gray-400">name@flowbite.com</span>
      </div>
      <ul className="py-1 text-gray-500 dark:text-gray-400">
        <li>
          <a href="#" className="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-400 dark:hover:text-white">My profile</a>
        </li>
        <li>
          <a href="#" className="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-400 dark:hover:text-white">Account settings</a>
        </li>
      </ul>
      <ul className="py-1 text-gray-500 dark:text-gray-400">
        <li>
          <a href="#" className="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Sign out</a>
        </li>
      </ul>
    </div>
  )}

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