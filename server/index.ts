import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else if (process.env.NODE_ENV === "local") {
  dotenv.config({ path: ".env.local" });
} else {
  // Fallback for development
  dotenv.config({ path: ".env.local" });
}

const __dirname = process.cwd();

interface PrepInstructions {
  [key: string]: string;
}

interface Ingredient {
  quantity: string | null;
  name: string;
}

interface Meal {
  id: string;
  title: string;
  ingredients: Ingredient[];
  hasVeggieSide: boolean;
}

const app = express();
const PORT = process.env.PORT || 5001;

// Set default NODE_ENV if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "local";
}

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = process.env.DATABASE_URL || "./meals.db";
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to SQLite database.");
    initDatabase();
  }
});

let prepInstructions: PrepInstructions = {};

function loadPrepInstructions(): void {
  try {
    const prepFilePath = path.join(__dirname, "../prep.txt");
    if (!fs.existsSync(prepFilePath)) {
      console.log("prep.txt not found, skipping prep instructions loading");
      return;
    }

    const content = fs.readFileSync(prepFilePath, "utf8");
    const lines = content.split("\n").filter((line: string) => line.trim());

    lines.forEach((line: string) => {
      // Skip comment lines
      if (line.trim().startsWith("#")) return;

      const [key, instruction] = line.split(":");
      if (key && instruction) {
        prepInstructions[key.trim().toLowerCase()] = instruction.trim();
      }
    });

    console.log(
      `Loaded ${Object.keys(prepInstructions).length} prep instructions`
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error loading prep instructions:", error.message);
    }
  }
}

function parseIngredientLine(line: string): Ingredient {
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

  // No quantity found
  return {
    quantity: null,
    name: trimmedLine,
  };
}

