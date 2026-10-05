"use client";

import { useState, useEffect } from "react";

export function SetupRequired() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const response = await fetch("/api/admin/settings/status");
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error("Error checking settings status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-neutral-400">Checking settings status...</div>
      </div>
    );
  }

  if (!status?.setupRequired) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-400 mb-4">Database Setup Required</h3>
        <p className="text-yellow-200 mb-4">
          The settings database tables haven't been created yet. Please run the setup script to create the necessary tables.
        </p>
        
        <div className="space-y-3">
          <h4 className="text-md font-medium text-yellow-300">Setup Instructions:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-200">
            <li>Open your terminal and navigate to the project directory</li>
            <li>Run the database setup script:</li>
            <div className="bg-neutral-800 rounded-md p-3 mt-2">
              <code className="text-green-400">psql $SUPABASE_URL -f scripts/setup-settings.sql</code>
            </div>
            <li>Or use the provided shell script:</li>
            <div className="bg-neutral-800 rounded-md p-3 mt-2">
              <code className="text-green-400">./scripts/setup-settings.sh</code>
            </div>
            <li>Refresh this page after running the setup</li>
          </ol>
        </div>

        <div className="mt-6">
          <button
            onClick={checkStatus}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors"
          >
            Check Status Again
          </button>
        </div>
      </div>

      {status?.tables && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-6">
          <h4 className="text-md font-medium text-white mb-4">Table Status:</h4>
          <div className="space-y-2">
            {Object.entries(status.tables).map(([table, info]: [string, any]) => (
              <div key={table} className="flex items-center justify-between">
                <span className="text-sm text-neutral-300">{table}</span>
                <span className={`text-xs px-2 py-1 rounded ${
                  info.exists 
                    ? "bg-green-900/20 text-green-400" 
                    : "bg-red-900/20 text-red-400"
                }`}>
                  {info.exists ? "✓ Exists" : "✗ Missing"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
