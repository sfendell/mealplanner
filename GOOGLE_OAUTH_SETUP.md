# Google OAuth 2.0 Setup Guide

This guide will help you set up Google OAuth 2.0 authentication to use your personal Gmail account instead of a service account.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API for your project

## Step 2: Create OAuth 2.0 Credentials

1. In the Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - For local development: `http://localhost:5001/auth/google/callback`
   - For production: `https://your-domain.com/auth/google/callback`
5. Note down your Client ID and Client Secret

## Step 3: Set Environment Variables

Set these environment variables in your `.env` file or deployment platform:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5001/auth/google/callback
```

## Step 4: Install Dependencies

Run this command to install the required dependency:

```bash
npm install google-auth-library
```

## Step 5: Authenticate

1. Start your server: `npm run server`
2. Visit `http://localhost:5001/auth/google` in your browser
3. Complete the Google OAuth flow
4. You should see a success message

## Step 6: Verify Authentication

Check your authentication status by visiting:
`http://localhost:5001/auth/status`

## Usage

Once authenticated, your personal Gmail account will be used to create calendar events and send emails to attendees. The authentication tokens are stored in memory and will need to be refreshed periodically.

## Security Notes

- In production, store tokens in a secure database instead of memory
- Implement token refresh logic for long-running applications
- Consider implementing proper session management
- The current implementation stores tokens in memory and will require re-authentication when the server restarts
