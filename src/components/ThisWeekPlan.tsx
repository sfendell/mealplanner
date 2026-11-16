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
  getStoredAccessToken,
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

  days.forEach((day) => {
    if (!day.meal || day.meal === "eatout" || day.meal === "leftovers") return;
    const meal = byTitle.get(day.meal);
    if (!meal) return;
    meal.ingredients.forEach((ingredient) => {
      add(ingredient.name, ingredient.quantity);
    });
  });

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
  const saveIdRef = useRef(0);
  const [signedIn, setSignedIn] = useState(() => Boolean(getStoredAccessToken()));
  const [signingIn, setSigningIn] = useState(() => !getStoredAccessToken());
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

  const promptSignIn = async () => {
    if (!isGoogleAuthConfigured()) {
      setSigningIn(false);
      setSignedIn(false);
      setError(
        "Google Sheets sign-in is not configured yet. Add a Web OAuth Client ID as VITE_GOOGLE_CLIENT_ID, enable the Google Sheets API, and authorize origin https://sfendell.github.io."
      );
      return;
    }

    const alreadySignedIn = Boolean(getStoredAccessToken());
    if (!alreadySignedIn) setSigningIn(true);
    setError(null);
    try {
      await ensureGoogleSheetsAccess();
      setSignedIn(true);
    } catch (err) {
      console.error(err);
      setSignedIn(false);
      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in was cancelled. Sign in to edit and save."
      );
    } finally {
      setSigningIn(false);
    }
  };

  const autoSave = async (nextDays: WeeklyPlanDay[]) => {
    if (!isGoogleAuthConfigured()) {
      setError(
        "Google Sheets sign-in is not configured yet. Add a Web OAuth Client ID as VITE_GOOGLE_CLIENT_ID."
      );
      return;
    }

    const saveId = ++saveIdRef.current;
    setSaving(true);
    setError(null);
    setStatus("Saving...");
    try {
      const token = await ensureGoogleSheetsAccess();
      setSignedIn(true);
      await saveThisWeekPlan(token, nextDays);
      if (saveId !== saveIdRef.current) return;
      editedRef.current = false;
      setStatus("Saved.");
    } catch (err) {
      console.error(err);
      if (saveId !== saveIdRef.current) return;
      setSignedIn(false);
      setError(err instanceof Error ? err.message : "Failed to save plan");
      setStatus(null);
    } finally {
      if (saveId === saveIdRef.current) {
        setSaving(false);
      }
    }
  };

  useEffect(() => {
    void promptSignIn();
    void load({ fresh: false });
  }, []);

  const handleMealChange = (date: string, selectValue: string) => {
    editedRef.current = true;
    const meal = selectValueToPlanMeal(selectValue, mealsMap);
    setDays((prev) => {
      const nextDays = prev.map((day) =>
        day.date === date ? { ...day, meal } : day
      );
      void autoSave(nextDays);
      return nextDays;
    });
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {(saving || status) && (
            <span style={{ color: "#666", fontSize: 14 }}>
              {saving ? "Saving..." : status}
            </span>
          )}
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
          {!signedIn && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => void promptSignIn()}
              disabled={signingIn}
            >
              {signingIn ? "Signing in..." : "Sign in with Google"}
            </button>
          )}
        </div>
      </div>

      <p style={{ color: "#666", marginBottom: 20 }}>
        Today through the next week. Changes save automatically. Shopping list
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
                  disabled={!signedIn || signingIn}
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
