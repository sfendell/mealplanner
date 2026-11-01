import React, { useEffect, useState } from "react";
import MealPlan from "./components/MealPlan";
import MealList from "./components/MealList";
import ThisWeekPlan from "./components/ThisWeekPlan";
import { MEALS_TAB, PREP_TAB, SHEET_EDIT_URL } from "./config";
import {
  fetchMealsFromSheet,
  fetchPrepFromSheet,
  mealsToMap,
  parseMeals,
  parsePrep,
  readCachedRows,
} from "./data/googleSheets";
import type { Meal } from "./types";

function Header() {
  return (
    <div className="header">
      <h1>MealPrep</h1>
      <p>Plan your meals with ease</p>
      <p>
        <a href={SHEET_EDIT_URL} target="_blank" rel="noreferrer">
          Edit meals in Google Sheets
        </a>
      </p>
    </div>
  );
}

function readCachedData(): {
  meals: Map<string, Meal>;
  prep: Record<string, string>;
} | null {
  const mealRows = readCachedRows(MEALS_TAB);
  const prepRows = readCachedRows(PREP_TAB);
  if (!mealRows || !prepRows) return null;
  try {
    return {
      meals: mealsToMap(parseMeals(mealRows)),
      prep: parsePrep(prepRows),
    };
  } catch {
    return null;
  }
}

function App() {
  const [cached] = useState(readCachedData);
  const [activeTab, setActiveTab] = useState("this-week");
  const [mealsMap, setMealsMap] = useState<Map<string, Meal>>(
    () => cached?.meals ?? new Map()
  );
  const [prepInstructions, setPrepInstructions] = useState<
    Record<string, string>
  >(() => cached?.prep ?? {});
  const [loading, setLoading] = useState(cached === null);
  const [error, setError] = useState<string | null>(null);
  const [thisWeekKey, setThisWeekKey] = useState(0);

  const loadData = async ({ fresh }: { fresh: boolean }) => {
    if (fresh) setLoading(true);
    setError(null);
    try {
      const [meals, prep] = await Promise.all([
        fetchMealsFromSheet({ fresh }),
        fetchPrepFromSheet({ fresh }),
      ]);
      setMealsMap(mealsToMap(meals));
      setPrepInstructions(prep);
    } catch (err) {
      console.error(err);
      // With cached data on screen, a failed background refresh isn't fatal.
      if (fresh || cached === null) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load meals from Google Sheets"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData({ fresh: false });
  }, []);

  if (loading) {
    return (
      <div className="container">
        <Header />
        <div className="content">
          <div style={{ textAlign: "center", padding: "40px" }}>
            Loading meals from Google Sheets...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <Header />
        <div className="content">
          <div className="empty-state">
            <h3>Couldn’t load meals</h3>
            <p>{error}</p>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => loadData({ fresh: true })}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <Header />

      <div className="tabs">
        <button
          className={`tab ${activeTab === "this-week" ? "active" : ""}`}
          onClick={() => setActiveTab("this-week")}
        >
          This Week's Plan
        </button>
        <button
          className={`tab ${activeTab === "plan" ? "active" : ""}`}
          onClick={() => setActiveTab("plan")}
        >
          Build Plan
        </button>
        <button
          className={`tab ${activeTab === "meals" ? "active" : ""}`}
          onClick={() => setActiveTab("meals")}
        >
          My Meals
        </button>
      </div>

      <div className="content">
        {activeTab === "this-week" && (
          <ThisWeekPlan key={thisWeekKey} mealsMap={mealsMap} />
        )}
        {activeTab === "plan" && (
          <MealPlan
            mealsMap={mealsMap}
            prepInstructions={prepInstructions}
            onSaved={() => {
              setThisWeekKey((k) => k + 1);
              setActiveTab("this-week");
            }}
          />
        )}
        {activeTab === "meals" && (
          <MealList
            mealsMap={mealsMap}
            onRefresh={() => loadData({ fresh: true })}
          />
        )}
      </div>
    </div>
  );
}

export default App;
