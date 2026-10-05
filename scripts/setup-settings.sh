#!/bin/bash

# Setup Settings Database Schema
# Run this script to create the settings tables in Supabase

echo "Setting up settings database schema..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql is not installed or not in PATH"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Check if SUPABASE_URL and SUPABASE_ANON_KEY are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set"
    echo "Please set these variables in your .env.local file"
    exit 1
fi

# Run the SQL script
echo "Executing setup-settings.sql..."
psql "$SUPABASE_URL" -f scripts/setup-settings.sql

if [ $? -eq 0 ]; then
    echo "✅ Settings database schema setup completed successfully!"
    echo ""
    echo "Created tables:"
    echo "  - site_configuration"
    echo "  - user_management_settings"
    echo "  - content_moderation_settings"
    echo "  - email_notification_settings"
    echo "  - security_settings"
    echo "  - system_settings"
    echo "  - integration_settings"
    echo ""
    echo "You can now use the admin settings page to configure your platform."
else
    echo "❌ Error setting up database schema"
    exit 1
fi
