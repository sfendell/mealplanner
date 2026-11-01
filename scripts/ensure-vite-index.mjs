import { readFileSync, writeFileSync } from "node:fs";

// The Pages deploy step commits a built index.html to the repo root.
// Restore the Vite entry before every build so CI doesn't break.

const config = readFileSync("src/config.ts", "utf8");
const sheetId = /SHEET_ID\s*=\s*"([^"]+)"/.exec(config)?.[1];
if (!sheetId) {
  throw new Error("Could not find SHEET_ID in src/config.ts");
}

// Keep in sync with the tabs prefetched in src/data/googleSheets.ts.
const tabs = ["Meals", "Prep", "This Week"];
const preloads = tabs
  .map(
    (tab) =>
      `    <link rel="preload" as="fetch" crossorigin="anonymous" href="https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&amp;sheet=${encodeURIComponent(
        tab
      )}&amp;headers=1" />`
  )
  .join("\n");

writeFileSync(
  "index.html",
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MealPrep - Plan Your Meals</title>
    <link rel="preconnect" href="https://docs.google.com" crossorigin="anonymous" />
${preloads}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`
);
