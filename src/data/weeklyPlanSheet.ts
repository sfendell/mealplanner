import { SHEET_ID, THIS_WEEK_TAB } from "../config";
import { clearStoredAccessToken } from "../lib/googleAuth";
import type { WeeklyPlanDay } from "../types";
import { loadSheetRows, primeSheetRows, readCachedRows } from "./googleSheets";

type SheetMeta = {
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
    };
  }>;
};

async function sheetsFetch(
  accessToken: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    }
  );

  if (response.status === 401) {
    clearStoredAccessToken();
    throw new Error("Google session expired. Sign in again and retry.");
  }

  return response;
}

let thisWeekSheetExists = false;

async function ensureThisWeekSheet(accessToken: string): Promise<void> {
  if (thisWeekSheetExists) return;
  const metaRes = await sheetsFetch(accessToken, "?fields=sheets.properties");
  if (!metaRes.ok) {
    throw new Error(
      `Could not read spreadsheet metadata (${metaRes.status}). Make sure you're signed in as an editor of the MealPrep sheet.`
    );
  }

  const meta = (await metaRes.json()) as SheetMeta;
  const exists = (meta.sheets || []).some(
    (sheet) => sheet.properties?.title === THIS_WEEK_TAB
  );
  if (exists) {
    thisWeekSheetExists = true;
    return;
  }

  const createRes = await sheetsFetch(accessToken, ":batchUpdate", {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: THIS_WEEK_TAB,
            },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const details = await createRes.text();
    throw new Error(`Could not create "${THIS_WEEK_TAB}" tab: ${details}`);
  }
  thisWeekSheetExists = true;
}

function normalizeMealValue(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (!value) return "";
  if (value === "eat out" || value === "eatout") return "eatout";
  if (value === "leftovers" || value === "leftover") return "leftovers";
  return value;
}

function mealLabelForSheet(meal: string): string {
  if (!meal) return "";
  if (meal === "eatout") return "Eat Out";
  if (meal === "leftovers") return "Leftovers";
  return meal;
}

function parseThisWeek(rows: string[][]): WeeklyPlanDay[] {
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  // Reject accidental Meals-tab fallback (gviz sometimes returns first sheet)
  if (header.includes("ingredient") || header.includes("title")) {
    return [];
  }

  const dateIdx = header.findIndex((h) => h === "date");
  const dayIdx = header.findIndex((h) => h === "day");
  const mealIdx = header.findIndex((h) => h === "meal");

  if (dateIdx === -1 || mealIdx === -1) {
    return [];
  }

  return rows
    .slice(1)
    .map((row) => {
      const date = (row[dateIdx] || "").trim();
      const day = (dayIdx >= 0 ? row[dayIdx] || "" : "").trim().toLowerCase();
      const meal = normalizeMealValue(row[mealIdx] || "");
      if (!date && !meal) return null;
      return { date, day, meal } as WeeklyPlanDay;
    })
    .filter(Boolean) as WeeklyPlanDay[];
}

export async function fetchThisWeekPlan(options?: {
  fresh?: boolean;
}): Promise<WeeklyPlanDay[]> {
  try {
    return parseThisWeek(await loadSheetRows(THIS_WEEK_TAB, options));
  } catch {
    // Tab may not exist yet
    return [];
  }
}

/** Last plan loaded on this device, or null if none is cached. */
export function cachedThisWeekPlan(): WeeklyPlanDay[] | null {
  const rows = readCachedRows(THIS_WEEK_TAB);
  return rows ? parseThisWeek(rows) : null;
}

export async function saveThisWeekPlan(
  accessToken: string,
  days: WeeklyPlanDay[]
): Promise<void> {
  await ensureThisWeekSheet(accessToken);

  const values = [
    ["Date", "Day", "Meal"],
    ...days.map((day) => [
      day.date,
      day.day,
      mealLabelForSheet(day.meal),
    ]),
  ];

  const range = encodeURIComponent(`'${THIS_WEEK_TAB}'!A:C`);
  const clearRes = await sheetsFetch(accessToken, `/values/${range}:clear`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!clearRes.ok) {
    const details = await clearRes.text();
    throw new Error(`Failed to clear "${THIS_WEEK_TAB}": ${details}`);
  }

  const updateRes = await sheetsFetch(
    accessToken,
    `/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ values }),
    }
  );

  if (!updateRes.ok) {
    const details = await updateRes.text();
    throw new Error(`Failed to save plan: ${details}`);
  }

  primeSheetRows(THIS_WEEK_TAB, values);
}

/** Map a plan meal string to a MealList select value (id or special). */
export function planMealToSelectValue(
  meal: string,
  mealsByTitle: Map<string, string>
): string {
  if (!meal) return "";
  if (meal === "eatout" || meal === "leftovers") return meal;
  return mealsByTitle.get(meal) || meal;
}

/** Map a select value back to a sheet meal string. */
export function selectValueToPlanMeal(
  value: string,
  mealsMap: Map<string, { title: string }>
): string {
  if (!value) return "";
  if (value === "eatout" || value === "leftovers") return value;
  const meal = mealsMap.get(value);
  return meal ? meal.title.toLowerCase() : value.toLowerCase();
}
