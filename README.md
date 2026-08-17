# MealPrep

Static meal planning app on GitHub Pages. Meals and prep steps are loaded live from a Google Sheet.

## Spreadsheet

[Open MealPrep sheet](https://docs.google.com/spreadsheets/d/1ieWSYc-IB0ic1dz1Mv0lvyp1dobNyvCNGqIWf92AoEw/edit)

Tabs:
- **Meals** — columns: `Title`, `Quantity`, `Ingredient`, `Has Veggie Side` (one row per ingredient; set veggie side on the first row of a meal)
- **Prep** — columns: `Key`, `Instruction`

Edit the sheet, then hit **Refresh** in the app (or reload the page).

## Calendar invites

The app creates Google Calendar events and emails attendees (same behavior as before, but entirely in the browser).

1. In [Google Cloud Console](https://console.cloud.google.com/), enable **Google Calendar API**
2. Create an **OAuth client ID** → Application type **Web application**
3. Add authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://sfendell.github.io`
4. Put the client ID in `.env` (local) / GitHub Actions secrets (deploy):

```bash
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

Or paste it into `GOOGLE_CLIENT_ID` in `src/config.ts`.

On the OAuth consent screen, add yourself (and anyone else who will click Send) as a test user if the app is in Testing mode.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` deploy to GitHub Pages via GitHub Actions.

For calendar invites in production, set repository secret `VITE_GOOGLE_CLIENT_ID` and pass it into the build step (see workflow), or hardcode the client ID in `src/config.ts`.

Site: https://sfendell.github.io/mealplanner/
