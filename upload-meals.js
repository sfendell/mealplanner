const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Parse meals.txt and convert to JSON format
function parseMealsFile() {
  const content = fs.readFileSync("meals.txt", "utf8");
  const mealBlocks = content.split("\n\n").filter((block) => block.trim());

  const meals = [];

  mealBlocks.forEach((block) => {
    const lines = block.trim().split("\n");
    if (lines.length < 2) return;

    const title = lines[0].trim();
    const ingredients = lines
      .slice(1)
      .map((line) => parseIngredientLine(line))
      .filter((ingredient) => ingredient.name);

    if (ingredients.length > 0) {
      meals.push({
        title: title,
        ingredients: ingredients,
        hasVeggieSide: false, // Default value
      });
    }
  });

  return meals;
}

function parseIngredientLine(line) {
  const trimmedLine = line.trim().toLowerCase();

  // Check if line starts with a number (quantity)
  const quantityMatch = trimmedLine.match(
    /^(\d+(?:\/\d+)?(?:\s*-\s*\d+)?)\s+(.+)$/
  );
  if (quantityMatch) {
    return {
      quantity: quantityMatch[1],
      name: quantityMatch[2],
    };
  }

  // Check if line starts with a fraction
  const fractionMatch = trimmedLine.match(/^(\d+\/\d+)\s+(.+)$/);
  if (fractionMatch) {
    return {
      quantity: fractionMatch[1],
      name: fractionMatch[2],
    };
  }

  // Check if line starts with a range
  const rangeMatch = trimmedLine.match(/^(\d+\s*-\s*\d+)\s+(.+)$/);
  if (rangeMatch) {
    return {
      quantity: rangeMatch[1],
      name: rangeMatch[2],
    };
  }

  // No quantity specified
  return {
    quantity: null,
    name: trimmedLine,
  };
}

// Prompt user for Vercel bypass token
function promptForBypassToken() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question("Enter your Vercel bypass token: ", (token) => {
      rl.close();
      resolve(token.trim());
    });
  });
}

// Upload meals to production server
async function uploadMeals(meals, bypassToken) {
  const baseUrl =
    "https://mealplanner-keavrfjcc-sam-fendells-projects.vercel.app";

  console.log(`Uploading ${meals.length} meals to production server...`);

  for (let i = 0; i < meals.length; i++) {
    const meal = meals[i];
    try {
      const url = `${baseUrl}/api/meals?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass=${bypassToken}`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meal),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Uploaded: ${meal.title} (ID: ${result.id})`);
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to upload ${meal.title}: ${response.status}`);
        console.error(`Server response: ${errorText}`);
        process.exit(1); // Quit immediately on error
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`❌ Error uploading ${meal.title}: ${error.message}`);
      process.exit(1); // Quit immediately on error
    }
  }

  console.log("Upload complete!");
}

// Main execution
async function main() {
  try {
    const meals = parseMealsFile();
    console.log(`Found ${meals.length} meals to upload`);

    if (meals.length === 0) {
      console.log("No meals found to upload");
      return;
    }

    console.log("\n🔐 Vercel Authentication Required");
    console.log("To get your bypass token:");
    console.log("1. Go to your Vercel dashboard");
    console.log("2. Select your mealplanner project");
    console.log("3. Go to Settings → Security → Authentication");
    console.log("4. Click 'Create bypass token' or use an existing one");
    console.log("");

    const bypassToken = await promptForBypassToken();

    if (!bypassToken) {
      console.error("❌ No bypass token provided. Exiting.");
      process.exit(1);
    }

    await uploadMeals(meals, bypassToken);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

main();
