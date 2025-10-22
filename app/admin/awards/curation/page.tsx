/**
 * Admin Award Curation Interface
 * Allows manual verification and editing of discovered awards
 */

import { AwardCurationClient } from './curation-client';

export default function AwardCurationPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Award Curation
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Review, verify, and edit discovered player awards
        </p>
      </div>
      
      <AwardCurationClient />
    </div>
  );
}
