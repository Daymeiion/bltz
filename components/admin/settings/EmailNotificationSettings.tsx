"use client";

import { useState } from "react";

export function EmailNotificationSettings() {
  const [settings, setSettings] = useState({
    smtpEnabled: true,
    smtpHost: "smtp.gmail.com",
    smtpPort: 587,
    smtpUsername: "",
    smtpPassword: "",
    smtpSecure: true,
    fromEmail: "noreply@bltz.com",
    fromName: "BLTZ Platform",
    welcomeEmailEnabled: true,
    passwordResetEnabled: true,
    emailVerificationEnabled: true,
    notificationDigestEnabled: true,
    digestFrequency: "daily",
    marketingEmailsEnabled: false,
    systemAlertsEnabled: true,
    moderationAlertsEnabled: true,
    userReportsEnabled: true,
    adminNotificationsEnabled: true,
    emailTemplatesEnabled: true,
    emailTrackingEnabled: true,
  });

  const handleSave = () => {
    console.log("Saving email notification settings:", settings);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Email & Notification Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SMTP Configuration */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">SMTP Configuration</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.smtpEnabled}
                onChange={(e) => setSettings({...settings, smtpEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable SMTP</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              SMTP Host
            </label>
            <input
              type="text"
              value={settings.smtpHost}
              onChange={(e) => setSettings({...settings, smtpHost: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                SMTP Port
              </label>
              <input
                type="number"
                value={settings.smtpPort}
                onChange={(e) => setSettings({...settings, smtpPort: parseInt(e.target.value)})}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.smtpSecure}
                  onChange={(e) => setSettings({...settings, smtpSecure: e.target.checked})}
                  className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
                />
                <span className="text-sm text-neutral-300">Secure (TLS)</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              SMTP Username
            </label>
            <input
              type="text"
              value={settings.smtpUsername}
              onChange={(e) => setSettings({...settings, smtpUsername: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              SMTP Password
            </label>
            <input
              type="password"
              value={settings.smtpPassword}
              onChange={(e) => setSettings({...settings, smtpPassword: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Email Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Email Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              From Email
            </label>
            <input
              type="email"
              value={settings.fromEmail}
              onChange={(e) => setSettings({...settings, fromEmail: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              From Name
            </label>
            <input
              type="text"
              value={settings.fromName}
              onChange={(e) => setSettings({...settings, fromName: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Digest Frequency
            </label>
            <select
              value={settings.digestFrequency}
              onChange={(e) => setSettings({...settings, digestFrequency: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        </div>

        {/* Email Types */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Email Types</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.welcomeEmailEnabled}
                onChange={(e) => setSettings({...settings, welcomeEmailEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Welcome Emails</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.passwordResetEnabled}
                onChange={(e) => setSettings({...settings, passwordResetEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Password Reset Emails</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.emailVerificationEnabled}
                onChange={(e) => setSettings({...settings, emailVerificationEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Email Verification</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.notificationDigestEnabled}
                onChange={(e) => setSettings({...settings, notificationDigestEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Notification Digest</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.marketingEmailsEnabled}
                onChange={(e) => setSettings({...settings, marketingEmailsEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Marketing Emails</span>
            </label>
          </div>
        </div>

        {/* System Notifications */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">System Notifications</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.systemAlertsEnabled}
                onChange={(e) => setSettings({...settings, systemAlertsEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">System Alerts</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.moderationAlertsEnabled}
                onChange={(e) => setSettings({...settings, moderationAlertsEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Moderation Alerts</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.userReportsEnabled}
                onChange={(e) => setSettings({...settings, userReportsEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">User Report Notifications</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.adminNotificationsEnabled}
                onChange={(e) => setSettings({...settings, adminNotificationsEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Admin Notifications</span>
            </label>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Advanced Settings</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.emailTemplatesEnabled}
                onChange={(e) => setSettings({...settings, emailTemplatesEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Custom Email Templates</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.emailTrackingEnabled}
                onChange={(e) => setSettings({...settings, emailTrackingEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Email Tracking</span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-neutral-800">
        <button
          onClick={handleSave}
          className="bg-[#000CF5] text-white px-6 py-2 rounded-md hover:bg-[#000CF5]/80 transition-colors"
        >
          Save Email Settings
        </button>
      </div>
    </div>
  );
}
