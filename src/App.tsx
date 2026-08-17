import React, { useEffect, useState } from "react";
import MealPlan from "./components/MealPlan";
import MealList from "./components/MealList";
import { SHEET_EDIT_URL } from "./config";
import {
  fetchMealsFromSheet,
  fetchPrepFromSheet,
  mealsToMap,
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

function App() {
  const [activeTab, setActiveTab] = useState("plan");
  const [mealsMap, setMealsMap] = useState<Map<string, Meal>>(new Map());
  const [prepInstructions, setPrepInstructions] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [meals, prep] = await Promise.all([
        fetchMealsFromSheet(),
        fetchPrepFromSheet(),
      ]);
      setMealsMap(mealsToMap(meals));
      setPrepInstructions(prep);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load meals from Google Sheets"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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
              onClick={loadData}
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
          className={`tab ${activeTab === "meals" ? "active" : ""}`}
          onClick={() => setActiveTab("meals")}
        >
          My Meals
        </button>
        <button
          className={`tab ${activeTab === "plan" ? "active" : ""}`}
          onClick={() => setActiveTab("plan")}
        >
          Weekly Plan
        </button>
      </div>

      <div className="content">
        {activeTab === "meals" && (
          <MealList mealsMap={mealsMap} onRefresh={loadData} />
        )}
        {activeTab === "plan" && (
          <MealPlan mealsMap={mealsMap} prepInstructions={prepInstructions} />
        )}
      </div>
    </div>
  );
}

export default App;
