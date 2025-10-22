-- Complete Database Setup for BLTZ Messaging System with Sample Data
-- This script creates all necessary tables and includes sample profiles

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player', 'publisher', 'fan')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table with proper foreign key constraints to profiles
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'admin_to_user' CHECK (message_type IN ('admin_to_user', 'user_to_admin', 'user_to_user')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'delivered', 'read', 'archived')),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create message_attachments table (referenced in API)
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'image',
  width INTEGER,
  height INTEGER,
  thumbnail_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create message_threads table (referenced in API)
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add thread_id column to messages table
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS thread_id UUID REFERENCES public.message_threads(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all profile operations" ON public.profiles;
DROP POLICY IF EXISTS "Allow all message operations" ON public.messages;
DROP POLICY IF EXISTS "Allow all attachment operations" ON public.message_attachments;
DROP POLICY IF EXISTS "Allow all thread operations" ON public.message_threads;

-- Simple RLS policies (allow all for testing)
CREATE POLICY "Allow all profile operations" ON public.profiles FOR ALL USING (true);
CREATE POLICY "Allow all message operations" ON public.messages FOR ALL USING (true);
CREATE POLICY "Allow all attachment operations" ON public.message_attachments FOR ALL USING (true);
CREATE POLICY "Allow all thread operations" ON public.message_threads FOR ALL USING (true);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);

-- Create sample profiles for testing
-- Note: These will only work if you have corresponding auth.users entries
-- You may need to create actual user accounts first

-- Insert sample profiles (only if auth.users exist)
-- Replace these UUIDs with actual user IDs from your auth.users table
INSERT INTO public.profiles (id, username, full_name, role) VALUES
  -- Admin profile (replace with actual admin user ID)
  ('00000000-0000-0000-0000-000000000001'::UUID, 'admin', 'BLTZ Admin', 'admin'),
  -- Sample user profiles (replace with actual user IDs)
  ('00000000-0000-0000-0000-000000000002'::UUID, 'john_doe', 'John Doe', 'player'),
  ('00000000-0000-0000-0000-000000000003'::UUID, 'jane_smith', 'Jane Smith', 'player'),
  ('00000000-0000-0000-0000-000000000004'::UUID, 'mike_wilson', 'Mike Wilson', 'publisher'),
  ('00000000-0000-0000-0000-000000000005'::UUID, 'sarah_jones', 'Sarah Jones', 'fan')
ON CONFLICT (id) DO NOTHING;

-- Create sample messages for testing
INSERT INTO public.messages (sender_id, recipient_id, subject, content, priority, status, is_read) VALUES
  ('00000000-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000002'::UUID, 
   'Welcome to BLTZ Platform!', 
   'Welcome to the BLTZ platform! We''re excited to have you join our community of athletes and fans.', 
   'normal', 'read', true),
  ('00000000-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000003'::UUID, 
   'Account Verification Required', 
   'Please verify your email address to complete your account setup.', 
   'high', 'delivered', false),
  ('00000000-0000-0000-0000-000000000001'::UUID, '00000000-0000-0000-0000-000000000004'::UUID, 
   'Platform Update - New Features Available', 
   'We''re excited to share some important updates about the BLTZ platform.', 
   'normal', 'sent', false)
ON CONFLICT DO NOTHING;
