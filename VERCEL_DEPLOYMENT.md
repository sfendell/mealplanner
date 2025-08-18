# Vercel Deployment Guide

This guide will help you deploy your meal planner app to Vercel.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. [Vercel CLI](https://vercel.com/docs/cli) installed (optional but recommended)
3. Your meal planner project ready

## Deployment Steps

### 1. Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

### 2. Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
# Navigate to your project directory
cd mealplanner

# Deploy to Vercel
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set project name
# - Set build command: npm run build
# - Set output directory: dist
# - Set install command: npm install
```

#### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### 3. Environment Variables

Set these environment variables in your Vercel project dashboard:

- `DATABASE_URL`: Path to your SQLite database (for local development, use `./meals.db`)
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `GOOGLE_REDIRECT_URI`: Your Google OAuth redirect URI

### 4. Database Considerations

**Important**: Vercel uses serverless functions, which means:

- Each API call creates a new function instance
- The SQLite database file will be recreated on each request
- **For production use, consider migrating to a cloud database like:**
  - [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
  - [PlanetScale](https://planetscale.com/)
  - [Supabase](https://supabase.com/)

### 5. Custom Domain (Optional)

1. In your Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update your Google OAuth redirect URIs accordingly

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start backend server (for local development)
npm run server
```

## Build and Deploy

```bash
# Build the project
npm run build

# Deploy to Vercel
vercel --prod
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Ensure your database path is correct and accessible
2. **Build Failures**: Check that all dependencies are properly installed
3. **API Routes Not Working**: Verify your `vercel.json` configuration

### Debugging

- Check Vercel function logs in your dashboard
- Use `vercel logs` command for CLI debugging
- Ensure all environment variables are set correctly

## Migration from Railway

If you're migrating from Railway:

1. Remove `railway.json` file
2. Update any Railway-specific environment variables
3. Ensure your database can be accessed from Vercel
4. Test all API endpoints after deployment

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Community](https://github.com/vercel/vercel/discussions)
- [Vercel Support](https://vercel.com/support)
