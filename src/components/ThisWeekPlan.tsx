import React, { useEffect, useMemo, useRef, useState } from "react";
import { SHEET_EDIT_URL, THIS_WEEK_TAB } from "../config";
import {
  cachedThisWeekPlan,
  fetchThisWeekPlan,
  planMealToSelectValue,
  saveThisWeekPlan,
  selectValueToPlanMeal,
} from "../data/weeklyPlanSheet";
import {
  ensureGoogleSheetsAccess,
  isGoogleAuthConfigured,
} from "../lib/googleAuth";
import type { Meal, WeeklyPlanDay } from "../types";
import { toTitleCase } from "../utils/format";
import {
  dayLabel,
  formatDisplayDate,
  toDateKey,
  upcomingWeekDays,
} from "../utils/week";

type ShoppingItem = {
  name: string;
  quantity: string | null;
};

function isNumericQuantity(value: string): boolean {
  return /^\d+(\.\d+)?$/.test(value.trim());
}

function combineQuantities(
  current: string | null,
  next: string | null
): string | null {
  if (!next) return current;
  if (!current) return next;
  if (isNumericQuantity(current) && isNumericQuantity(next)) {
    const sum = Number(current) + Number(next);
    return Number.isInteger(sum) ? String(sum) : String(sum);
  }
  if (current === next) return current;
  return `${current} + ${next}`;
}

