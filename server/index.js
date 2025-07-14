// Load environment variables based on NODE_ENV
if (process.env.NODE_ENV === "production") {
  require("dotenv").config({ path: ".env.production" });
} else if (process.env.NODE_ENV === "local") {
  require("dotenv").config({ path: ".env.local" });
} else {
  // Fallback for development
  require("dotenv").config({ path: ".env.local" });
}
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");

const app = express();
const PORT = process.env.PORT || 5001;

// Set default NODE_ENV if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "local";
}

// Google Calendar API configuration
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

// OAuth 2.0 configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
// Store tokens in memory (in production, use a database)
let tokens = null;

// Initialize OAuth 2.0 client
const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Initialize Google Auth
function getAuthClient() {
  if (!tokens) {
    throw new Error("Not authenticated. Please authenticate first.");
  }

  oauth2Client.setCredentials(tokens);
  return oauth2Client;
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

        // Always update/insert the meal (overwrite if exists)
        const ingredientsJson = JSON.stringify(ingredients);
        if (!row) {
          // Meal doesn't exist, insert it
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
          // Meal exists, update it
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

// OAuth Routes
app.get("/auth/google", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent screen to get refresh token
  });
  res.redirect(authUrl);
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens: newTokens } = await oauth2Client.getToken(code);
    tokens = newTokens;

    // Store tokens (in production, save to database)
    console.log("Authentication successful!");

    // Redirect to auth page with success parameter
    res.redirect("/auth.html?success=true");
  } catch (error) {
    console.error("Error getting tokens:", error);
    res.redirect("/auth.html?error=true");
  }
});

app.get("/auth/status", (req, res) => {
  res.json({
    authenticated: !!tokens,
    hasRefreshToken: !!(tokens && tokens.refresh_token),
  });
});

app.get("/auth", (req, res) => {
  res.sendFile(path.join(__dirname, "../auth.html"));
});

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

// Google Calendar API route
app.post("/api/calendar", async (req, res) => {
  try {
    const { events, shoppingList, veggieCount, planType, startDay, endDay } =
      req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ error: "Invalid events data" });
    }

    const auth = getAuthClient();
    const calendar = google.calendar({ version: "v3", auth });

    const createdEvents = [];

    // Create shopping list event the day before the first planned day
    if (
      shoppingList &&
      Object.keys(shoppingList).length > 0 &&
      events.length > 0
    ) {
      const firstEventDate = new Date(events[0].date);
      const shoppingListDate = new Date(firstEventDate);
      shoppingListDate.setDate(firstEventDate.getDate() - 1); // Day before first planned day

      // Format shopping list items
      const shoppingItems = Object.values(shoppingList).sort((a, b) => {
        if (a.isBoolean && !b.isBoolean) return 1;
        if (!a.isBoolean && b.isBoolean) return -1;
        return a.ingredient.localeCompare(b.ingredient);
      });

      // Create shopping list description
      const shoppingListDescription = `
Shopping List for ${planType} (${startDay}${endDay ? ` to ${endDay}` : ""})

Ingredients:
${shoppingItems
  .map((item) => {
    if (item.isBoolean) {
      return `• ${item.ingredient}`;
    } else {
      return `• ${item.quantity ? `${item.quantity} ` : ""}${item.ingredient}`;
    }
  })
  .join("\n")}

${veggieCount > 0 ? `Total Veggie Sides Needed: ${veggieCount}` : ""}

Generated by MealPrep App
      `.trim();

      // Get the date in the user's timezone
      const userTimezone = events[0].timezone || "America/New_York";
      const userDateString = shoppingListDate.toLocaleDateString("en-CA", {
        timeZone: userTimezone,
      });

      // Create shopping list event at 9 AM
      const shoppingListEvent = {
        summary: "🛒 Shopping List - MealPrep",
        description: shoppingListDescription,
        start: {
          dateTime: `${userDateString}T09:00:00`,
          timeZone: userTimezone,
        },
        end: {
          dateTime: `${userDateString}T10:00:00`,
          timeZone: userTimezone,
        },
        attendees: events[0].attendees.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 60 }, // 1 hour before
          ],
        },
      };

      const shoppingResponse = await calendar.events.insert({
        calendarId: "primary",
        resource: shoppingListEvent,
        sendUpdates: "all",
      });

      createdEvents.push({
        id: shoppingResponse.data.id,
        title: shoppingResponse.data.summary,
        date: shoppingResponse.data.start.dateTime,
        attendees: events[0].attendees,
        htmlLink: shoppingResponse.data.htmlLink,
        shareableLink: `https://calendar.google.com/calendar/event?eid=${Buffer.from(
          shoppingResponse.data.id
        ).toString("base64")}`,
      });
    }

    // Create meal prep events
    for (const event of events) {
      const {
        title,
        date,
        attendees,
        description = "",
        timezone = "America/New_York",
      } = event;

      // Convert date string to Date object
      const eventDate = new Date(date);

      // Get the date in the user's timezone
      const userDateString = eventDate.toLocaleDateString("en-CA", {
        timeZone: timezone,
      });

      // Create ISO string with timezone offset for 6 PM
      const startDateTime = `${userDateString}T18:00:00`;
      const endDateTime = `${userDateString}T19:00:00`;

      const calendarEvent = {
        summary: title,
        description: description,
        start: {
          dateTime: startDateTime,
          timeZone: timezone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: timezone,
        },
        attendees: attendees.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 1 day before
            { method: "popup", minutes: 30 }, // 30 minutes before
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: calendarEvent,
        sendUpdates: "all", // Send emails to all attendees
      });

      createdEvents.push({
        id: response.data.id,
        title: response.data.summary,
        date: response.data.start.dateTime,
        attendees: attendees, // Keep track of intended attendees
        htmlLink: response.data.htmlLink,
        // Generate shareable link for manual sharing
        shareableLink: `https://calendar.google.com/calendar/event?eid=${Buffer.from(
          response.data.id
        ).toString("base64")}`,
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully created ${createdEvents.length} calendar events and sent emails to all attendees.`,
      events: createdEvents,
    });
  } catch (error) {
    console.error("Google Calendar API Error:", error);
    res.status(500).json({
      error: "Failed to create calendar events",
      details: error.message,
    });
  }
});

if (process.env.NODE_ENV === "production") {
  // Serve static files with proper MIME types in production
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
    res.json({
      message: "MealPrep API Server",
      note: "In development, access the frontend at http://localhost:5173, not this server",
    });
  });

  // Catch any non-API routes and redirect to Vite dev server
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.status(404).json({
        error: "Not found",
        message: "In development, access the frontend at http://localhost:5173",
        apiRoutes: "API routes are available at /api/*",
      });
    }
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
