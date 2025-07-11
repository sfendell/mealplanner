import React, { useState, useEffect } from "react";
import { toTitleCase } from "../utils/format";
import { DAY_NAMES } from "../constants";

const PrepCalendar = ({ selectedMeals, prepInstructions, mealsMap, days }) => {
  const [prepWork, setPrepWork] = useState({});

  useEffect(() => {
    if (!selectedMeals || !prepInstructions || !mealsMap || !days) return;

    const work = {};

    // Initialize each day with empty prep work
    days.forEach(({ key, label }) => {
      work[key] = [];
    });

    // Process each selected meal
    Object.entries(selectedMeals).forEach(([day, mealId]) => {
      if (!mealId) return;

      const meal = mealsMap.get(mealId);
      if (!meal) return;

      // Ensure work[day] exists
      if (!work[day]) {
        work[day] = [];
      }

      // Check for meal-specific prep instructions first
      const mealPrepInstruction = findPrepInstruction(
        meal.title,
        prepInstructions
      );
      if (mealPrepInstruction) {
        work[day].push(mealPrepInstruction);
      }

      // Extract ingredients from the meal
      const ingredients = meal.ingredients || [];

      ingredients.forEach((ingredient) => {
        const ingredientText = ingredient.name;
        if (!ingredientText) return;

        // Find matching prep instruction for ingredient
        const prepInstruction = findPrepInstruction(
          ingredientText,
          prepInstructions
        );
        if (prepInstruction) {
          work[day].push(prepInstruction);
        }
      });
    });

    // Remove duplicates from each day
    Object.keys(work).forEach((day) => {
      work[day] = [...new Set(work[day])];
    });

    setPrepWork(work);
  }, [selectedMeals, prepInstructions, days]);

  const findPrepInstruction = (ingredient, instructions) => {
    const lowerIngredient = ingredient.toLowerCase();

    // Try exact match first
    if (instructions[lowerIngredient]) {
      return instructions[lowerIngredient];
    }

    // Try partial matches
    for (const [key, instruction] of Object.entries(instructions)) {
      if (lowerIngredient.includes(key) || key.includes(lowerIngredient)) {
        return instruction;
      }
    }

    return null;
  };

  if (!days) return null;

  return (
    <div className="prep-calendar">
      <h3>Prep Work Calendar</h3>
      <div className="calendar-grid">
        {days.map(({ key, label, date }) => (
          <div key={key} className="calendar-day">
            <h4>{label}</h4>
            {date && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#666",
                  marginBottom: "5px",
                }}
              >
                {date.toLocaleDateString()}
              </div>
            )}
            <div className="prep-list">
              {prepWork[key] && prepWork[key].length > 0 ? (
                prepWork[key].map((task, index) => (
                  <div key={index} className="prep-task">
                    • {toTitleCase(task)}
                  </div>
                ))
              ) : (
                <div className="no-prep">No prep needed</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PrepCalendar;
