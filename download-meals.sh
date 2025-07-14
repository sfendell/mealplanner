#!/bin/bash

# Download meals from production and update local meals.txt
echo "Downloading meals from production..."

# Get the Railway URL
RAILWAY_URL=$(railway domain 2>/dev/null | grep -o 'https://[^[:space:]]*')

if [ -z "$RAILWAY_URL" ]; then
    echo "Error: Could not get Railway URL. Make sure you're logged in to Railway CLI."
    exit 1
fi

echo "Railway URL: $RAILWAY_URL"

# Download meals from production
echo "Downloading from: $RAILWAY_URL/api/export-meals"
curl -s -L "$RAILWAY_URL/api/export-meals" -o meals.txt

if [ $? -eq 0 ]; then
    echo "✅ Successfully downloaded meals from production to meals.txt"
    echo "📄 Updated local meals.txt with production data"
    echo "📊 File size: $(wc -c < meals.txt) bytes"
    echo "📝 First few lines:"
    head -5 meals.txt
else
    echo "❌ Failed to download meals from production"
    exit 1
fi 