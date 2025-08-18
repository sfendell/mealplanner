import type { VercelRequest, VercelResponse } from "@vercel/node";
import sqlite3 from "sqlite3";
import path from "path";

// Initialize database
function getDatabase() {
  const dbPath =
    process.env.DATABASE_URL || path.join(process.cwd(), "meals.db");
  return new sqlite3.Database(dbPath);
}

// Initialize database tables
function initDatabase() {
  const db = getDatabase();

  db.serialize(() => {
    // Create meals table
    db.run(`
      CREATE TABLE IF NOT EXISTS meals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        hasVeggieSide BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create prep_instructions table
    db.run(`
      CREATE TABLE IF NOT EXISTS prep_instructions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_id TEXT,
        instruction TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meal_id) REFERENCES meals (id)
      )
    `);
  });

  return db;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const db = initDatabase();

    if (req.method === "GET") {
      // Get all meals
      db.all("SELECT * FROM meals ORDER BY title", (err, rows) => {
        if (err) {
          console.error("Database error:", err);
          res.status(500).json({ message: "Database error" });
          return;
        }

        const mealsMap = new Map();
        rows.forEach((row) => {
          try {
            const ingredients = JSON.parse(row.ingredients);
            mealsMap.set(row.id, {
              id: row.id,
              title: row.title,
              ingredients: ingredients,
              hasVeggieSide: Boolean(row.hasVeggieSide),
            });
          } catch (parseError) {
            console.error(
              "Error parsing ingredients for meal:",
              row.id,
              parseError
            );
          }
        });

        res.status(200).json(Array.from(mealsMap.values()));
      });
    } else if (req.method === "POST") {
      // Create new meal
      const { title, ingredients, hasVeggieSide } = req.body;

      if (!title || !ingredients || ingredients.length === 0) {
        res.status(400).json({ message: "Title and ingredients are required" });
        return;
      }

      const mealId = `meal_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const ingredientsJson = JSON.stringify(ingredients);

      db.run(
        "INSERT INTO meals (id, title, ingredients, hasVeggieSide) VALUES (?, ?, ?, ?)",
        [mealId, title.toLowerCase(), ingredientsJson, hasVeggieSide ? 1 : 0],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            res.status(500).json({ message: "Database error" });
            return;
          }

          res.status(201).json({
            id: mealId,
            title: title.toLowerCase(),
            ingredients: ingredients,
            hasVeggieSide: hasVeggieSide,
          });
        }
      );
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
