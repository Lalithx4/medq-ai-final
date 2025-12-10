# Setup Guide for AI Presentation Generator

## Step 1: Database Setup

### Option A: Use Neon (Free Cloud PostgreSQL - Recommended)
1. Go to https://neon.tech
2. Sign up for a free account
3. Create a new project
4. Copy the connection string (it looks like: `postgresql://user:password@host.neon.tech/dbname`)

### Option B: Use Supabase (Free Cloud PostgreSQL)
1. Go to https://supabase.com
2. Create a new project
3. Go to Project Settings > Database
4. Copy the "Connection string" under "Connection pooling"

### Option C: Local PostgreSQL
1. Install PostgreSQL from https://www.postgresql.org/download/
2. Create a database: `createdb presentation_ai`
3. Your connection string: `postgresql://postgres:yourpassword@localhost:5432/presentation_ai`

## Step 2: Get API Keys

### Required Keys:

1. **OpenAI API Key** (REQUIRED for AI generation)
   - Go to: https://platform.openai.com/api-keys
   - Click "Create new secret key"
   - Copy the key (starts with `sk-`)

2. **Google OAuth Credentials** (REQUIRED for login)
   - Go to: https://console.cloud.google.com/apis/credentials
   - Create a new project or select existing
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Client Secret

3. **NextAuth Secret** (REQUIRED)
   - Run in PowerShell: `openssl rand -base64 32`
   - Or use this online generator: https://generate-secret.vercel.app/32

### Optional Keys (can add later):

4. **Together AI** (for AI image generation)
   - Go to: https://api.together.xyz
   - Sign up and get API key

5. **Unsplash** (for stock images)
   - Go to: https://unsplash.com/developers
   - Create an app and get Access Key

6. **Tavily** (for web search)
   - Go to: https://tavily.com
   - Sign up and get API key

## Step 3: Configure Environment Variables

Edit your `.env` file with the following:

```env
# Database (REQUIRED)
DATABASE_URL="your_postgresql_connection_string_here"

# NextAuth (REQUIRED)
NEXTAUTH_SECRET="generate_with_openssl_rand_base64_32"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (REQUIRED)
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# OpenAI (REQUIRED)
OPENAI_API_KEY="sk-your_openai_api_key"

# UploadThing (you already have this)
UPLOADTHING_TOKEN="csk-tj335y4ndpx9y2ntrt5wnm4jdtrwmj56w6vxfefy6pfmenwd"

# Optional - can leave empty for now
TOGETHER_AI_API_KEY=""
UNSPLASH_ACCESS_KEY=""
TAVILY_API_KEY=""
```

## Step 4: Install and Run

Open PowerShell in the project directory and run:

```powershell
# Install dependencies
pnpm install

# Push database schema
pnpm db:push

# Start development server
pnpm dev
```

## Step 5: Access the Application

Open your browser and go to: http://localhost:3000

## Troubleshooting

### "pnpm not found"
Install pnpm: `npm install -g pnpm`

### Database connection errors
- Check your DATABASE_URL is correct
- Make sure the database exists
- Check firewall/network settings for cloud databases

### Authentication errors
- Verify Google OAuth redirect URI matches exactly
- Make sure NEXTAUTH_URL is set correctly
- Check NEXTAUTH_SECRET is generated

## Quick Start (Minimal Setup)

If you want to test quickly with minimal setup:

1. **Database**: Use Neon.tech (free, no credit card)
2. **OpenAI**: Get a key from OpenAI (requires payment)
3. **Google OAuth**: Set up in Google Console
4. **Generate NEXTAUTH_SECRET**: Use online generator

These 4 things are the MINIMUM required to run the app.
