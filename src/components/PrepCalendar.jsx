import React, { useState, useEffect } from "react";
import { toTitleCase } from "../utils/format";

const PrepCalendar = ({ selectedMeals, prepInstructions }) => {
  const [prepWork, setPrepWork] = useState({});

  useEffect(() => {
    if (!selectedMeals || !prepInstructions) return;

    const work = {};
    const days = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    // Initialize each day with empty prep work
    days.forEach((day) => {
      work[day] = [];
    });

    // Process each selected meal
    Object.entries(selectedMeals).forEach(([day, mealId]) => {
      if (!mealId) return;

      const meal = selectedMeals[mealId];
      if (!meal) return;

      // Extract ingredients from the meal
      const ingredients = meal.ingredients || [];

      ingredients.forEach((ingredient) => {
        const ingredientText =
          typeof ingredient === "string"
            ? ingredient
            : ingredient.name || ingredient.ingredient;
        if (!ingredientText) return;

        // Find matching prep instruction
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
  }, [selectedMeals, prepInstructions]);

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

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  return (
    <div className="prep-calendar">
      <h3>Prep Work Calendar</h3>
      <div className="calendar-grid">
        {days.map((day) => (
          <div key={day} className="calendar-day">
            <h4>{day}</h4>
            <div className="prep-list">
              {prepWork[day] && prepWork[day].length > 0 ? (
                prepWork[day].map((task, index) => (
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
