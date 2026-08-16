import mealsText from "../../meals.txt?raw";
import type { Ingredient, Meal } from "../types";

function parseIngredientLine(line: string): Ingredient {
  const trimmedLine = line.trim().toLowerCase();
  const quantityMatch = trimmedLine.match(
    /^(\d+(?:\/\d+)?(?:\s*-\s*\d+)?)\s+(.+)$/
  );

  if (quantityMatch) {
    return {
      quantity: quantityMatch[1],
      name: quantityMatch[2],
    };
  }

  return {
    quantity: null,
    name: trimmedLine,
  };
}

function parseMeals(text: string): Meal[] {
  const mealBlocks = text.split("\n\n").filter((block) => block.trim());
  const meals: Meal[] = [];

  mealBlocks.forEach((block, index) => {
    const lines = block.trim().split("\n");
    if (lines.length < 2) return;

    const title = lines[0].trim().toLowerCase();
    const ingredients = lines
      .slice(1)
      .map((line) => parseIngredientLine(line))
      .filter((ingredient) => ingredient.name);

    if (ingredients.length === 0) return;

    meals.push({
      id: String(index + 1),
      title,
      ingredients,
      hasVeggieSide: false,
    });
  });

  return meals.sort((a, b) => a.title.localeCompare(b.title));
}

export const meals: Meal[] = parseMeals(mealsText);

export const mealsMap: Map<string, Meal> = new Map(
  meals.map((meal) => [meal.id, meal])
);
