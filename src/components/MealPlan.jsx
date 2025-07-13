import React, { useState, useEffect } from "react";
import PrepCalendar from "./PrepCalendar";
import { toTitleCase } from "../utils/format";
import { DAY_NAMES, DAY_LABELS } from "../constants";

function MealPlan({ mealsMap }) {
  const [planType, setPlanType] = useState("weeknights"); // weeknights, fullweek, custom
  const [customStartDay, setCustomStartDay] = useState("monday");
  const [customEndDay, setCustomEndDay] = useState("friday");

  // Initialize start/end days based on plan type
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
    monday: null,
    tuesday: null,
    wednesday: null,
    thursday: null,
    friday: null,
    saturday: null,
    sunday: null,
  });
  const [prepInstructions, setPrepInstructions] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [emails, setEmails] = useState([
    "sfendell91@gmail.com",
    "suresh.soumya105@gmail.com",
  ]);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    fetch("/api/prep")
      .then((res) => res.json())
      .then((data) => setPrepInstructions(data))
      .catch((err) => console.error("Error fetching prep instructions:", err));
  }, []);

  const getDaysForPlanType = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const dayKeys = Object.keys(DAY_NAMES);
    const dayLabels = Object.values(DAY_LABELS);

    let days = [];

    // Always use the current start/end day values
    const startDayIndex = dayKeys.indexOf(customStartDay);
    const endDayIndex = dayKeys.indexOf(customEndDay);

    let currentDate = new Date(tomorrow);
    let daysAdded = 0;
    const maxDays = 14; // Prevent infinite loops

    while (daysAdded < maxDays) {
      const dayIndex = currentDate.getDay();
      const dayKey = dayKeys[dayIndex];
      const dayLabel = dayLabels[dayIndex];

      if (dayKey === customStartDay) {
        // Start collecting days from the start day
        let tempDays = [];
        let tempDate = new Date(currentDate);

        // If start and end day are the same, do 8 days instead of 1
        const daysToCollect = customStartDay === customEndDay ? 8 : 7;

        for (let i = 0; i < daysToCollect; i++) {
          const tempDayIndex = tempDate.getDay();
          const tempDayKey = dayKeys[tempDayIndex];
          const tempDayLabel = dayLabels[tempDayIndex];

          tempDays.push({
            key: tempDayKey,
            label: tempDayLabel,
            date: new Date(tempDate),
          });

          // If start and end are different, stop when we reach the end day
          if (customStartDay !== customEndDay && tempDayKey === customEndDay) {
            days = tempDays;
            break;
          }

          tempDate.setDate(tempDate.getDate() + 1);
        }

        // If we collected all days (either 8 for same day or reached end day), set the days
        if (
          tempDays.length === daysToCollect ||
          (customStartDay !== customEndDay && tempDays.length > 0)
        ) {
          days = tempDays;
        }
        break;
      }

      currentDate.setDate(currentDate.getDate() + 1);
      daysAdded++;
    }

    return days;
  };

  const days = getDaysForPlanType();

  const handleMealSelect = (day, mealId) => {
    setWeeklyPlan((prev) => ({
      ...prev,
      [day]: mealId === "" ? null : mealId,
    }));
  };

  const generateShoppingList = () => {
    const shoppingList = {};
    let veggieCount = 0;

    Object.values(weeklyPlan).forEach((mealId) => {
      if (!mealId || mealId === "eatout" || mealId === "leftovers") return;
      const meal = mealsMap.get(mealId);
      if (meal) {
        meal.ingredients.forEach((ingredient) => {
          const ingredientName = ingredient.name;
          const key = ingredientName.toLowerCase();
          if (shoppingList[key]) {
            // If ingredient has a quantity, add it
            if (ingredient.quantity) {
              shoppingList[key].quantity += parseInt(ingredient.quantity);
            }
            // If no quantity, it's a boolean item - no need to increment
          } else {
            shoppingList[key] = {
              ingredient: ingredientName,
              quantity: ingredient.quantity
                ? parseInt(ingredient.quantity)
                : null,
              isBoolean: !ingredient.quantity, // Mark as boolean if no quantity
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
    // Sort boolean items (isBoolean: true) to the end
    if (a.isBoolean && !b.isBoolean) return 1;
    if (!a.isBoolean && b.isBoolean) return -1;
    // If both are the same type, sort alphabetically
    return a.ingredient.localeCompare(b.ingredient);
  });
  const meals = Array.from(mealsMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  if (meals.length === 0) {
    return (
      <div className="empty-state">
        <h3>No meals available</h3>
        <p>Add some meals first to create a weekly plan!</p>
      </div>
    );
  }

  // Helper to generate .ics content for a meal event
  function generateICS(mealTitle, date, emails) {
    // Format date to YYYYMMDDTHHMMSSZ (UTC)
    const pad = (n) => n.toString().padStart(2, "0");
    const start = new Date(date);
    start.setHours(18, 0, 0, 0); // 6pm local
    const end = new Date(start);
    end.setHours(19, 0, 0, 0); // 1 hour later
    const formatICSDate = (d) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
        d.getUTCDate()
      )}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    const dtStart = formatICSDate(start);
    const dtEnd = formatICSDate(end);
    const uid = `${mealTitle.replace(/\s+/g, "-")}-${dtStart}@mealprep`;
    const attendees = emails
      .map((email) => `ATTENDEE;CN=${email};RSVP=TRUE:mailto:${email}`)
      .join("\n");
    return `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//MealPrep//EN\nBEGIN:VEVENT\nUID:${uid}\nDTSTAMP:${dtStart}\nDTSTART:${dtStart}\nDTEND:${dtEnd}\nSUMMARY:${toTitleCase(
      mealTitle
    )}\n${attendees}\nEND:VEVENT\nEND:VCALENDAR`;
  }

  // Send calendar invites via Google Calendar API
  async function handleSendInvites() {
    // Create a map of all planned days to their actual displayed dates
    const plannedDays = [];
    days.forEach((day) => {
      const mealId = weeklyPlan[day.key];
      if (mealId) {
        if (mealId === "eatout") {
          plannedDays.push({
            title: "Eat Out",
            date: day.date,
            description: "Eating out tonight",
          });
        } else if (mealId === "leftovers") {
          plannedDays.push({
            title: "Leftovers",
            date: day.date,
            description: "Having leftovers tonight",
          });
        } else {
          const meal = mealsMap.get(mealId);
          if (meal) {
            plannedDays.push({
              title: toTitleCase(meal.title),
              date: day.date,
              description: `Meal prep for ${toTitleCase(meal.title)}`,
            });
          }
        }
      }
    });

    // Get user's timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Prepare events for Google Calendar API using the actual displayed dates
    const events = [];
    plannedDays.forEach((plannedDay) => {
      events.push({
        title: plannedDay.title,
        date: plannedDay.date.toISOString(),
        attendees: emails,
        description: plannedDay.description,
        timezone: userTimezone,
      });
    });

    try {
      const response = await fetch("/api/calendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events }),
      });

      const result = await response.json();

      if (response.ok) {
        alert(
          `Success! ${result.message}\n\nEvents created:\n${result.events
            .map(
              (event) =>
                `• ${event.title} - ${new Date(
                  event.date
                ).toLocaleDateString()}`
            )
            .join("\n")}`
        );
      } else {
        alert(`Error creating calendar events: ${result.error}`);
      }
    } catch (error) {
      console.error("Error sending invites:", error);
      alert("Failed to send calendar invites. Please try again.");
    }

    setShowInviteModal(false);
  }

  // Add email to the list
  function handleAddEmail(e) {
    e.preventDefault();
    const val = emailInput.trim();
    if (val && !emails.includes(val)) {
      setEmails([...emails, val]);
      setEmailInput("");
    }
  }

  // Remove email from the list
  function handleRemoveEmail(email) {
    setEmails(emails.filter((e) => e !== email));
  }

  return (
    <div>
      <h2>Weekly Meal Plan</h2>

      <div className="meal-plan-input">
        <label htmlFor="planType">Meal Planning Type:</label>
        <select
          id="planType"
          value={planType}
          onChange={(e) => setPlanType(e.target.value)}
          className="form-control"
          style={{ marginLeft: "10px" }}
        >
          <option value="weeknights">Weeknight Meal Planning</option>
          <option value="fullweek">All Week Meal Planning</option>
          <option value="custom">Custom Start/Stop Days</option>
        </select>
      </div>

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
            // Switch to custom if user changes from preset values
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
            // Switch to custom if user changes from preset values
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
              value={weeklyPlan[key] || ""}
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

      {/* Calendar Invite Button and Modal */}
      <div style={{ marginTop: 32, textAlign: "center" }}>
        <button
          className="btn btn-primary"
          onClick={() => setShowInviteModal(true)}
          style={{ fontSize: "1.1rem", padding: "12px 32px" }}
        >
          Send Calendar Invites
        </button>
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
            <h3 style={{ marginBottom: 16 }}>Send Calendar Invites</h3>
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
                  {emails.length > 1 && (
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
                  )}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                className="btn btn-secondary"
                style={{ marginRight: 12 }}
                onClick={() => setShowInviteModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSendInvites}
                disabled={emails.length === 0}
              >
                Send Invites
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MealPlan;
