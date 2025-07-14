#!/bin/bash

# Script to set Railway environment variables from .env file

echo "Setting Railway environment variables from .env file..."

# Read .env file and set each variable
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
        continue
    fi
    
    # Remove leading/trailing whitespace
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    
    # Skip if key is empty after trimming
    if [[ -z $key ]]; then
        continue
    fi
    
    echo "Setting $key..."
    railway variables --set "$key=$value"
done < .env

echo "Done! All environment variables from .env have been set in Railway." 