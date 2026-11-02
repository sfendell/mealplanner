import React, { useState, useEffect } from "react";
import PrepCalendar from "./PrepCalendar";
import { toTitleCase } from "../utils/format";
import { DAY_NAMES, DAY_LABELS } from "../constants";
import {
  ensureGoogleSheetsAccess,
  isGoogleAuthConfigured,
} from "../lib/googleAuth";
import { saveThisWeekPlan, selectValueToPlanMeal } from "../data/weeklyPlanSheet";
import type { Meal } from "../types";
import { toDateKey } from "../utils/week";

type Day = {
  key: string;
  label: string;
  date: Date;
};

type ShoppingList = {
  [key: string]: {
    ingredient: string;
    quantity: number | null;
    isBoolean: boolean;
  };
};

function MealPlan({
  mealsMap,
  prepInstructions,
  onSaved,
}: {
  mealsMap: Map<string, Meal>;
  prepInstructions: Record<string, string>;
  onSaved?: () => void;
}) {
  const [planType, setPlanType] = useState("weeknights");
  const [customStartDay, setCustomStartDay] = useState("monday");
  const [customEndDay, setCustomEndDay] = useState("friday");

  useEffect(() => {
    if (planType === "weeknights") {
      setCustomStartDay("monday");
      setCustomEndDay("friday");
    } else if (planType === "fullweek") {
      setCustomStartDay("sunday");
      setCustomEndDay("saturday");
    }
  }, [planType]);

  const [weeklyPlan, setWeeklyPlan] = useState({
    monday: null as string | null,
    tuesday: null as string | null,
    wednesday: null as string | null,
    thursday: null as string | null,
    friday: null as string | null,
    saturday: null as string | null,
    sunday: null as string | null,
  });
  const [saving, setSaving] = useState(false);

  const getDaysForPlanType = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayKeys = Object.keys(DAY_NAMES);
    const dayLabels = Object.values(DAY_LABELS);

    let days: Day[] = [];
    let currentDate = new Date(tomorrow);
    let daysAdded = 0;
    const maxDays = 14;

    while (daysAdded < maxDays) {
      const dayIndex = currentDate.getDay();
      const dayKey = dayKeys[dayIndex];
      const dayLabel = dayLabels[dayIndex];

      if (dayKey === customStartDay) {
        let tempDate = new Date(currentDate);

        if (!customEndDay || customEndDay === "") {
          days = [
            {
              key: dayKey,
              label: dayLabel,
              date: new Date(tempDate),
            },
          ];
          break;
        } else {
          let tempDays: Day[] = [];
          let tempDaysAdded = 0;

          while (tempDaysAdded < 7) {
            const tempDayIndex = tempDate.getDay();
            const tempDayKey = dayKeys[tempDayIndex];
            const tempDayLabel = dayLabels[tempDayIndex];

            tempDays.push({
              key: tempDayKey,
              label: tempDayLabel,
              date: new Date(tempDate),
            });

            if (tempDayKey === customEndDay) {
              days = tempDays;
              break;
            }

            tempDate.setDate(tempDate.getDate() + 1);
            tempDaysAdded++;
          }

          if (days.length === 0) {
            days = tempDays;
          }
          break;
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
      daysAdded++;
    }

    return days;
  };

  const days = getDaysForPlanType();

  const handleMealSelect = (day: string, mealId: string) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: mealId === "" ? null : mealId,
    }));
  };

  const generateShoppingList = () => {
    const shoppingList: ShoppingList = {};

    Object.values(weeklyPlan).forEach((mealId) => {
      if (!mealId || mealId === "eatout" || mealId === "leftovers") return;
      const meal = mealsMap.get(mealId);
      if (meal) {
        meal.ingredients.forEach((ingredient) => {
          const ingredientName = ingredient.name;
          const key = ingredientName.toLowerCase();
          if (
            shoppingList[key] &&
            ingredient.quantity &&
            shoppingList[key].quantity
          ) {
            shoppingList[key].quantity += parseInt(ingredient.quantity);
          } else {
            shoppingList[key] = {
              ingredient: ingredientName,
              quantity: ingredient.quantity
                ? parseInt(ingredient.quantity)
                : null,
              isBoolean: !ingredient.quantity,
            };
          }
        });
      }
    });

    return shoppingList;
  };

  const shoppingList = generateShoppingList();
  const shoppingItems = Object.values(shoppingList).sort((a, b) => {
    if (a.isBoolean && !b.isBoolean) return 1;
    if (!a.isBoolean && b.isBoolean) return -1;
    return a.ingredient.localeCompare(b.ingredient);
  });
  const meals = Array.from(mealsMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  if (meals.length === 0) {
    return (
      <div className="empty-state">
        <h3>No meals available</h3>
        <p>Add meals in the Google Sheet, then refresh.</p>
      </div>
    );
  }

  async function handleSaveThisWeek() {
    const planned = days
      .map((day) => {
        const selectValue =
          weeklyPlan[day.key as keyof typeof weeklyPlan] || "";
        return {
          date: toDateKey(day.date),
          day: day.key,
          meal: selectValueToPlanMeal(selectValue, mealsMap),
        };
      })
      .filter((day) => day.meal);

    if (planned.length === 0) {
      alert("Select at least one meal before saving this week's plan.");
      return;
    }

    if (!isGoogleAuthConfigured()) {
      alert(
        "Google Sheets sign-in is not configured yet. Add a Web OAuth Client ID as VITE_GOOGLE_CLIENT_ID, enable the Google Sheets API, and authorize origin https://sfendell.github.io."
      );
      return;
    }

    setSaving(true);
    try {
      const token = await ensureGoogleSheetsAccess();
      // Persist the full current week Mon–Sun, filling blanks for unplanned days
      // that fall outside the selected planning range by only writing planned days
      // plus any days in the selected range (even if empty).
      await saveThisWeekPlan(
        token,
        days.map((day) => {
          const selectValue =
            weeklyPlan[day.key as keyof typeof weeklyPlan] || "";
          return {
            date: toDateKey(day.date),
            day: day.key,
            meal: selectValueToPlanMeal(selectValue, mealsMap),
          };
        })
      );
      alert("Saved this week's plan to Google Sheets.");
      onSaved?.();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to save this week's plan."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2>Weekly Meal Plan</h2>

      <div
        className="custom-days-input"
        style={{
          marginTop: "10px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <label
          htmlFor="customStartDay"
          style={{ margin: 0, fontSize: "0.9rem" }}
        >
          Start Day:
        </label>
        <select
          id="customStartDay"
          value={customStartDay}
          onChange={(e) => {
            setCustomStartDay(e.target.value);
            if (
              (planType === "weeknights" && e.target.value !== "monday") ||
              (planType === "fullweek" && e.target.value !== "sunday")
            ) {
              setPlanType("custom");
            }
          }}
          className="form-control"
          style={{ width: "80px", padding: "6px 8px", fontSize: "0.8rem" }}
        >
          {Object.entries(DAY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <label htmlFor="customEndDay" style={{ margin: 0, fontSize: "0.9rem" }}>
          End Day:
        </label>
        <select
          id="customEndDay"
          value={customEndDay}
          onChange={(e) => {
            setCustomEndDay(e.target.value);
            if (
              (planType === "weeknights" && e.target.value !== "friday") ||
              (planType === "fullweek" && e.target.value !== "saturday")
            ) {
              setPlanType("custom");
            }
          }}
          className="form-control"
          style={{ width: "80px", padding: "6px 8px", fontSize: "0.8rem" }}
        >
          <option value="">Single Day</option>
          {Object.entries(DAY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="meal-plan-grid compact">
        {days.map(({ key, label, date }) => (
          <div key={key} className="week-day compact">
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
            <select
              className="form-control compact"
              value={weeklyPlan[key as keyof typeof weeklyPlan] || ""}
              onChange={(e) => handleMealSelect(key, e.target.value)}
            >
              <option value="">Select</option>
              <option value="eatout">Eat Out</option>
              <option value="leftovers">Leftovers</option>
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
                      {toTitleCase(item.ingredient)}
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
          mealsMap={mealsMap}
          days={days}
        />
      )}

      <div style={{ marginTop: 32, textAlign: "center" }}>
        <button
          className="btn btn-primary"
          onClick={handleSaveThisWeek}
          disabled={saving}
          style={{ fontSize: "1.1rem", padding: "12px 32px" }}
        >
          {saving ? "Saving..." : "Save as This Week's Plan"}
        </button>
        <p style={{ marginTop: 8, fontSize: "0.8rem", color: "#666" }}>
          Saves the plan to the This Week tab in Google Sheets (no email)
        </p>
      </div>
    </div>
  );
}

export default MealPlan;
