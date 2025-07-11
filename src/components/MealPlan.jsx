import React, { useState, useEffect } from "react";
import PrepCalendar from "./PrepCalendar";
import { toTitleCase } from "../utils/format";

function MealPlan({ mealsMap }) {
  const [weeklyPlan, setWeeklyPlan] = useState({
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  });
  const [prepInstructions, setPrepInstructions] = useState({});

  useEffect(() => {
    fetch("/api/prep")
      .then((res) => res.json())
      .then((data) => setPrepInstructions(data))
      .catch((err) => console.error("Error fetching prep instructions:", err));
  }, []);

  const days = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  const handleMealSelect = (day, mealId) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: mealId === "" ? null : mealId,
    }));
  };

  const generateShoppingList = () => {
    const shoppingList = {};
    let veggieCount = 0;

    Object.values(weeklyPlan).forEach((mealId) => {
      if (mealId) {
        const meal = mealsMap.get(mealId);
        if (meal) {
          meal.ingredients.forEach((ingredient) => {
            const ingredientName = ingredient.name || ingredient.ingredient;
            const key = ingredientName.toLowerCase();
            if (shoppingList[key]) {
              // If ingredient has a quantity, add it
              if (ingredient.quantity) {
                shoppingList[key].quantity += parseInt(ingredient.quantity);
              }
              // If no quantity, it's a boolean item - no need to increment
            } else {
              shoppingList[key] = {
                ingredient: ingredientName,
                quantity: ingredient.quantity
                  ? parseInt(ingredient.quantity)
                  : null,
                isBoolean: !ingredient.quantity, // Mark as boolean if no quantity
              };
            }
          });
          if (meal.hasVeggieSide) {
            veggieCount++;
          }
        }
      }
    });

    return { shoppingList, veggieCount };
  };

  const { shoppingList, veggieCount } = generateShoppingList();
  const shoppingItems = Object.values(shoppingList).sort((a, b) => {
    // Sort boolean items (isBoolean: true) to the end
    if (a.isBoolean && !b.isBoolean) return 1;
    if (!a.isBoolean && b.isBoolean) return -1;
    // If both are the same type, sort alphabetically
    return a.ingredient.localeCompare(b.ingredient);
  });
  const meals = Array.from(mealsMap.values());

  if (meals.length === 0) {
    return (
      <div className="empty-state">
        <h3>No meals available</h3>
        <p>Add some meals first to create a weekly plan!</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Weekly Meal Plan</h2>

      <div className="meal-plan-grid">
        {days.map(({ key, label }) => (
          <div key={key} className="week-day">
            <h3>{label}</h3>
            <select
              className="form-control"
              value={weeklyPlan[key] || ""}
              onChange={(e) => handleMealSelect(key, e.target.value)}
            >
              <option value="">Select a meal</option>
              {meals.map((meal) => (
                <option key={meal.id} value={meal.id}>
                  {toTitleCase(meal.title)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {shoppingItems.length > 0 && (
        <div className="shopping-list">
          <h3>Shopping List</h3>
          <div>
            {shoppingItems.map((item, index) => (
              <div key={index} className="shopping-item">
                <span>
                  {item.isBoolean ? (
                    <span style={{ color: "#666", fontStyle: "italic" }}>
                      {toTitleCase(item.ingredient)} (one needed)
                    </span>
                  ) : (
                    <>
                      {item.quantity ? `${item.quantity} ` : ""}
                      {toTitleCase(item.ingredient)}
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {veggieCount > 0 && (
        <div className="veggie-count">
          Total Veggie Sides Needed: {veggieCount}
        </div>
      )}

      {shoppingItems.length === 0 &&
        Object.values(weeklyPlan).some((meal) => meal) && (
          <div className="shopping-list">
            <h3>Shopping List</h3>
            <p>No ingredients to buy this week!</p>
          </div>
        )}

      {Object.values(weeklyPlan).some((meal) => meal) && (
        <PrepCalendar
          selectedMeals={weeklyPlan}
          prepInstructions={prepInstructions}
        />
      )}
    </div>
  );
}

export default MealPlan;
