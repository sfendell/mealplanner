import React, { useEffect, useMemo, useState } from "react";
import { SHEET_EDIT_URL, THIS_WEEK_TAB } from "../config";
import {
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
  currentWeekDays,
  dayLabel,
  formatDisplayDate,
} from "../utils/week";

function mergeSavedIntoWeek(
  weekTemplate: WeeklyPlanDay[],
  saved: WeeklyPlanDay[]
): WeeklyPlanDay[] {
  const byDate = new Map(saved.map((day) => [day.date, day]));
  return weekTemplate.map((day) => {
    const match = byDate.get(day.date);
    return match ? { ...day, meal: match.meal } : day;
  });
}

function ThisWeekPlan({ mealsMap }: { mealsMap: Map<string, Meal> }) {
  const [days, setDays] = useState<WeeklyPlanDay[]>(() => currentWeekDays());
  const [loading, setLoading] = useState(true);
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

  const loadPlan = async () => {
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const saved = await fetchThisWeekPlan();
      const week = currentWeekDays();
      if (saved.length === 0) {
        setDays(week);
      } else {
        // Prefer dates that fall in this calendar week; if none match,
        // show the saved rows as-is (sorted) so an older plan is still editable.
        const merged = mergeSavedIntoWeek(week, saved);
        const hasOverlap = merged.some((day) => day.meal);
        if (hasOverlap) {
          setDays(merged);
        } else {
          setDays(
            saved
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((day) => ({
                date: day.date,
                day: day.day || "",
                meal: day.meal,
              }))
          );
        }
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
    loadPlan();
  }, []);

  const handleMealChange = (date: string, selectValue: string) => {
    const meal = selectValueToPlanMeal(selectValue, mealsMap);
    setDays((prev) =>
      prev.map((day) => (day.date === date ? { ...day, meal } : day))
    );
    setStatus(null);
  };

  const handleSave = async () => {
    if (!isGoogleAuthConfigured()) {
      alert(
        "Google Sheets signing is not configured yet. Add a Web OAuth Client ID as VITE_GOOGLE_CLIENT_ID, enable the Google Sheets API, and authorize origin https://sfendell.github.io."
      );
      return;
    }

    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const token = await ensureGoogleSheetsAccess();
      await saveThisWeekPlan(token, days);
      setStatus("Saved to the This Week tab in Google Sheets.");
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
            Open sheet
          </a>
          <button className="btn btn-secondary btn-sm" onClick={loadPlan}>
            Refresh
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>

      <p style={{ color: "#666", marginBottom: 20 }}>
        Edit any day below, then save. Stored in the{" "}
        <strong>{THIS_WEEK_TAB}</strong> tab of the MealPrep spreadsheet.
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

      <div className="meal-plan-grid">
        {days.map((day) => (
          <div key={day.date} className="week-day">
            <h4>{day.day ? dayLabel(day.day) : "Day"}</h4>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#666",
                marginBottom: "8px",
              }}
            >
              {formatDisplayDate(day.date)}
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
              {/* Keep unknown saved titles selectable */}
              {day.meal &&
                day.meal !== "eatout" &&
                day.meal !== "leftovers" &&
                !mealsByTitle.has(day.meal) && (
                  <option value={day.meal}>{toTitleCase(day.meal)}</option>
                )}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ThisWeekPlan;
