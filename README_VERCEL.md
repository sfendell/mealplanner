# Meal Planner - Vercel Deployment

This is the Vercel version of the Meal Planner application. The app has been converted from Railway to Vercel for deployment.

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/mealplanner)

## 📋 What Changed

### From Railway to Vercel

- **Deployment Platform**: Railway → Vercel
- **API Routes**: Express server → Vercel serverless functions
- **Configuration**: `railway.json` → `vercel.json`
- **Build Process**: Optimized for Vercel's static build + serverless functions

### New Files Added

- `vercel.json` - Vercel configuration
- `api/meals.ts` - Meals API endpoint
- `api/meals/[id].ts` - Individual meal operations
- `.vercelignore` - Vercel deployment exclusions
- `deploy-vercel.sh` - Vercel deployment script
- `VERCEL_DEPLOYMENT.md` - Detailed deployment guide

### Files Removed/Replaced

- `railway.json` - No longer needed
- `DEPLOYMENT.md` - Replaced with Vercel guide
- `RAILWAY_DEPLOYMENT.md` - Railway-specific instructions

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start backend server (local development)
npm run server
```

## 🚀 Deploy to Vercel

### Option 1: Using the deployment script

```bash
./deploy-vercel.sh
```

### Option 2: Manual deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Option 3: Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure build settings
4. Deploy!

## ⚠️ Important Notes

### Database Considerations

- **Local Development**: Uses SQLite database file
- **Production**: Consider migrating to a cloud database (Vercel Postgres, PlanetScale, Supabase)
- **Current Setup**: SQLite will be recreated on each serverless function call

### Environment Variables

Set these in your Vercel project:

- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`

## 🔧 Configuration

The app is configured through:

- `vercel.json` - Vercel deployment settings
- `vite.config.js` - Build and development settings
- `package.json` - Dependencies and scripts

## 📚 Documentation

- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Complete deployment guide
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vitejs.dev/)

## 🆘 Support

- Check [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for troubleshooting
- Vercel Community: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)
- Vercel Support: [vercel.com/support](https://vercel.com/support)