function buildShoppingList(
  days: WeeklyPlanDay[],
  meals: Meal[]
): ShoppingItem[] {
  const byTitle = new Map(
    meals.map((meal) => [meal.title.toLowerCase(), meal])
  );
  const items = new Map<string, ShoppingItem>();

  const add = (name: string, quantity: string | null) => {
    const key = name.trim().toLowerCase();
    if (!key) return;
    const existing = items.get(key);
    if (!existing) {
      items.set(key, { name: key, quantity });
      return;
    }
    existing.quantity = combineQuantities(existing.quantity, quantity);
  };

  let veggieCount = 0;
  days.forEach((day) => {
    if (!day.meal || day.meal === "eatout" || day.meal === "leftovers") return;
    const meal = byTitle.get(day.meal);
    if (!meal) return;
    meal.ingredients.forEach((ingredient) => {
      add(ingredient.name, ingredient.quantity);
    });
    if (meal.hasVeggieSide) veggieCount += 1;
  });

  if (veggieCount > 0) {
    add("veggie side", String(veggieCount));
  }

  return Array.from(items.values()).sort((a, b) => {
    if (!!a.quantity !== !!b.quantity) return a.quantity ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

function mergeSavedIntoWeek(
  week: WeeklyPlanDay[],
  saved: WeeklyPlanDay[]
): WeeklyPlanDay[] {
  const byDate = new Map(saved.map((day) => [day.date, day]));
  return week.map((day) => {
    const match = byDate.get(day.date);
    return match ? { ...day, meal: match.meal } : day;
  });
}

function ThisWeekPlan({ mealsMap }: { mealsMap: Map<string, Meal> }) {
  const [initialCache] = useState(() => cachedThisWeekPlan());
  const [days, setDays] = useState<WeeklyPlanDay[]>(() =>
    mergeSavedIntoWeek(upcomingWeekDays(), initialCache ?? [])
  );
  const [loading, setLoading] = useState(initialCache === null);
  const editedRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const meals = useMemo(
    () =>
      Array.from(mealsMap.values()).sort((a, b) =>
        a.title.localeCompare(b.title)
      ),
    [mealsMap]
  );

  const mealsByTitle = useMemo(() => {
    const map = new Map<string, string>();
    meals.forEach((meal) => map.set(meal.title.toLowerCase(), meal.id));
    return map;
  }, [meals]);

  const shoppingItems = useMemo(
    () => buildShoppingList(days, meals),
    [days, meals]
  );
  const todayKey = toDateKey(new Date());

  const load = async ({ fresh }: { fresh: boolean }) => {
    if (fresh) {
      setLoading(true);
      editedRef.current = false;
    }
    setError(null);
    setStatus(null);
    try {
      const saved = await fetchThisWeekPlan({ fresh });
      // A background refresh must not clobber edits made while it was loading.
      if (!editedRef.current) {
        setDays(mergeSavedIntoWeek(upcomingWeekDays(), saved));
      }
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load this week's plan"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ fresh: false });
  }, []);

  const handleMealChange = (date: string, selectValue: string) => {
    editedRef.current = true;
    const meal = selectValueToPlanMeal(selectValue, mealsMap);
    setDays((prev) =>
      prev.map((day) => (day.date === date ? { ...day, meal } : day))
    );
    setStatus(null);
  };

  const handleSave = async () => {
    if (!isGoogleAuthConfigured()) {
      alert(
        "Google Sheets sign-in is not configured yet. Add a Web OAuth Client ID as VITE_GOOGLE_CLIENT_ID, enable the Google Sheets API, and authorize origin https://sfendell.github.io."
      );
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const token = await ensureGoogleSheetsAccess();
      await saveThisWeekPlan(token, days);
      editedRef.current = false;
      setStatus(`Saved to the "${THIS_WEEK_TAB}" tab in Google Sheets.`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "40px" }}>
        Loading this week's plan...
      </div>
    );
  }

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
        <h2 style={{ margin: 0 }}>This Week's Plan</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a
            className="btn btn-secondary btn-sm"
            href={`${SHEET_EDIT_URL}#gid=0`}
            target="_blank"
            rel="noreferrer"
          >
            Open Sheet
          </a>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => load({ fresh: true })}
          >
            Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <p style={{ color: "#666", marginBottom: 20 }}>
        Today through the next week. Edit any day, then save. Shopping list
        updates live on the right. Stored in the{" "}
        <strong>{THIS_WEEK_TAB}</strong> sheet tab.
      </p>

      {error && (
        <div
          style={{
            background: "#f8d7da",
            color: "#721c24",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}

      {status && (
        <div
          style={{
            background: "#d4edda",
            color: "#155724",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
          }}
        >
          {status}
        </div>
      )}

      <div className="this-week-layout">
        <div className="this-week-days">
          {days.map((day) => {
            const isToday = day.date === todayKey;
            return (
              <div
                key={day.date}
                className={`this-week-day${isToday ? " is-today" : ""}`}
              >
                <div className="this-week-day-label">
                  <h4>{isToday ? "Today" : dayLabel(day.day)}</h4>
                  <div className="this-week-day-date">
                    {formatDisplayDate(day.date)}
                  </div>
                </div>
                <select
                  className="form-control"
                  value={planMealToSelectValue(day.meal, mealsByTitle)}
                  onChange={(e) => handleMealChange(day.date, e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="eatout">Eat Out</option>
                  <option value="leftovers">Leftovers</option>
                  {meals.map((meal) => (
                    <option key={meal.id} value={meal.id}>
                      {toTitleCase(meal.title)}
                    </option>
                  ))}
                  {day.meal &&
                    day.meal !== "eatout" &&
                    day.meal !== "leftovers" &&
                    !mealsByTitle.has(day.meal) && (
                      <option value={day.meal}>{toTitleCase(day.meal)}</option>
                    )}
                </select>
              </div>
            );
          })}
        </div>

        <aside className="shopping-list this-week-shopping">
          <h3>Shopping List</h3>
          {shoppingItems.length === 0 ? (
            <p>Pick meals to see everything you need to buy.</p>
          ) : (
            shoppingItems.map((item) => (
              <div key={item.name} className="shopping-item">
                <span>
                  {item.quantity ? `${item.quantity} ` : ""}
                  {toTitleCase(item.name)}
                </span>
              </div>
            ))
          )}
        </aside>
      </div>
    </div>
  );
}

export default ThisWeekPlan;
