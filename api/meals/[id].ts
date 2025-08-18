import type { VercelRequest, VercelResponse } from "@vercel/node";
import sqlite3 from "sqlite3";
import path from "path";

// Initialize database
function getDatabase() {
  const dbPath =
    process.env.DATABASE_URL || path.join(process.cwd(), "meals.db");
  return new sqlite3.Database(dbPath);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    res.status(400).json({ message: "Meal ID is required" });
    return;
  }

  try {
    const db = getDatabase();

    if (req.method === "GET") {
      // Get specific meal
      db.get("SELECT * FROM meals WHERE id = ?", [id], (err, row) => {
        if (err) {
          console.error("Database error:", err);
          res.status(500).json({ message: "Database error" });
          return;
        }

        if (!row) {
          res.status(404).json({ message: "Meal not found" });
          return;
        }

        try {
          const ingredients = JSON.parse(row.ingredients);
          res.status(200).json({
            id: row.id,
            title: row.title,
            ingredients: ingredients,
            hasVeggieSide: Boolean(row.hasVeggieSide),
          });
        } catch (parseError) {
          console.error("Error parsing ingredients for meal:", id, parseError);
          res.status(500).json({ message: "Error parsing meal data" });
        }
      });
    } else if (req.method === "PUT") {
      // Update meal
      const { title, ingredients, hasVeggieSide } = req.body;

      if (!title || !ingredients || ingredients.length === 0) {
        res.status(400).json({ message: "Title and ingredients are required" });
        return;
      }

      const ingredientsJson = JSON.stringify(ingredients);

      db.run(
        "UPDATE meals SET title = ?, ingredients = ?, hasVeggieSide = ? WHERE id = ?",
        [title.toLowerCase(), ingredientsJson, hasVeggieSide ? 1 : 0, id],
        function (err) {
          if (err) {
            console.error("Database error:", err);
            res.status(500).json({ message: "Database error" });
            return;
          }

          if (this.changes === 0) {
            res.status(404).json({ message: "Meal not found" });
            return;
          }

          res.status(200).json({
            id: id,
            title: title.toLowerCase(),
            ingredients: ingredients,
            hasVeggieSide: hasVeggieSide,
          });
        }
      );
    } else if (req.method === "DELETE") {
      // Delete meal
      db.run("DELETE FROM meals WHERE id = ?", [id], function (err) {
        if (err) {
          console.error("Database error:", err);
          res.status(500).json({ message: "Database error" });
          return;
        }

        if (this.changes === 0) {
          res.status(404).json({ message: "Meal not found" });
          return;
        }

        res.status(200).json({ message: "Meal deleted successfully" });
      });
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
