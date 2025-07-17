#!/usr/bin/env python3
"""
Script to alphabetize meals.txt file.
Alphabetizes meals by title and ingredients by name.
Keeps quantified and unquantified ingredients separate.
"""

import re
import sys
from typing import List, Tuple


def parse_meals_file(filename: str) -> List[Tuple[str, List[str]]]:
    """
    Parses the meals.txt file and returns a list of (meal_title, ingredients).
    """
    meals = []
    current_meal = None
    current_ingredients: List[str] = []
    try:
        with open(filename, "r", encoding="utf-8") as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: {filename} not found")
        return []

    for line in lines:
        line = line.strip()
        if not line:
            # Empty line - save current meal if exists
            if current_meal and current_ingredients:
                meals.append((current_meal, current_ingredients))
                current_meal = None
                current_ingredients = []
            continue

        # Check if this line is a meal title (no quantity pattern)
        if not re.match(r"^\d", line) and not re.match(r"^[a-zA-Z]", line):
            # This might be a meal title
            if current_meal and current_ingredients:
                meals.append((current_meal, current_ingredients))
            current_meal = line
            current_ingredients = []
        else:
            # This is an ingredient
            if current_meal:
                current_ingredients.append(line)

    # Dont forget the last meal
    if current_meal and current_ingredients:
        meals.append((current_meal, current_ingredients))

    return meals


def sort_ingredients(ingredients: List[str]) -> List[str]:
    """
    Sorts ingredients, keeping quantified and unquantified separate.
    """
    quantified = []
    unquantified = []

    for ingredient in ingredients:
        # Check if ingredient has a quantity (starts with number)
        if re.match(r"^\d", ingredient):
            quantified.append(ingredient)
        else:
            unquantified.append(ingredient)

    # Sort each group alphabetically by ingredient name
    def get_ingredient_name(ingredient):
        # Extract ingredient name (remove quantity)
        match = re.match(r"^(\d+(?:\/\d+)?(?:\s*-\s*\d+)?)\s+(.+)$", ingredient)
        if match:
            return match.group(2)
        return ingredient.lower()

    quantified.sort(key=get_ingredient_name)
    unquantified.sort(key=lambda x: x.lower())

    # Return quantified first, then unquantified
    return quantified + unquantified


def write_meals_file(filename: str, meals: List[Tuple[str, List[str]]]):
    """
    Writes the alphabetized meals back to the file.
    """
    with open(filename, "w", encoding="utf-8") as f:
        for i, (meal_title, ingredients) in enumerate(meals):
            f.write(f"{meal_title}\n")
            for ingredient in ingredients:
                f.write(f"{ingredient}\n")
            # Add empty line between meals (except after last meal)
            if i < len(meals) - 1:
                f.write("\n")


def main():
    filename = "meals.txt"
    # Parse meals
    meals = parse_meals_file(filename)
    if not meals:
        print("No meals found or file is empty")
        return

    print(f"Found {len(meals)} meals")
    # Sort meals alphabetically by title
    meals.sort(key=lambda x: x[0].lower())

    # Sort ingredients for each meal
    for i, (meal_title, ingredients) in enumerate(meals):
        meals[i] = (meal_title, sort_ingredients(ingredients))

    # Write back to file
    write_meals_file(filename, meals)

    print(f"✅ Successfully alphabetized {len(meals)} meals in {filename}")
    print("📝 Meals are now sorted alphabetically")
    print("🥕 Ingredients are sorted (quantified first, then unquantified)")


if __name__ == "__main__":
    main()
