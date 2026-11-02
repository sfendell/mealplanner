import type { Ingredient, Meal } from "../types";
import { MEALS_TAB, PREP_TAB, SHEET_ID, THIS_WEEK_TAB } from "../config";

type GvizCell = { v?: string | number | boolean | null; f?: string };
type GvizRow = { c: Array<GvizCell | null> };
type GvizResponse = {
  status?: string;
  errors?: Array<{ detailed_message?: string; message?: string }>;
  table?: {
    cols?: Array<{ label?: string }>;
    rows?: GvizRow[];
  };
};

const CACHE_PREFIX = "mealprep_sheet_v1:";

const GVIZ_DATE = /^Date\((\d+),(\d+),(\d+)/;

function cellValue(cell: GvizCell | null | undefined): string {
  if (!cell) return "";
  if (cell.v === null || cell.v === undefined) return "";
  const raw = String(cell.v).trim();
  // gviz returns date cells as "Date(y,m,d)" with a zero-based month.
  const date = GVIZ_DATE.exec(raw);
  if (date) {
    const [, y, m, d] = date;
    return `${y}-${String(Number(m) + 1).padStart(2, "0")}-${d.padStart(
      2,
      "0"
    )}`;
  }
  return raw;
}

function parseGvizResponse(sheetName: string, text: string): string[][] {
  // The body is "/*O_o*/\ngoogle.visualization.Query.setResponse({...});"
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`Unexpected response loading sheet "${sheetName}"`);
  }
  const response = JSON.parse(text.slice(start, end + 1)) as GvizResponse;
  if (response.status === "error") {
    const detail =
      response.errors?.[0]?.detailed_message || response.errors?.[0]?.message;
    throw new Error(
      `Failed to load sheet "${sheetName}"${detail ? `: ${detail}` : ""}`
    );
  }
  const header = (response.table?.cols ?? []).map((col) =>
    (col.label || "").trim()
  );
  const data = (response.table?.rows ?? []).map((row) =>
    (row.c || []).map((cell) => cellValue(cell))
  );
  return [header, ...data];
}

async function fetchSheetRows(sheetName: string): Promise<string[][]> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(
      `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}&headers=1`,
      // Must match the <link rel="preload"> tags in index.html to reuse them.
      { signal: controller.signal }
    );
    if (!response.ok) {
      throw new Error(
        `Failed to load sheet "${sheetName}" (${response.status})`
      );
    }
    const rows = parseGvizResponse(sheetName, await response.text());
    writeCachedRows(sheetName, rows);
    return rows;
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out loading sheet "${sheetName}"`);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

const inFlight = new Map<string, Promise<string[][]>>();

/**
 * Load a tab's rows. Concurrent callers share one request; pass
 * `fresh` to start a new request even if one already finished.
 */
export function loadSheetRows(
  sheetName: string,
  { fresh = false }: { fresh?: boolean } = {}
): Promise<string[][]> {
  const existing = inFlight.get(sheetName);
  if (existing && !fresh) return existing;
  const request = fetchSheetRows(sheetName);
  inFlight.set(sheetName, request);
  request.catch(() => {
    if (inFlight.get(sheetName) === request) inFlight.delete(sheetName);
  });
  return request;
}

/** Replace a tab's loaded and cached rows, e.g. right after writing it. */
export function primeSheetRows(sheetName: string, rows: string[][]): void {
  inFlight.set(sheetName, Promise.resolve(rows));
  writeCachedRows(sheetName, rows);
}

/** Start loading every tab the app needs, before React renders. */
export function prefetchSheets(): void {
  [MEALS_TAB, PREP_TAB, THIS_WEEK_TAB].forEach((tab) => {
    loadSheetRows(tab).catch(() => undefined);
  });
}

export function readCachedRows(sheetName: string): string[][] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + sheetName);
    if (!raw) return null;
    const rows = JSON.parse(raw);
    return Array.isArray(rows) ? (rows as string[][]) : null;
  } catch {
    return null;
  }
}

export function writeCachedRows(sheetName: string, rows: string[][]): void {
  try {
    localStorage.setItem(CACHE_PREFIX + sheetName, JSON.stringify(rows));
  } catch {
    // Storage full or disabled; the network copy still works.
  }
}

function parseIngredientLine(quantity: string, name: string): Ingredient | null {
  const cleanedName = name.trim().toLowerCase();
  if (!cleanedName) return null;
  const cleanedQty = quantity.trim();
  return {
    quantity: cleanedQty || null,
    name: cleanedName,
  };
}

export function parseMeals(rows: string[][]): Meal[] {
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const titleIdx = header.findIndex((h) => h === "title" || h === "meal");
  const qtyIdx = header.findIndex((h) => h === "quantity" || h === "qty");
  const ingredientIdx = header.findIndex(
    (h) => h === "ingredient" || h === "ingredients"
  );
  if (titleIdx === -1 || ingredientIdx === -1) {
    throw new Error(
      'Meals sheet needs "Title" and "Ingredient" columns (optional: Quantity)'
    );
  }

  const byTitle = new Map<string, Ingredient[]>();

  for (const row of rows.slice(1)) {
    const title = (row[titleIdx] || "").trim().toLowerCase();
    if (!title) continue;

    const ingredient = parseIngredientLine(
      qtyIdx >= 0 ? row[qtyIdx] || "" : "",
      row[ingredientIdx] || ""
    );

    const existing = byTitle.get(title) || [];

    if (ingredient) {
      existing.push(ingredient);
    }

    byTitle.set(title, existing);
  }

  const meals: Meal[] = Array.from(byTitle.entries()).map(
    ([title, ingredients], index) => ({
      id: String(index + 1),
      title,
      ingredients,
    })
  );

  return meals.sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchMealsFromSheet(options?: {
  fresh?: boolean;
}): Promise<Meal[]> {
  return parseMeals(await loadSheetRows(MEALS_TAB, options));
}

export function parsePrep(rows: string[][]): Record<string, string> {
  if (rows.length === 0) return {};

  const header = rows[0].map((h) => h.toLowerCase());
  const keyIdx = header.findIndex(
    (h) => h === "key" || h === "ingredient" || h === "item"
  );
  const instructionIdx = header.findIndex(
    (h) => h === "instruction" || h === "instructions" || h === "prep"
  );

  if (keyIdx === -1 || instructionIdx === -1) {
    throw new Error('Prep sheet needs "Key" and "Instruction" columns');
  }

  const instructions: Record<string, string> = {};
  for (const row of rows.slice(1)) {
    const key = (row[keyIdx] || "").trim().toLowerCase();
    const instruction = (row[instructionIdx] || "").trim();
    if (key && instruction) {
      instructions[key] = instruction;
    }
  }
  return instructions;
}

export async function fetchPrepFromSheet(options?: {
  fresh?: boolean;
}): Promise<Record<string, string>> {
  return parsePrep(await loadSheetRows(PREP_TAB, options));
}

export function mealsToMap(meals: Meal[]): Map<string, Meal> {
  return new Map(meals.map((meal) => [meal.id, meal]));
}