function parseMealsFile() {
  try {
    const mealsFilePath = path.join(__dirname, "../meals.txt");
    if (!fs.existsSync(mealsFilePath)) {
      console.log("meals.txt not found, skipping meals loading");
      return;
    }

    const content = fs.readFileSync(mealsFilePath, "utf8");
    const mealBlocks = content.split("\n\n").filter((block) => block.trim());

    mealBlocks.forEach((block) => {
      const lines = block.trim().split("\n");
      if (lines.length < 2) return;

      const title = lines[0].trim().toLowerCase();
      const ingredients = lines
        .slice(1)
        .map((line) => parseIngredientLine(line))
        .filter((ingredient) => ingredient.name);

      if (ingredients.length === 0) return;

      const ingredientsJson = JSON.stringify(ingredients);

      // Check if meal already exists
      db.get("SELECT id FROM meals WHERE title = ?", [title], (err, row) => {
        if (err) {
          console.error("Error checking existing meal:", err.message);
          return;
        }

        if (row) {
          // Update existing meal
          db.run(
            "UPDATE meals SET ingredients = ?, hasVeggieSide = ? WHERE title = ?",
            [ingredientsJson, 0, title],
            function (err) {
              if (err) {
                console.error("Error updating meal:", err.message);
              } else {
                console.log(`Updated meal: ${title}`);
              }
            }
          );
        } else {
          // Insert new meal
          db.run(
            "INSERT INTO meals (title, ingredients, hasVeggieSide) VALUES (?, ?, ?)",
            [title, ingredientsJson, 0],
            function (err) {
              if (err) {
                console.error("Error inserting meal:", err.message);
              } else {
                console.log(`Inserted meal: ${title}`);
              }
            }
          );
        }
      });
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("Error parsing meals file:", error.message);
    }
  }
}

function initDatabase() {
  db.serialize(() => {
    // Create meals table
    db.run(
      `CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        hasVeggieSide INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      (err) => {
        if (err) {
          console.error("Error creating table:", err.message);
        } else {
          console.log("Meals table ready");
          // Try to add hasVeggieSide column if it doesn't exist
          db.run(
            "ALTER TABLE meals ADD COLUMN hasVeggieSide INTEGER DEFAULT 0",
            (err) => {
              if (err && !err.message.includes("duplicate column name")) {
                console.error(
                  "Error adding hasVeggieSide column:",
                  err.message
                );
              } else {
                console.log("Database schema updated");
                // Load data from files
                loadPrepInstructions();
                parseMealsFile();
              }
            }
          );
        }
      }
    );
  });
}

// Routes
app.get("/api/meals", (req: Request, res: Response) => {
  db.all(
    "SELECT * FROM meals ORDER BY title",
    [],
    (err: Error | null, rows: any[]) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const meals = rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        ingredients: JSON.parse(row.ingredients),
        hasVeggieSide: Boolean(row.hasVeggieSide),
        created_at: row.created_at,
      }));

      res.json(meals);
    }
  );
});

app.post("/api/meals", (req, res) => {
  const { title, ingredients, hasVeggieSide } = req.body;

  if (!title || !ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: "Invalid meal data" });
  }

  // Validate and normalize ingredients
  const normalizedIngredients = ingredients
    .map((ingredient) => {
      if (typeof ingredient === "string") {
        // Handle legacy string format
        return parseIngredientLine(ingredient);
      }

      // Handle new format with quantity and name
      return {
        quantity: ingredient.quantity || null,
        name: ingredient.name.toLowerCase(),
      };
    })
    .filter((ingredient) => ingredient.name);

  const ingredientsJson = JSON.stringify(normalizedIngredients);

  db.run(
    "INSERT INTO meals (title, ingredients, hasVeggieSide) VALUES (?, ?, ?)",
    [title.toLowerCase(), ingredientsJson, hasVeggieSide ? 1 : 0],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      res.status(201).json({
        id: this.lastID,
        title: title.toLowerCase(),
        ingredients: normalizedIngredients,
        hasVeggieSide: Boolean(hasVeggieSide),
        created_at: new Date().toISOString(),
      });
    }
  );
});

app.put("/api/meals/:id", (req, res) => {
  const { id } = req.params;
  const { title, ingredients, hasVeggieSide } = req.body;

  if (!title || !ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ error: "Invalid meal data" });
  }

  const ingredientsJson = JSON.stringify(ingredients);

  db.run(
    "UPDATE meals SET title = ?, ingredients = ?, hasVeggieSide = ? WHERE id = ?",
    [title.toLowerCase(), ingredientsJson, hasVeggieSide ? 1 : 0, id],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: "Meal not found" });
        return;
      }

      res.json({
        id: parseInt(id),
        title: title.toLowerCase(),
        ingredients: ingredients,
        hasVeggieSide: hasVeggieSide,
        updated_at: new Date().toISOString(),
      });
    }
  );
});

app.delete("/api/meals/:id", (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM meals WHERE id = ?", [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (this.changes === 0) {
      res.status(404).json({ error: "Meal not found" });
      return;
    }

    res.json({ message: "Meal deleted successfully" });
  });
});

// Get prep instructions
app.get("/api/prep", (req, res) => {
  res.json(prepInstructions);
});

// Export meals to text file format
app.get("/api/export-meals", (req, res) => {
  db.all("SELECT * FROM meals ORDER BY title", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const mealsText = rows
      .map((row) => {
        const meal = {
          title: row.title,
          ingredients: JSON.parse(row.ingredients),
        };

        // Format as text file
        const ingredientsText = meal.ingredients
          .map((ingredient) => {
            if (ingredient.quantity) {
              return `${ingredient.quantity} ${ingredient.name}`;
            }
            return ingredient.name;
          })
          .join("\n");

        return `${meal.title}\n${ingredientsText}`;
      })
      .join("\n\n");

    // Set proper headers for text file download
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=meals.txt");
    res.setHeader("Cache-Control", "no-cache");
    res.send(mealsText);
  });
});

// Auth endpoints (simplified for local development)
app.get("/auth/status", (req, res) => {
  // For local development, always return authenticated
  res.json({
    authenticated: true,
    hasRefreshToken: false,
  });
});

app.get("/auth", (req, res) => {
  res.send("Auth page - Local development mode");
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
} else {
  // Development routes
  app.get("/", (req, res) => {
    res.send("MealPrep API Server - Development Mode");
  });

  app.get("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
  });
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT. Closing database connection...");
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(0);
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MealPrep server running on port ${PORT}`);
  console.log(`📊 NODE_ENV: ${process.env.NODE_ENV}`);
});
