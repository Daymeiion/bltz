"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  User, 
  Upload, 
  Camera, 
  Save, 
  Loader2, 
  Check, 
  AlertCircle,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  email: string;
  player_id?: string;
}

interface PlayerProfile {
  id: string;
  full_name: string;
  profile_image?: string;
  team?: string;
  position?: string;
}

export function SettingsClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setPlayerProfile(data.playerProfile);
        if (data.playerProfile?.profile_image) {
          setPreviewUrl(data.playerProfile.profile_image);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadStatus('error');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadStatus('error');
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !playerProfile) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('playerId', playerProfile.id);

      const response = await fetch('/api/upload/headshot', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setPlayerProfile(prev => prev ? { ...prev, profile_image: data.imageUrl } : null);
        setUploadStatus('success');
        setSelectedFile(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        setUploadStatus('error');
      }
    } catch (error) {
      console.error('Error uploading headshot:', error);
      setUploadStatus('error');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-bltz-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(var(--bltz-navy))] via-[#000000] to-[#000000] p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative mb-10">
          <div className="absolute -top-2 -left-2 w-64 h-64 bg-bltz-gold/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-2 -right-2 w-72 h-72 bg-bltz-blue/10 rounded-full blur-3xl" />
          
          <div className="relative text-center">
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 tracking-tight">
              Profile <span className="text-gradient-blue-gold">Settings</span>
            </h1>
            <p className="text-bltz-white/70 text-lg font-medium">
              Manage your profile and upload your headshot
            </p>
          </div>
        </div>

        {/* Profile Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Current Profile */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-gray-600/50 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-6 h-6 text-bltz-gold" />
              Profile Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-bltz-white/70 text-sm font-medium">Display Name</label>
                <p className="text-white font-medium">{profile?.display_name || 'Not set'}</p>
              </div>
              
              <div>
                <label className="text-bltz-white/70 text-sm font-medium">Email</label>
                <p className="text-white font-medium">{profile?.email || 'Not set'}</p>
              </div>
              
              {playerProfile && (
                <>
                  <div>
                    <label className="text-bltz-white/70 text-sm font-medium">Full Name</label>
                    <p className="text-white font-medium">{playerProfile.full_name || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <label className="text-bltz-white/70 text-sm font-medium">Team</label>
                    <p className="text-white font-medium">{playerProfile.team || 'Not set'}</p>
                  </div>
                  
                  <div>
                    <label className="text-bltz-white/70 text-sm font-medium">Position</label>
                    <p className="text-white font-medium">{playerProfile.position || 'Not set'}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Headshot Upload */}
          <div className="bg-black/40 backdrop-blur-md rounded-2xl border-2 border-gray-600/50 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Camera className="w-6 h-6 text-bltz-gold" />
              Headshot Upload
            </h2>
            
            <div className="space-y-6">
              {/* Current Headshot Preview */}
              <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-2xl border-2 border-bltz-gold/30 overflow-hidden bg-black/40">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Headshot preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-bltz-gold/50" />
                    </div>
                  )}
                </div>
                <p className="text-bltz-white/70 text-sm mt-2">
                  {previewUrl ? 'Current headshot' : 'No headshot uploaded'}
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-4">
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-bltz-gold/30 rounded-lg cursor-pointer bg-black/20 hover:bg-black/40 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-4 text-bltz-gold" />
                      <p className="mb-2 text-sm text-bltz-white/70">
                        <span className="font-semibold">Click to upload</span> your headshot
                      </p>
                      <p className="text-xs text-bltz-white/50">
                        PNG, JPG, GIF up to 5MB
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                  </label>
                </div>

                {/* Upload Button */}
                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-bltz-blue to-bltz-gold text-white rounded-lg font-bold transition-all duration-300 hover:shadow-lg hover:shadow-bltz-gold/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Upload Headshot
                      </>
                    )}
                  </button>
                )}

                {/* Status Messages */}
                {uploadStatus === 'success' && (
                  <div className="flex items-center gap-2 text-green-400 bg-green-900/20 p-3 rounded-lg">
                    <Check className="w-4 h-4" />
                    <span className="text-sm font-medium">Headshot uploaded successfully!</span>
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">Upload failed. Please try again.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-blue-900/20 backdrop-blur-md rounded-2xl border-2 border-blue-500/30 p-6">
          <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-400" />
            About Headshots
          </h3>
          <div className="text-bltz-white/70 space-y-2">
            <p>• Your headshot will be used as a fallback image for awards that don't have specific images</p>
            <p>• Upload a professional photo for the best results</p>
            <p>• Supported formats: PNG, JPG, GIF (max 5MB)</p>
            <p>• Your headshot will appear in the achievements page when award images aren't available</p>
          </div>
        </div>
      </div>
    </div>
  );
}
