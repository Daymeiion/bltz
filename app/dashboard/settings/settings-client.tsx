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

  // Spotify connection state
  const [spotify, setSpotify] = useState<{
    configured: boolean;
    connected: boolean;
    displayName: string | null;
  } | null>(null);
  const [spotifyBusy, setSpotifyBusy] = useState(false);


  useEffect(() => {
    loadSettings();
    loadSpotifyStatus();
  }, []);

  // Surface the OAuth result from the callback redirect (?spotify=connected|error).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("spotify");
    if (!result) return;
    if (result === "connected") toast.success("Spotify connected!");
    else if (result === "no_player") toast.error("Finish setting up your athlete profile first.");
    else if (result === "error") toast.error(`Couldn't connect Spotify (${params.get("reason") ?? "unknown"}).`);
    // Clean the query string so a refresh doesn't re-toast.
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const loadSpotifyStatus = async () => {
    try {
      const res = await fetch("/api/spotify/status");
      if (res.ok) setSpotify(await res.json());
    } catch {
      /* non-fatal */
    }
  };

  const disconnectSpotify = async () => {
    setSpotifyBusy(true);
    try {
      const res = await fetch("/api/spotify/disconnect", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Spotify disconnected");
      loadSpotifyStatus();
    } catch {
      toast.error("Failed to disconnect Spotify");
    } finally {
      setSpotifyBusy(false);
    }
  };

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

        {/* Spotify "Now Playing" */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954" aria-hidden><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.586 14.424a.622.622 0 0 1-.857.207c-2.348-1.435-5.304-1.76-8.785-.964a.622.622 0 1 1-.277-1.215c3.809-.871 7.077-.496 9.712 1.115a.623.623 0 0 1 .207.857zm1.223-2.722a.78.78 0 0 1-1.072.257c-2.687-1.652-6.785-2.131-9.965-1.166a.779.779 0 1 1-.452-1.491c3.632-1.102 8.147-.568 11.234 1.329a.78.78 0 0 1 .255 1.071zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71a.935.935 0 1 1-.542-1.79c3.532-1.072 9.404-.865 13.115 1.338a.936.936 0 0 1-.954 1.61z" /></svg>
              Spotify
            </CardTitle>
            <CardDescription>
              Link your Spotify so fans see what you&apos;re listening to, live on your locker.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {spotify && !spotify.configured ? (
              <p className="text-sm text-muted-foreground">
                Spotify isn&apos;t configured on this deployment yet.
              </p>
            ) : spotify?.connected ? (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Badge className="bg-[#1DB954] text-black hover:bg-[#1DB954]">Connected</Badge>
                  {spotify.displayName ? (
                    <span className="text-sm text-muted-foreground">as {spotify.displayName}</span>
                  ) : null}
                </div>
                <Button variant="outline" onClick={disconnectSpotify} disabled={spotifyBusy}>
                  {spotifyBusy ? <IconLoader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button asChild className="bg-[#1DB954] text-black hover:bg-[#1aa34a]">
                <a href="/api/spotify/connect">Connect Spotify</a>
              </Button>
            )}
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
