import { writeFileSync } from "node:fs";

// The Pages deploy step commits a built index.html to the repo root.
// Restore the Vite entry before every build so CI doesn't break.
writeFileSync(
  "index.html",
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MealPrep - Plan Your Meals</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
);
