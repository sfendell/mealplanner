const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Initialize database
const dbPath = path.join(process.cwd(), "meals.db");
const db = new sqlite3.Database(dbPath);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const { id } = req.query;
  const { method } = req;

  switch (method) {
    case "PUT":
      // Update meal
      const { title, ingredients, hasVeggieSide } = req.body;

      if (!title || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: "Invalid meal data" });
      }

      const ingredientsJson = JSON.stringify(ingredients);

      db.run(
        "UPDATE meals SET title = ?, ingredients = ?, hasVeggieSide = ? WHERE id = ?",
        [title, ingredientsJson, hasVeggieSide ? 1 : 0, id],
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
            title,
            ingredients,
            hasVeggieSide,
            updated_at: new Date().toISOString(),
          });
        }
      );
      break;

    case "DELETE":
      // Delete meal
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
      break;

    default:
      res.setHeader("Allow", ["PUT", "DELETE"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
