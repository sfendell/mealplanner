import React from "react";
import { toTitleCase } from "../utils/format";
import type { Meal } from "../types";

function MealList({ mealsMap }: { mealsMap: Map<string, Meal> }) {
  const meals = Array.from(mealsMap.values());

  if (meals.length === 0) {
    return (
      <div className="empty-state">
        <h3>No meals yet</h3>
        <p>Add meals to meals.txt and redeploy.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>My Meals</h2>
      <div>
        {meals.map((meal) => (
          <div key={meal.id} className="meal-card">
            <div className="meal-title">{toTitleCase(meal.title)}</div>
            <div>
              {meal.ingredients.map((ingredient, index) => (
                <div key={index} className="ingredient">
                  {ingredient.quantity && (
                    <span className="ingredient-quantity">
                      {ingredient.quantity}
                    </span>
                  )}
                  <span>{toTitleCase(ingredient.name)}</span>
                </div>
              ))}
            </div>
            {meal.hasVeggieSide && (
              <div style={{ marginTop: "10px" }}>
                <span className="veggie-badge">Veggie Side</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MealList;
