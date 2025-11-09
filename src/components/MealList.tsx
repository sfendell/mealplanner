import React, { useState } from "react";
import { toTitleCase } from "../utils/format";

type Ingredient = {
  quantity: string;
  name: string;
};

type Meal = {
  id: string;
  title: string;
  ingredients: Ingredient[];
  hasVeggieSide: boolean;
};

function MealList({ mealsMap, onMealDeleted }) {
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editIngredients, setEditIngredients] = useState<Ingredient[]>([]);
  const [editHasVeggieSide, setEditHasVeggieSide] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const handleDelete = async (mealId) => {
    if (!confirm("Are you sure you want to delete this meal?")) {
      return;
    }

    
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        onMealDeleted();
        alert("Meal deleted successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting meal:", error);
      alert("Error deleting meal. Please try again.");
    }
  };

  const handleEdit = (meal) => {
    // If editing a different meal, close the current edit first
    if (editingMeal && editingMeal.id !== meal.id) {
      handleCancelEdit();
    }

    setEditingMeal(meal);
    setEditTitle(meal.title);
    // Ensure ingredients have the correct structure
    const normalizedIngredients = meal.ingredients.map((ing) => ({
      quantity: ing.quantity || "",
      name: ing.name || "",
    }));
    setEditIngredients(normalizedIngredients);
    setEditHasVeggieSide(meal.hasVeggieSide || false);
  };

  const handleCancelEdit = () => {
    setEditingMeal(null);
    setEditTitle("");
    setEditIngredients([]);
    setEditHasVeggieSide(false);
  };

  const addEditIngredient = () => {
    setEditIngredients([...editIngredients, { quantity: "", name: "" }]);
  };

  const removeEditIngredient = (index) => {
    if (editIngredients.length > 1) {
      setEditIngredients(editIngredients.filter((_, i) => i !== index));
    }
  };

  const updateEditIngredient = (index, field, value) => {
    const updatedIngredients = [...editIngredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value,
    };
    setEditIngredients(updatedIngredients);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();

    if (!editTitle.trim()) {
      alert("Please enter a meal title");
      return;
    }

    const validIngredients = editIngredients.filter((ing) =>
      (ing.name || "").trim()
    );
    if (validIngredients.length === 0) {
      alert("Please add at least one ingredient");
      return;
    }

    setEditLoading(true);

    try {
      const mealData = {
        title: editTitle.trim(),
        ingredients: validIngredients.map((ing) => ({
          quantity: ing.quantity.trim() || null,
          name: (ing.name || "").trim().toLowerCase(),
        })),
        hasVeggieSide: editHasVeggieSide,
      };

      const response = await fetch(`/api/meals/${editingMeal.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mealData),
      });

      if (response.ok) {
        onMealDeleted(); // Refresh the meals list
        handleCancelEdit();
        alert("Meal updated successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating meal:", error);
      alert("Error updating meal. Please try again.");
    } finally {
      setEditLoading(false);
    }
  };

  const meals = Array.from(mealsMap.values());

  if (meals.length === 0) {
    return (
      <div className="empty-state">
        <h3>No meals yet</h3>
        <p>Add your first meal to get started!</p>
      </div>
    );
  }

  return (
    <div>
      <h2>My Meals</h2>
      <div>
        {meals.map((meal) => (
          <div key={meal.id} className="meal-card">
            {editingMeal && editingMeal.id === meal.id ? (
              // Edit form
              <div className="content">
                <h3>Edit Meal: {toTitleCase(editingMeal.title)}</h3>
                <form onSubmit={handleSaveEdit}>
                  <div className="form-group">
                    <label htmlFor="edit-title">Meal Title</label>
                    <input
                      type="text"
                      id="edit-title"
                      className="form-control"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g., Bean Salad"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Ingredients</label>
                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "#666",
                        marginBottom: "10px",
                      }}
                    >
                      Leave quantity empty for items like salt, pepper, olive
                      oil that you only need one of.
                    </p>
                    <div className="ingredient-list">
                      {editIngredients.map((ingredient, index) => (
                        <div key={index} className="ingredient-item">
                          <input
                            type="number"
                            className="form-control quantity-input"
                            placeholder="Qty"
                            value={ingredient.quantity}
                            onChange={(e) =>
                              updateEditIngredient(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Ingredient (e.g., can of chickpeas, salt, olive oil)"
                            value={ingredient.name}
                            onChange={(e) =>
                              updateEditIngredient(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => removeEditIngredient(index)}
                            disabled={editIngredients.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={addEditIngredient}
                      style={{ marginTop: "10px" }}
                    >
                      Add Ingredient
                    </button>
                  </div>

                  <div className="form-group">
                    <label className="veggie-checkbox">
                      <input
                        type="checkbox"
                        checked={editHasVeggieSide}
                        onChange={(e) => setEditHasVeggieSide(e.target.checked)}
                      />
                      Veggie Side
                    </label>
                  </div>

                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={editLoading}
                    >
                      {editLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                      disabled={editLoading}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Normal meal display
              <>
                <div className="meal-title">{toTitleCase(meal.title)}</div>
                <div>
                  {meal.ingredients.map((ingredient, index) => (
                    <div key={index} className="ingredient">
                      {ingredient.quantity && (
                        <span className="ingredient-quantity">
                          {ingredient.quantity}
                        </span>
                      )}
                      <span>{toTitleCase(ingredient.name)}</span>
                    </div>
                  ))}
                </div>
                {meal.hasVeggieSide && (
                  <div style={{ marginTop: "10px" }}>
                    <span className="veggie-badge">Veggie Side</span>
                  </div>
                )}
                <div
                  style={{ marginTop: "10px", display: "flex", gap: "10px" }}
                >
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleEdit(meal)}
                  >
                    Edit Meal
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(meal.id)}
                  >
                    Delete Meal
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MealList;
