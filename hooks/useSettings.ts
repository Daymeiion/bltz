import { useState, useEffect } from "react";

interface UseSettingsOptions {
  endpoint: string;
  initialData: any;
}

export function useSettings({ endpoint, initialData }: UseSettingsOptions) {
  const [settings, setSettings] = useState(initialData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [endpoint]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/settings/${endpoint}`);
      
      if (!response.ok) {
        // If it's a 500 error, it might be because tables don't exist
        if (response.status === 500) {
          console.log(`Settings table for ${endpoint} may not exist, using initial data`);
          setSettings(initialData);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch settings: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      console.error(`Error fetching ${endpoint} settings:`, err);
      setError(err instanceof Error ? err.message : "Failed to fetch settings");
      // Fallback to initial data on error
      setSettings(initialData);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (updates?: any) => {
    try {
      setSaving(true);
      setError(null);
      
      const dataToSave = updates || settings;
      const response = await fetch(`/api/admin/settings/${endpoint}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save settings: ${response.statusText}`);
      }
      
      const savedData = await response.json();
      setSettings(savedData);
      return savedData;
    } catch (err) {
      console.error(`Error saving ${endpoint} settings:`, err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (updates: any) => {
    setSettings((prev: any) => ({ ...prev, ...updates }));
  };

  return {
    settings,
    setSettings: updateSettings,
    loading,
    saving,
    error,
    saveSettings,
    refetch: fetchSettings,
  };
}
