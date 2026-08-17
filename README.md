# MealPrep

Static meal planning app on GitHub Pages. Meals and prep steps are loaded live from a Google Sheet.

## Spreadsheet

[Open MealPrep sheet](https://docs.google.com/spreadsheets/d/1ieWSYc-IB0ic1dz1Mv0lvyp1dobNyvCNGqIWf92AoEw/edit)

Tabs:
- **Meals** — columns: `Title`, `Quantity`, `Ingredient`, `Has Veggie Side` (one row per ingredient; set veggie side on the first row of a meal)
- **Prep** — columns: `Key`, `Instruction`

Edit the sheet, then hit **Refresh** in the app (or reload the page).

## Local development

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` deploy to GitHub Pages via GitHub Actions.

Site: https://sfendell.github.io/mealplanner/
