import React from "react";
import { toTitleCase } from "../utils/format";
import { SHEET_EDIT_URL } from "../config";
import type { Meal } from "../types";

function MealList({
  mealsMap,
  onRefresh,
}: {
  mealsMap: Map<string, Meal>;
  onRefresh: () => void;
}) {
  const meals = Array.from(mealsMap.values());

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>My Meals</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            className="btn btn-secondary btn-sm"
            href={SHEET_EDIT_URL}
            target="_blank"
            rel="noreferrer"
          >
            Edit in Google Sheets
          </a>
          <button className="btn btn-primary btn-sm" onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {meals.length === 0 ? (
        <div className="empty-state">
          <h3>No meals yet</h3>
          <p>
            Add rows in the{" "}
            <a href={SHEET_EDIT_URL} target="_blank" rel="noreferrer">
              Google Sheet
            </a>
            , then hit Refresh.
          </p>
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default MealList;
