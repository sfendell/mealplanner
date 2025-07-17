#!/bin/bash

echo🔄 Alphabetizing meals.txt..."

# Check if Python script exists
if [ ! -f alphabetize_meals.py]; then
    echo ❌Error: alphabetize_meals.py not foundexit 1
fi

# Check if meals.txt exists
if [ ! -f "meals.txt]; then
    echo "❌ Error: meals.txt not found  exit 1
fi

# Run the Python script
python3 alphabetize_meals.py

if  $? -eq 0]; then
    echo✅Meals alphabetized successfully!
else    echo "❌ Failed to alphabetize meals"
    exit 1
fi 