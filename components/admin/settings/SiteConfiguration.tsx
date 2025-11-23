"use client";

import { useSettings } from "@/hooks/useSettings";

export function SiteConfiguration() {
  const { settings, setSettings, loading, saving, error, saveSettings } = useSettings({
    endpoint: "site",
    initialData: {
      site_name: "BLTZ Platform",
      site_description: "The ultimate social media platform for athletes and fans",
      site_url: "https://bltz.com",
      maintenance_mode: false,
      registration_enabled: true,
      public_registration: true,
      default_user_role: "fan",
      max_file_size: 10,
      allowed_file_types: ["jpg", "jpeg", "png", "mp4", "mov"],
      timezone: "America/New_York",
      language: "en",
      theme: "dark",
    },
  });

  const handleSave = async () => {
    try {
      await saveSettings();
      console.log("Site configuration saved successfully");
    } catch (error) {
      console.error("Error saving site configuration:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white">Site Configuration</h2>
        <div className="flex items-center justify-center py-8">
          <div className="text-neutral-400">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Site Configuration</h2>
      
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <div className="text-red-400 text-sm">Error: {error}</div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Basic Information</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Site Name
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => setSettings({...settings, site_name: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Site Description
            </label>
            <textarea
              value={settings.site_description}
              onChange={(e) => setSettings({...settings, site_description: e.target.value})}
              rows={3}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Site URL
            </label>
            <input
              type="url"
              value={settings.site_url}
              onChange={(e) => setSettings({...settings, site_url: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>
        </div>

        {/* Access Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Access Control</h3>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) => setSettings({...settings, maintenance_mode: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Maintenance Mode</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.registration_enabled}
                onChange={(e) => setSettings({...settings, registration_enabled: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Enable User Registration</span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.public_registration}
                onChange={(e) => setSettings({...settings, public_registration: e.target.checked})}
                className="w-4 h-4 text-[#000CF5] bg-neutral-800 border-neutral-700 rounded focus:ring-[#000CF5]"
              />
              <span className="text-sm text-neutral-300">Public Registration</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Default User Role
            </label>
            <select
              value={settings.default_user_role}
              onChange={(e) => setSettings({...settings, default_user_role: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            >
              <option value="fan">Fan</option>
              <option value="player">Player</option>
              <option value="publisher">Publisher</option>
            </select>
          </div>
        </div>

        {/* File Upload Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">File Upload Settings</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Max File Size (MB)
            </label>
            <input
              type="number"
              value={settings.max_file_size}
              onChange={(e) => setSettings({...settings, max_file_size: parseInt(e.target.value)})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Allowed File Types
            </label>
            <div className="flex flex-wrap gap-2">
              {settings.allowed_file_types.map((type: string, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 bg-neutral-700 text-neutral-300 px-2 py-1 rounded text-xs"
                >
                  {type}
                  <button
                    onClick={() => {
                      const newTypes = settings.allowed_file_types.filter((_: string, i: number) => i !== index);
                      setSettings({...settings, allowed_file_types: newTypes});
                    }}
                    className="text-neutral-400 hover:text-white"
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder="Add file type"
                className="bg-neutral-800 border border-neutral-700 rounded-md px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    const newType = e.currentTarget.value.trim();
                    if (newType && !settings.allowed_file_types.includes(newType)) {
                      setSettings({
                        ...settings,
                        allowed_file_types: [...settings.allowed_file_types, newType]
                      });
                      e.currentTarget.value = '';
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Localization Settings */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-white">Localization</h3>
          
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({...settings, timezone: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            >
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Default Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => setSettings({...settings, language: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Default Theme
            </label>
            <select
              value={settings.theme}
              onChange={(e) => setSettings({...settings, theme: e.target.value})}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[#000CF5]"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-neutral-800">
        <button
          onClick={handleSave}
          disabled={loading || saving}
          className="bg-[#000CF5] text-white px-6 py-2 rounded-md hover:bg-[#000CF5]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
