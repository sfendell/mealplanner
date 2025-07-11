import React, { useState, useEffect } from "react";
import AddMeal from "./components/AddMeal";
import MealPlan from "./components/MealPlan";
import MealList from "./components/MealList";

function App() {
  const [activeTab, setActiveTab] = useState("plan");
  const [mealsMap, setMealsMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await fetch("/api/meals");
      const data = await response.json();
      // Create a map for faster lookups
      const mealsMapData = new Map();
      data.forEach((meal) => {
        mealsMapData.set(String(meal.id), meal);
      });
      setMealsMap(mealsMapData);
    } catch (error) {
      console.error("Error fetching meals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMealAdded = () => {
    fetchMeals();
  };

  if (loading) {
    return (
      <div className="container">
        <div className="header">
          <h1>MealPrep</h1>
          <p>Plan your meals with ease</p>
        </div>
        <div className="content">
          <div style={{ textAlign: "center", padding: "40px" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>MealPrep</h1>
        <p>Plan your meals with ease</p>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === "add-meal" ? "active" : ""}`}
          onClick={() => setActiveTab("add-meal")}
        >
          Add Meal
        </button>
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
        {activeTab === "add-meal" && <AddMeal onMealAdded={handleMealAdded} />}
        {activeTab === "meals" && (
          <MealList mealsMap={mealsMap} onMealDeleted={fetchMeals} />
        )}
        {activeTab === "plan" && <MealPlan mealsMap={mealsMap} />}
      </div>
    </div>
  );
}

export default App;
