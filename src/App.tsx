import React, { useState } from "react";
import MealPlan from "./components/MealPlan";
import MealList from "./components/MealList";
import { mealsMap } from "./data/meals";

function App() {
  const [activeTab, setActiveTab] = useState("plan");

  return (
    <div className="container">
      <div className="header">
        <h1>MealPrep</h1>
        <p>Plan your meals with ease</p>
      </div>

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
        {activeTab === "meals" && <MealList mealsMap={mealsMap} />}
        {activeTab === "plan" && <MealPlan mealsMap={mealsMap} />}
      </div>
    </div>
  );
}

export default App;
