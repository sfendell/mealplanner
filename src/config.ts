/** Google Sheet that backs meals + prep instructions. */
export const SHEET_ID = "1ieWSYc-IB0ic1dz1Mv0lvyp1dobNyvCNGqIWf92AoEw";

export const SHEET_EDIT_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

export const MEALS_TAB = "Meals";
export const PREP_TAB = "Prep";
export const THIS_WEEK_TAB = "This Week";

/**
 * OAuth 2.0 Web Client ID from Google Cloud Console.
 * Override with VITE_GOOGLE_CLIENT_ID in a .env file if preferred.
 *
 * Authorized JavaScript origins should include:
 * - http://localhost:5173
 * - https://sfendell.github.io
 *
 * Enable Google Sheets API and add scope:
 * https://www.googleapis.com/auth/spreadsheets
 */
export const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "483762291574-2gmg3ro0u50dbr3qu69l67o8091hoboi.apps.googleusercontent.com";

export const GOOGLE_SHEETS_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets";
