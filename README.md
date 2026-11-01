# MealPrep

Static meal planning app on GitHub Pages. Meals, prep steps, and this week's plan are stored in a Google Sheet.

## Spreadsheet

[Open MealPrep sheet](https://docs.google.com/spreadsheets/d/1ieWSYc-IB0ic1dz1Mv0lvyp1dobNyvCNGqIWf92AoEw/edit)

Tabs:
- **Meals** — columns: `Title`, `Quantity`, `Ingredient`, `Has Veggie Side` (one row per ingredient; set veggie side on the first row of a meal)
- **Prep** — columns: `Key`, `Instruction`
- **This Week** — columns: `Date`, `Day`, `Meal` (created automatically on first save)

## Saving this week's plan

**Build Plan** builds a shopping list / prep calendar, then **Save as This Week's Plan** writes to the sheet.

**This Week's Plan** loads that saved plan and lets you edit every day, then save again.

Saving uses Google sign-in (Sheets API), not email/calendar invites.

1. In [Google Cloud Console](https://console.cloud.google.com/), enable **Google Sheets API** (not just Calendar)
2. Create an **OAuth client ID** → Application type **Web application**
3. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://sfendell.github.io`
4. Put the client ID in GitHub Actions secret `VITE_GOOGLE_CLIENT_ID`, or in `src/config.ts`

On the OAuth consent screen, add yourself as a test user if the app is in Testing mode. Sign in with an account that can **edit** the MealPrep spreadsheet.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` deploy to GitHub Pages via GitHub Actions.

Site: https://sfendell.github.io/mealplanner/
