"use client";

import { useState } from "react";

export function SecuritySettings() {
  const [settings, setSettings] = useState({
    requireHttps: true,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    passwordMinLength: 8,
    requireStrongPassword: true,
    passwordExpiryDays: 90,
    twoFactorRequired: false,
    twoFactorRequiredForAdmins: true,
    ipWhitelistEnabled: false,
    allowedIPs: "",
    rateLimitingEnabled: true,
    rateLimitRequests: 100,
    rateLimitWindow: 15,
    csrfProtection: true,
    xssProtection: true,
    sqlInjectionProtection: true,
    fileUploadSecurity: true,
    auditLogging: true,
    securityHeaders: true,
    corsEnabled: true,
    corsOrigins: "*",
    apiKeyRequired: false,
    apiRateLimit: 1000,
  });

  const handleSave = () => {
    console.log("Saving security settings:", settings);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Security Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Security */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Basic Security</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.requireHttps}
                onChange={(e) => setSettings({...settings, requireHttps: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require HTTPS</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.csrfProtection}
                onChange={(e) => setSettings({...settings, csrfProtection: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">CSRF Protection</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.xssProtection}
                onChange={(e) => setSettings({...settings, xssProtection: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">XSS Protection</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.sqlInjectionProtection}
                onChange={(e) => setSettings({...settings, sqlInjectionProtection: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">SQL Injection Protection</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.securityHeaders}
                onChange={(e) => setSettings({...settings, securityHeaders: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Security Headers</span>
            </label>
          </div>
        </div>

        {/* Authentication Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Authentication</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Session Timeout (hours)
            </label>
            <input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Max Login Attempts
            </label>
            <input
              type="number"
              value={settings.maxLoginAttempts}
              onChange={(e) => setSettings({...settings, maxLoginAttempts: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Lockout Duration (minutes)
            </label>
            <input
              type="number"
              value={settings.lockoutDuration}
              onChange={(e) => setSettings({...settings, lockoutDuration: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Password Security */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Password Security</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Minimum Password Length
            </label>
            <input
              type="number"
              value={settings.passwordMinLength}
              onChange={(e) => setSettings({...settings, passwordMinLength: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.requireStrongPassword}
                onChange={(e) => setSettings({...settings, requireStrongPassword: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require Strong Passwords</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Password Expiry (days)
            </label>
            <input
              type="number"
              value={settings.passwordExpiryDays}
              onChange={(e) => setSettings({...settings, passwordExpiryDays: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Two-Factor Authentication</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.twoFactorRequired}
                onChange={(e) => setSettings({...settings, twoFactorRequired: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require 2FA for All Users</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.twoFactorRequiredForAdmins}
                onChange={(e) => setSettings({...settings, twoFactorRequiredForAdmins: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require 2FA for Admins</span>
            </label>
          </div>
        </div>

        {/* IP Whitelist */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">IP Access Control</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.ipWhitelistEnabled}
                onChange={(e) => setSettings({...settings, ipWhitelistEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable IP Whitelist</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Allowed IPs (comma-separated)
            </label>
            <textarea
              value={settings.allowedIPs}
              onChange={(e) => setSettings({...settings, allowedIPs: e.target.value})}
              rows={3}
              placeholder="192.168.1.1, 10.0.0.1, 203.0.113.0/24"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Rate Limiting */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Rate Limiting</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.rateLimitingEnabled}
                onChange={(e) => setSettings({...settings, rateLimitingEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable Rate Limiting</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Requests per Window
            </label>
            <input
              type="number"
              value={settings.rateLimitRequests}
              onChange={(e) => setSettings({...settings, rateLimitRequests: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Window Duration (minutes)
            </label>
            <input
              type="number"
              value={settings.rateLimitWindow}
              onChange={(e) => setSettings({...settings, rateLimitWindow: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* CORS Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">CORS Settings</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.corsEnabled}
                onChange={(e) => setSettings({...settings, corsEnabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable CORS</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              CORS Origins
            </label>
            <input
              type="text"
              value={settings.corsOrigins}
              onChange={(e) => setSettings({...settings, corsOrigins: e.target.value})}
              placeholder="https://example.com, https://app.example.com"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* API Security */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">API Security</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.apiKeyRequired}
                onChange={(e) => setSettings({...settings, apiKeyRequired: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require API Keys</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              API Rate Limit (requests/hour)
            </label>
            <input
              type="number"
              value={settings.apiRateLimit}
              onChange={(e) => setSettings({...settings, apiRateLimit: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* File Upload Security */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">File Upload Security</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.fileUploadSecurity}
                onChange={(e) => setSettings({...settings, fileUploadSecurity: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">File Upload Security</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.auditLogging}
                onChange={(e) => setSettings({...settings, auditLogging: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Audit Logging</span>
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
          Save Security Settings
        </button>
      </div>
    </div>
  );
}
