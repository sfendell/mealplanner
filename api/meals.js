const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Initialize database
const dbPath = path.join(process.cwd(), "meals.db");
const db = new sqlite3.Database(dbPath);

// Initialize table
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
    }
  }
);

export default async function handler(req, res) {
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

  const { method } = req;

  switch (method) {
    case "GET":
      // Get all meals
      db.all(
        "SELECT * FROM meals ORDER BY created_at DESC",
        [],
        (err, rows) => {
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
        }
      );
      break;

    case "POST":
      // Create new meal
      const { title, ingredients, hasVeggieSide } = req.body;

      if (!title || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: "Invalid meal data" });
      }

      const ingredientsJson = JSON.stringify(ingredients);

      db.run(
        "INSERT INTO meals (title, ingredients, hasVeggieSide) VALUES (?, ?, ?)",
        [title, ingredientsJson, hasVeggieSide ? 1 : 0],
        function (err) {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }

          res.status(201).json({
            id: this.lastID,
            title,
            ingredients,
            hasVeggieSide: Boolean(hasVeggieSide),
            created_at: new Date().toISOString(),
          });
        }
      );
      break;

    default:
      res.setHeader("Allow", ["GET", "POST"]);
      res.status(405).end(`Method ${method} Not Allowed`);
  }
}
