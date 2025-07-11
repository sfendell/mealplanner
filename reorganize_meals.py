#!/usr/bin/env python3


def reorganize_meal(meal_block):
    """Reorganize a single meal block"""
    lines = meal_block.strip().split("\n")
    if not lines:
        return meal_block

    title = lines[0]
    ingredients = lines[1:]

    # Separate ingredients with and without quantities
    with_quantities = []
    without_quantities = []

    for ingredient in ingredients:
        ingredient = ingredient.strip()
        if not ingredient:
            continue

        # Check if ingredient starts with a number
        if ingredient[0].isdigit():
            with_quantities.append(ingredient)
        else:
            without_quantities.append(ingredient)

    # Sort both lists alphabetically by ingredient name (after quantity)
    def get_ingredient_name(ingredient):
        # Remove quantity and get just the ingredient name
        parts = ingredient.split(" ", 1)
        if len(parts) > 1:
            return parts[1].lower()
        return ingredient.lower()

    with_quantities.sort(key=get_ingredient_name)
    without_quantities.sort(key=lambda x: x.lower())

    # Combine: title, ingredients with quantities, then ingredients without quantities
    result = [title]
    result.extend(with_quantities)
    result.extend(without_quantities)

    return "\n".join(result)


def main():
    # Read the meals file
    with open("meals.txt", "r") as f:
        content = f.read()

    # Split into meal blocks (separated by double newlines)
    meal_blocks = content.split("\n\n")

    # Reorganize each meal block
    reorganized_blocks = []
    for block in meal_blocks:
        if block.strip():
            reorganized = reorganize_meal(block)
            reorganized_blocks.append(reorganized)

    # Write back to file
    with open("meals.txt", "w") as f:
        f.write("\n\n".join(reorganized_blocks))

    print("✅ Meals reorganized successfully!")
    print("📋 Each meal now has:")
    print("   - Ingredients with quantities (alphabetized)")
    print("   - Ingredients without quantities (alphabetized)")


if __name__ == "__main__":
    main()
