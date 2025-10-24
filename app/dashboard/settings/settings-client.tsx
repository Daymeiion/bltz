"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  IconBrandTwitter, 
  IconBrandInstagram, 
  IconBrandLinkedin,
  IconBrandYoutube,
  IconBrandTiktok,
  IconLoader2
} from "@tabler/icons-react";
import { toast } from "sonner";

interface UserSettings {
  id: string;
  user_id: string;
  twitter_handle?: string;
  instagram_handle?: string;
  linkedin_handle?: string;
  youtube_handle?: string;
  tiktok_handle?: string;
  created_at: string;
  updated_at: string;
}

interface SettingsClientProps {
  user: User;
}

export default function SettingsClient({ user }: SettingsClientProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [socialHandles, setSocialHandles] = useState({
    twitter: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    tiktok: ""
  });


  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setSocialHandles({
          twitter: data?.twitter_handle || "",
          instagram: data?.instagram_handle || "",
          linkedin: data?.linkedin_handle || "",
          youtube: data?.youtube_handle || "",
          tiktok: data?.tiktok_handle || ""
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };


  const saveSettings = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...socialHandles
        }),
      });

      if (response.ok) {
        toast.success("Settings saved successfully!");
        loadSettings();
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <IconLoader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your social media connections
        </p>
      </div>

      <div className="space-y-6">
        {/* Social Media Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconBrandTwitter className="h-5 w-5" />
              Social Media
            </CardTitle>
            <CardDescription>
              Add your social media handles to display in your profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="twitter" className="flex items-center gap-2">
                  <IconBrandTwitter className="h-4 w-4" />
                  Twitter
                </Label>
                <Input
                  id="twitter"
                  placeholder="@username"
                  value={socialHandles.twitter}
                  onChange={(e) => setSocialHandles(prev => ({ ...prev, twitter: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="instagram" className="flex items-center gap-2">
                  <IconBrandInstagram className="h-4 w-4" />
                  Instagram
                </Label>
                <Input
                  id="instagram"
                  placeholder="@username"
                  value={socialHandles.instagram}
                  onChange={(e) => setSocialHandles(prev => ({ ...prev, instagram: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin" className="flex items-center gap-2">
                  <IconBrandLinkedin className="h-4 w-4" />
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  placeholder="username"
                  value={socialHandles.linkedin}
                  onChange={(e) => setSocialHandles(prev => ({ ...prev, linkedin: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtube" className="flex items-center gap-2">
                  <IconBrandYoutube className="h-4 w-4" />
                  YouTube
                </Label>
                <Input
                  id="youtube"
                  placeholder="@username or channel name"
                  value={socialHandles.youtube}
                  onChange={(e) => setSocialHandles(prev => ({ ...prev, youtube: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tiktok" className="flex items-center gap-2">
                  <IconBrandTiktok className="h-4 w-4" />
                  TikTok
                </Label>
                <Input
                  id="tiktok"
                  placeholder="@username"
                  value={socialHandles.tiktok}
                  onChange={(e) => setSocialHandles(prev => ({ ...prev, tiktok: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button 
            onClick={saveSettings} 
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <IconLoader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </div>

    </div>
  );
}
