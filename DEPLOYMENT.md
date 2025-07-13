# Deploy MealPrep App

## Option 2: Railway (Alternative - Free tier)

### Steps:

1. Go to [railway.app](https://railway.app)
2. Connect your GitHub account
3. Create new project from GitHub repo
4. Add environment variable: `NODE_ENV=production`
5. Deploy!

### Benefits:

- ✅ **Free tier** available
- ✅ **PostgreSQL** included (better than SQLite for production)
- ✅ **Easy database management**

---

## Option 3: Local Network (Free)

### Steps:

1. **Build the app:**

   ```bash
   npm run build
   ```

2. **Start the server:**

   ```bash
   npm run server
   ```

3. **Find your IP address:**

   ```bash
   # On Mac/Linux:
   ifconfig | grep "inet " | grep -v 127.0.0.1

   # On Windows:
   ipconfig
   ```

4. **Share the URL:** `http://YOUR_IP:5001`

### Benefits:

- ✅ **Completely free**
- ✅ **No internet required**
- ✅ **Instant setup**

### Limitations:

- ❌ Only works on same WiFi network
- ❌ Need to keep computer running

---

## Option 4: GitHub Pages + Backend (Free)

### Steps:

1. **Deploy frontend to GitHub Pages**
2. **Deploy backend to Render/Railway**
3. **Update API URL in frontend**

### Benefits:

- ✅ **Free hosting**
- ✅ **GitHub integration**

---

## Recommendation

**Use Vercel** - it's the simplest and most reliable option for sharing with family. The free tier is generous and perfect for personal projects.

After deployment, you'll get a URL like: `https://mealprep-abc123.vercel.app`

Just share that URL with your wife! 🎉
