"use client";

import { useState } from "react";

export function UserManagementSettings() {
  const [settings, setSettings] = useState({
    requireEmailVerification: true,
    allowUsernameChanges: false,
    maxUsernameLength: 20,
    minPasswordLength: 8,
    requireStrongPassword: true,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    enableTwoFactor: true,
    requireTwoFactorForAdmins: true,
    userRegistrationApproval: false,
    autoApproveVerifiedUsers: true,
    profilePictureRequired: false,
    bioMaxLength: 500,
    allowProfileCustomization: true,
  });

  const handleSave = () => {
    console.log("Saving user management settings:", settings);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">User Management Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registration Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Registration & Verification</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) => setSettings({...settings, requireEmailVerification: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require Email Verification</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.userRegistrationApproval}
                onChange={(e) => setSettings({...settings, userRegistrationApproval: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require Admin Approval for Registration</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.autoApproveVerifiedUsers}
                onChange={(e) => setSettings({...settings, autoApproveVerifiedUsers: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Auto-approve Verified Users</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.profilePictureRequired}
                onChange={(e) => setSettings({...settings, profilePictureRequired: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require Profile Picture</span>
            </label>
          </div>
        </div>

        {/* Username & Profile Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Profile Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Max Username Length
            </label>
            <input
              type="number"
              value={settings.maxUsernameLength}
              onChange={(e) => setSettings({...settings, maxUsernameLength: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Bio Max Length
            </label>
            <input
              type="number"
              value={settings.bioMaxLength}
              onChange={(e) => setSettings({...settings, bioMaxLength: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.allowUsernameChanges}
                onChange={(e) => setSettings({...settings, allowUsernameChanges: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Allow Username Changes</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.allowProfileCustomization}
                onChange={(e) => setSettings({...settings, allowProfileCustomization: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Allow Profile Customization</span>
            </label>
          </div>
        </div>

        {/* Security Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Password Security</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Minimum Password Length
            </label>
            <input
              type="number"
              value={settings.minPasswordLength}
              onChange={(e) => setSettings({...settings, minPasswordLength: parseInt(e.target.value)})}
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
        </div>

        {/* Session & Login Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Session & Login</h3>
          
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

        {/* Two-Factor Authentication */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Two-Factor Authentication</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.enableTwoFactor}
                onChange={(e) => setSettings({...settings, enableTwoFactor: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable Two-Factor Authentication</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.requireTwoFactorForAdmins}
                onChange={(e) => setSettings({...settings, requireTwoFactorForAdmins: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Require 2FA for Admins</span>
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
          Save User Settings
        </button>
      </div>
    </div>
  );
}
