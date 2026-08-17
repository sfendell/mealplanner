import type { Ingredient, Meal } from "../types";
import { MEALS_TAB, PREP_TAB, SHEET_ID } from "../config";

type GvizCell = { v?: string | number | boolean | null; f?: string };
type GvizRow = { c: Array<GvizCell | null> };
type GvizResponse = {
  table?: {
    cols?: Array<{ label?: string }>;
    rows?: GvizRow[];
  };
};

function cellValue(cell: GvizCell | null | undefined): string {
  if (!cell) return "";
  if (cell.v === null || cell.v === undefined) return "";
  return String(cell.v).trim();
}

// gviz uses a single global callback; serialize loads so tabs don't race.
let sheetLoadChain: Promise<unknown> = Promise.resolve();

function loadSheetViaGviz(sheetName: string): Promise<string[][]> {
  const run = () =>
    new Promise<string[][]>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error(`Timed out loading sheet "${sheetName}"`));
      }, 15000);

      const previousGoogle = (window as unknown as { google?: unknown }).google;

      const cleanup = () => {
        window.clearTimeout(timeout);
        script.remove();
        if (previousGoogle === undefined) {
          delete (window as unknown as { google?: unknown }).google;
        } else {
          (window as unknown as { google: unknown }).google = previousGoogle;
        }
      };

      (window as unknown as { google: unknown }).google = {
        visualization: {
          Query: {
            setResponse: (response: GvizResponse) => {
              try {
                const rows = response.table?.rows ?? [];
                const cols = response.table?.cols ?? [];
                const header = cols.map((col) => (col.label || "").trim());
                const data = rows.map((row) =>
                  (row.c || []).map((cell) => cellValue(cell))
                );
                resolve([header, ...data]);
                cleanup();
              } catch (error) {
                cleanup();
                reject(error);
              }
            },
          },
        },
      };

      const script = document.createElement("script");
      script.onerror = () => {
        cleanup();
        reject(new Error(`Failed to load sheet "${sheetName}"`));
      };
      script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
        sheetName
      )}&headers=1`;
      document.body.appendChild(script);
    });

  const result = sheetLoadChain.then(run, run);
  sheetLoadChain = result.then(
    () => undefined,
    () => undefined
  );
  return result;
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

function truthy(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "yes" || v === "1" || v === "y";
}

export async function fetchMealsFromSheet(): Promise<Meal[]> {
  const rows = await loadSheetViaGviz(MEALS_TAB);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.toLowerCase());
  const titleIdx = header.findIndex((h) => h === "title" || h === "meal");
  const qtyIdx = header.findIndex((h) => h === "quantity" || h === "qty");
  const ingredientIdx = header.findIndex(
    (h) => h === "ingredient" || h === "ingredients"
  );
  const veggieIdx = header.findIndex(
    (h) =>
      h === "has veggie side" ||
      h === "veggie side" ||
      h === "hasveggieside"
  );

  if (titleIdx === -1 || ingredientIdx === -1) {
    throw new Error(
      'Meals sheet needs "Title" and "Ingredient" columns (optional: Quantity, Has Veggie Side)'
    );
  }

  const byTitle = new Map<
    string,
    { ingredients: Ingredient[]; hasVeggieSide: boolean }
  >();

  for (const row of rows.slice(1)) {
    const title = (row[titleIdx] || "").trim().toLowerCase();
    if (!title) continue;

    const ingredient = parseIngredientLine(
      qtyIdx >= 0 ? row[qtyIdx] || "" : "",
      row[ingredientIdx] || ""
    );

    const existing = byTitle.get(title) || {
      ingredients: [],
      hasVeggieSide: false,
    };

    if (veggieIdx >= 0 && row[veggieIdx]) {
      existing.hasVeggieSide =
        existing.hasVeggieSide || truthy(row[veggieIdx]);
    }

    if (ingredient) {
      existing.ingredients.push(ingredient);
    }

    byTitle.set(title, existing);
  }

  const meals: Meal[] = Array.from(byTitle.entries()).map(
    ([title, data], index) => ({
      id: String(index + 1),
      title,
      ingredients: data.ingredients,
      hasVeggieSide: data.hasVeggieSide,
    })
  );

  return meals.sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchPrepFromSheet(): Promise<Record<string, string>> {
  const rows = await loadSheetViaGviz(PREP_TAB);
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

export function mealsToMap(meals: Meal[]): Map<string, Meal> {
  return new Map(meals.map((meal) => [meal.id, meal]));
}
