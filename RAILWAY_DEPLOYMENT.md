# Railway Backend Deployment Guide

## Prerequisites

1. Install Railway CLI: `npm install -g @railway/cli`
2. Create a Railway account at [railway.app](https://railway.app)

## Deployment Steps

### 1. Login to Railway

```bash
railway login
```

### 2. Initialize Railway Project

```bash
railway init
```

### 3. Add Environment Variables

```bash
railway variables set NODE_ENV=production
railway variables set PORT=5001
```

### 4. Deploy to Railway

```bash
railway up
```

### 5. Get Your Backend URL

```bash
railway domain
```

## Update Frontend Configuration

After deployment, you'll need to update your frontend to use the Railway backend URL.

1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Add an environment variable:

   - Name: `VITE_API_URL`
   - Value: `https://your-railway-app.railway.app` (replace with your actual Railway URL)

4. Redeploy your frontend on Vercel

## Database Setup

Railway will automatically create a persistent volume for your SQLite database. The database file will be stored in Railway's persistent storage and will survive deployments.

## Monitoring

- View logs: `railway logs`
- Open Railway dashboard: `railway open`
- Check deployment status: `railway status`

## Troubleshooting

### Common Issues:

1. **Port Issues**: Railway automatically assigns a PORT environment variable. The server code already handles this.

2. **Database Path**: The server is configured to use Railway's persistent storage via the DATABASE_URL environment variable.

3. **Build Issues**: Make sure all dependencies are in `package.json` and the start script is correct.

### Useful Commands:

```bash
# View real-time logs
railway logs --follow

# Restart the service
railway service restart

# Check service status
railway service status
```

## Environment Variables Reference

| Variable       | Description          | Default      |
| -------------- | -------------------- | ------------ |
| `PORT`         | Server port          | `5001`       |
| `NODE_ENV`     | Environment mode     | `production` |
| `DATABASE_URL` | SQLite database path | `./meals.db` |

## Next Steps

After successful deployment:

1. Test your API endpoints using the Railway URL
2. Update your frontend environment variables
3. Redeploy your frontend on Vercel
4. Test the complete application

Your backend will be available at: `https://your-app-name.railway.app`
