"use client";

import { useState } from "react";

export function ContentModerationSettings() {
  const [settings, setSettings] = useState({
    autoModerationEnabled: true,
    profanityFilter: true,
    spamDetection: true,
    imageModeration: true,
    videoModeration: false,
    reportThreshold: 3,
    autoHideThreshold: 5,
    autoDeleteThreshold: 10,
    moderationQueueSize: 50,
    requireApprovalForNewUsers: false,
    requireApprovalForVerifiedUsers: false,
    allowUserReports: true,
    allowAnonymousReports: false,
    moderationResponseTime: 24,
    escalationEnabled: true,
    escalationThreshold: 2,
    appealProcessEnabled: true,
    appealDeadline: 7,
  });

  const handleSave = () => {
    console.log("Saving content moderation settings:", settings);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Content Moderation Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auto-Moderation Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Auto-Moderation</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoModerationEnabled}
                onChange={(e) => setSettings({...settings, autoModerationEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable Auto-Moderation</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.profanityFilter}
                onChange={(e) => setSettings({...settings, profanityFilter: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Profanity Filter</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.spamDetection}
                onChange={(e) => setSettings({...settings, spamDetection: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Spam Detection</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.imageModeration}
                onChange={(e) => setSettings({...settings, imageModeration: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Image Moderation</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.videoModeration}
                onChange={(e) => setSettings({...settings, videoModeration: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Video Moderation</span>
            </label>
          </div>
        </div>

        {/* Moderation Thresholds */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Moderation Thresholds</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Report Threshold (auto-flag)
            </label>
            <input
              type="number"
              value={settings.reportThreshold}
              onChange={(e) => setSettings({...settings, reportThreshold: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Auto-Hide Threshold
            </label>
            <input
              type="number"
              value={settings.autoHideThreshold}
              onChange={(e) => setSettings({...settings, autoHideThreshold: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Auto-Delete Threshold
            </label>
            <input
              type="number"
              value={settings.autoDeleteThreshold}
              onChange={(e) => setSettings({...settings, autoDeleteThreshold: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Moderation Queue Size
            </label>
            <input
              type="number"
              value={settings.moderationQueueSize}
              onChange={(e) => setSettings({...settings, moderationQueueSize: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* User Approval Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">User Approval</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.requireApprovalForNewUsers}
                onChange={(e) => setSettings({...settings, requireApprovalForNewUsers: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require Approval for New Users</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.requireApprovalForVerifiedUsers}
                onChange={(e) => setSettings({...settings, requireApprovalForVerifiedUsers: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require Approval for Verified Users</span>
            </label>
          </div>
        </div>

        {/* Reporting Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Reporting System</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.allowUserReports}
                onChange={(e) => setSettings({...settings, allowUserReports: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Allow User Reports</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.allowAnonymousReports}
                onChange={(e) => setSettings({...settings, allowAnonymousReports: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Allow Anonymous Reports</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Moderation Response Time (hours)
            </label>
            <input
              type="number"
              value={settings.moderationResponseTime}
              onChange={(e) => setSettings({...settings, moderationResponseTime: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Escalation Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Escalation & Appeals</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.escalationEnabled}
                onChange={(e) => setSettings({...settings, escalationEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable Escalation</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.appealProcessEnabled}
                onChange={(e) => setSettings({...settings, appealProcessEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable Appeal Process</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Escalation Threshold (reports)
            </label>
            <input
              type="number"
              value={settings.escalationThreshold}
              onChange={(e) => setSettings({...settings, escalationThreshold: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Appeal Deadline (days)
            </label>
            <input
              type="number"
              value={settings.appealDeadline}
              onChange={(e) => setSettings({...settings, appealDeadline: parseInt(e.target.value)})}
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
          Save Moderation Settings
        </button>
      </div>
    </div>
  );
}
