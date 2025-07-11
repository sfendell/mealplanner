const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5001;

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

let prepInstructions = {};

function loadPrepInstructions() {
  try {
    const prepFilePath = path.join(__dirname, "../prep.txt");
    if (!fs.existsSync(prepFilePath)) {
      console.log("prep.txt not found, skipping prep instructions loading");
      return;
    }

    const content = fs.readFileSync(prepFilePath, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());

    lines.forEach((line) => {
      const [ingredient, instruction] = line.split(":");
      if (ingredient && instruction) {
        prepInstructions[ingredient.trim().toLowerCase()] = instruction.trim();
      }
    });

    console.log(
      `Loaded ${Object.keys(prepInstructions).length} prep instructions`
    );
  } catch (error) {
    console.error("Error loading prep instructions:", error.message);
  }
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

  // If no quantity found, treat as boolean ingredient
  return {
    quantity: null,
    name: trimmedLine,
  };
}

function parseMealsFile() {
  try {
    const mealsFilePath = path.join(__dirname, "../meals.txt");
    if (!fs.existsSync(mealsFilePath)) {
      console.log("meals.txt not found, skipping initial meal loading");
      return;
    }

    const content = fs.readFileSync(mealsFilePath, "utf8");
    const mealBlocks = content.split("\n\n").filter((block) => block.trim());

    mealBlocks.forEach((block) => {
      const lines = block.trim().split("\n");
      if (lines.length < 2) return;

      // Lowercase the title and parse ingredients
      const title = lines[0].trim().toLowerCase();
      const ingredients = lines
        .slice(1)
        .map(parseIngredientLine)
        .filter((ingredient) => ingredient.name);

      // Check if meal already exists
      db.get("SELECT id FROM meals WHERE title = ?", [title], (err, row) => {
        if (err) {
          console.error("Error checking existing meal:", err.message);
          return;
        }

        if (!row) {
          // Meal doesn't exist, insert it
          const ingredientsJson = JSON.stringify(ingredients);
          db.run(
            "INSERT INTO meals (title, ingredients, hasVeggieSide) VALUES (?, ?, ?)",
            [title, ingredientsJson, 0],
            function (err) {
              if (err) {
                console.error("Error inserting meal:", err.message);
              } else {
                console.log(`Loaded meal: ${title}`);
              }
            }
          );
        } else {
          console.log(`Meal already exists: ${title}`);
        }
      });
    });
  } catch (error) {
    console.error("Error parsing meals file:", error.message);
  }
}

function initDatabase() {
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
        console.log("Database initialized successfully.");
        // Add hasVeggieSide column if it doesn't exist (for existing databases)
        db.run(
          "ALTER TABLE meals ADD COLUMN hasVeggieSide INTEGER DEFAULT 0",
          (err) => {
            if (err && !err.message.includes("duplicate column name")) {
              console.error("Error adding hasVeggieSide column:", err.message);
            } else {
              // Load prep instructions and meals from text files after database is ready
              loadPrepInstructions();
              parseMealsFile();
            }
          }
        );
      }
    }
  );
}

// Routes
app.get("/api/meals", (req, res) => {
  db.all("SELECT * FROM meals ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    const meals = rows.map((row) => ({
      id: row.id,
      title: row.title,
      ingredients: JSON.parse(row.ingredients),
      hasVeggieSide: Boolean(row.hasVeggieSide),
      created_at: row.created_at,
    }));

    res.json(meals);
  });
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
        name: (ingredient.name || ingredient.ingredient || "").toLowerCase(),
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
        name: (ingredient.name || ingredient.ingredient || "").toLowerCase(),
      };
    })
    .filter((ingredient) => ingredient.name);

  const ingredientsJson = JSON.stringify(normalizedIngredients);

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
        ingredients: normalizedIngredients,
        hasVeggieSide,
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

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  // Serve static files with proper MIME types
  app.use(
    express.static(path.join(__dirname, "../dist"), {
      setHeaders: (res, path) => {
        if (path.endsWith(".js")) {
          res.setHeader("Content-Type", "application/javascript");
        } else if (path.endsWith(".css")) {
          res.setHeader("Content-Type", "text/css");
        }
      },
    })
  );

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
} else {
  // In development, only handle API routes
  app.get("/", (req, res) => {
    res.json({ message: "MealPrep API Server" });
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  db.close((err) => {
    if (err) {
      console.error("Error closing database:", err.message);
    } else {
      console.log("Database connection closed.");
    }
    process.exit(0);
  });
});
