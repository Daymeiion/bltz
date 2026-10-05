"use client";

import { useState } from "react";

export function SystemSettings() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    debugMode: false,
    logLevel: "info",
    cacheEnabled: true,
    cacheTTL: 3600,
    databasePoolSize: 10,
    maxConnections: 100,
    backupEnabled: true,
    backupFrequency: "daily",
    backupRetention: 30,
    monitoringEnabled: true,
    performanceMonitoring: true,
    errorTracking: true,
    analyticsEnabled: true,
    cdnEnabled: false,
    cdnUrl: "",
    compressionEnabled: true,
    imageOptimization: true,
    videoProcessing: true,
    thumbnailGeneration: true,
    maxUploadSize: 100,
    maxConcurrentUploads: 5,
  });

  const handleSave = () => {
    console.log("Saving system settings:", settings);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">System Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* System Status */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">System Status</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Maintenance Mode</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.debugMode}
                onChange={(e) => setSettings({...settings, debugMode: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Debug Mode</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Log Level
            </label>
            <select
              value={settings.logLevel}
              onChange={(e) => setSettings({...settings, logLevel: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
        </div>

        {/* Cache Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Cache Settings</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.cacheEnabled}
                onChange={(e) => setSettings({...settings, cacheEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable Caching</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Cache TTL (seconds)
            </label>
            <input
              type="number"
              value={settings.cacheTTL}
              onChange={(e) => setSettings({...settings, cacheTTL: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Database Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Database Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Connection Pool Size
            </label>
            <input
              type="number"
              value={settings.databasePoolSize}
              onChange={(e) => setSettings({...settings, databasePoolSize: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Max Connections
            </label>
            <input
              type="number"
              value={settings.maxConnections}
              onChange={(e) => setSettings({...settings, maxConnections: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Backup Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Backup Settings</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.backupEnabled}
                onChange={(e) => setSettings({...settings, backupEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable Automated Backups</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Backup Frequency
            </label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => setSettings({...settings, backupFrequency: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Backup Retention (days)
            </label>
            <input
              type="number"
              value={settings.backupRetention}
              onChange={(e) => setSettings({...settings, backupRetention: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Monitoring Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Monitoring</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.monitoringEnabled}
                onChange={(e) => setSettings({...settings, monitoringEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">System Monitoring</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.performanceMonitoring}
                onChange={(e) => setSettings({...settings, performanceMonitoring: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Performance Monitoring</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.errorTracking}
                onChange={(e) => setSettings({...settings, errorTracking: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Error Tracking</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.analyticsEnabled}
                onChange={(e) => setSettings({...settings, analyticsEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Analytics</span>
            </label>
          </div>
        </div>

        {/* CDN Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">CDN Settings</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.cdnEnabled}
                onChange={(e) => setSettings({...settings, cdnEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable CDN</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              CDN URL
            </label>
            <input
              type="url"
              value={settings.cdnUrl}
              onChange={(e) => setSettings({...settings, cdnUrl: e.target.value})}
              placeholder="https://cdn.example.com"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Performance Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Performance</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.compressionEnabled}
                onChange={(e) => setSettings({...settings, compressionEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable Compression</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.imageOptimization}
                onChange={(e) => setSettings({...settings, imageOptimization: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Image Optimization</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.videoProcessing}
                onChange={(e) => setSettings({...settings, videoProcessing: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Video Processing</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.thumbnailGeneration}
                onChange={(e) => setSettings({...settings, thumbnailGeneration: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Thumbnail Generation</span>
            </label>
          </div>
        </div>

        {/* Upload Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Upload Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Max Upload Size (MB)
            </label>
            <input
              type="number"
              value={settings.maxUploadSize}
              onChange={(e) => setSettings({...settings, maxUploadSize: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Max Concurrent Uploads
            </label>
            <input
              type="number"
              value={settings.maxConcurrentUploads}
              onChange={(e) => setSettings({...settings, maxConcurrentUploads: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-neutral-800">
        <button
          onClick={handleSave}
          className="bg-[#000CF5] text-white px-6 py-2 rounded-md hover:bg-[#000CF5]/80 transition-colors"
        >
          Save System Settings
        </button>
      </div>
    </div>
  );
}
