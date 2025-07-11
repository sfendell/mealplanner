# Google Calendar API Setup Guide

This guide will help you set up Google Calendar API integration for the meal prep application.

## Prerequisites

1. A Google account
2. Access to Google Cloud Console
3. Node.js and npm installed

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click on it and press "Enable"

## Step 2: Create Service Account Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: "Meal Prep Calendar"
   - Description: "Service account for meal prep calendar integration"
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

## Step 3: Generate JSON Key File

1. In the Credentials page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create New Key"
5. Choose "JSON" format
6. Download the JSON file
7. Rename it to `google-credentials.json`
8. Place it in the root directory of your project

## Step 4: Share Calendar with Service Account

1. Open Google Calendar
2. Find your primary calendar (usually your email address)
3. Click the three dots next to the calendar name
4. Select "Settings and sharing"
5. Scroll down to "Share with specific people"
6. Click "Add people"
7. Add your service account email (found in the JSON file under `client_email`)
8. Give it "Make changes to events" permission
9. Click "Send"

## Step 5: Install Dependencies

Run this command in your project directory:

```bash
npm install
```

## Step 6: Environment Variables (Optional)

If you want to use environment variables instead of the JSON file:

1. Create a `.env` file in your project root
2. Add your service account email:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   ```

## Step 7: Test the Integration

1. Start your development server:

   ```bash
   npm run dev
   ```

2. Create a meal plan and try sending calendar invites
3. Check your Google Calendar to see if events are created
4. Check the email addresses you added to see if they received invites

## Troubleshooting

### Common Issues:

1. **"Invalid Credentials" Error**

   - Make sure the JSON file is in the correct location
   - Verify the service account has the correct permissions

2. **"Calendar not found" Error**

   - Ensure you've shared your calendar with the service account
   - Check that you're using the correct calendar ID

3. **"Permission denied" Error**
   - Verify the service account has "Make changes to events" permission
   - Check that the Google Calendar API is enabled

### Security Notes:

- Keep your `google-credentials.json` file secure and never commit it to version control
- Add `google-credentials.json` to your `.gitignore` file
- Consider using environment variables for production deployments

## API Endpoints

The application now includes a new API endpoint:

- **POST /api/calendar**: Creates calendar events and sends email invites
  - Body: `{ events: [{ title, date, attendees, description }] }`
  - Returns: `{ success: true, message: string, events: array }`

## Features

- ✅ Creates calendar events in Google Calendar
- ✅ Sends email invitations to all attendees
- ✅ Sets event reminders (1 day email, 30 min popup)
- ✅ Handles multiple events in a single request
- ✅ Provides success/error feedback to users
