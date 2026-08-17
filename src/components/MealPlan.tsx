import React, { useState, useEffect } from "react";
import PrepCalendar from "./PrepCalendar";
import { toTitleCase } from "../utils/format";
import { DAY_NAMES, DAY_LABELS } from "../constants";
import type { Meal } from "../types";

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
}: {
  mealsMap: Map<string, Meal>;
  prepInstructions: Record<string, string>;
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
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [emails, setEmails] = useState([
    "sfendell91@gmail.com",
    "suresh.soumya105@gmail.com",
  ]);
  const [emailInput, setEmailInput] = useState("");

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
    let veggieCount = 0;

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
        if (meal.hasVeggieSide) {
          veggieCount++;
        }
      }
    });

    return { shoppingList, veggieCount };
  };

  const { shoppingList, veggieCount } = generateShoppingList();
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

  function generateICS(mealTitle: string, date: Date, inviteEmails: string[]) {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const start = new Date(date);
    start.setHours(18, 0, 0, 0);
    const end = new Date(start);
    end.setHours(19, 0, 0, 0);
    const formatICSDate = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
        d.getUTCDate()
      )}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const dtStart = formatICSDate(start);
    const dtEnd = formatICSDate(end);
    const uid = `${mealTitle.replace(/\s+/g, "-")}-${dtStart}@mealprep`;
    const attendees = inviteEmails
      .map((email) => `ATTENDEE;CN=${email};RSVP=TRUE:mailto:${email}`)
      .join("\r\n");
    return [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//MealPrep//EN",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtStart}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${toTitleCase(mealTitle)}`,
      attendees,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .filter(Boolean)
      .join("\r\n");
  }

  function handleDownloadInvites() {
    const events = days
      .map((day) => {
        const mealId = weeklyPlan[day.key as keyof typeof weeklyPlan];
        if (!mealId) return null;

        if (mealId === "eatout") {
          return { title: "Eat Out", date: day.date };
        }
        if (mealId === "leftovers") {
          return { title: "Leftovers", date: day.date };
        }

        const meal = mealsMap.get(mealId);
        if (!meal) return null;
        return { title: toTitleCase(meal.title), date: day.date };
      })
      .filter(Boolean) as { title: string; date: Date }[];

    if (events.length === 0) {
      alert("Select at least one meal before downloading calendar invites.");
      return;
    }

    events.forEach((event, index) => {
      const ics = generateICS(event.title, event.date, emails);
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mealprep-${index + 1}-${event.title
        .toLowerCase()
        .replace(/\s+/g, "-")}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });

    setShowInviteModal(false);
  }

  function handleAddEmail(e: React.FormEvent) {
    e.preventDefault();
    const val = emailInput.trim();
    if (val && !emails.includes(val)) {
      setEmails([...emails, val]);
      setEmailInput("");
    }
  }

  function handleRemoveEmail(email: string) {
    setEmails(emails.filter((e) => e !== email));
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
          mealsMap={mealsMap}
          days={days}
        />
      )}

      <div style={{ marginTop: 32, textAlign: "center" }}>
        <button
          className="btn btn-primary"
          onClick={() => setShowInviteModal(true)}
          style={{ fontSize: "1.1rem", padding: "12px 32px" }}
        >
          Download Calendar Invites
        </button>
        <p style={{ marginTop: 8, fontSize: "0.8rem", color: "#666" }}>
          Download .ics files for meal events (attendees optional)
        </p>
      </div>
      {showInviteModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 32,
              minWidth: 320,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              position: "relative",
            }}
          >
            <h3 style={{ marginBottom: 16 }}>Download Calendar Invites</h3>
            <p style={{ marginBottom: 16, fontSize: "0.9rem", color: "#666" }}>
              Optional: add emails to include as attendees in the .ics files
            </p>
            <form onSubmit={handleAddEmail} style={{ marginBottom: 16 }}>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Add email address"
                style={{ padding: 8, width: 200, marginRight: 8 }}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                Add
              </button>
            </form>
            <div style={{ marginBottom: 16 }}>
              {emails.map((email) => (
                <span
                  key={email}
                  style={{
                    display: "inline-block",
                    background: "#f0f0f0",
                    borderRadius: 8,
                    padding: "4px 12px",
                    margin: "0 8px 8px 0",
                  }}
                >
                  {email}
                  <button
                    onClick={() => handleRemoveEmail(email)}
                    style={{
                      marginLeft: 8,
                      background: "none",
                      border: "none",
                      color: "#dc3545",
                      cursor: "pointer",
                      fontWeight: "bold",
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
              }}
            >
              <button
                className="btn btn-secondary"
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDownloadInvites}
              >
                Download .ics Files
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MealPlan;
