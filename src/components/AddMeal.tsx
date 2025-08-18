import React, { useState } from "react";

function AddMeal({ onMealAdded }) {
  const [title, setTitle] = useState("");
  const [ingredients, setIngredients] = useState([{ quantity: "", name: "" }]);
  const [hasVeggieSide, setHasVeggieSide] = useState(false);
  const [loading, setLoading] = useState(false);

  const addIngredient = () => {
    setIngredients([...ingredients, { quantity: "", name: "" }]);
  };

  const removeIngredient = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index, field, value) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients[index] = {
      ...updatedIngredients[index],
      [field]: value,
    };
    setIngredients(updatedIngredients);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      alert("Please enter a meal title");
      return;
    }

    const validIngredients = ingredients.filter((ing) => ing.name.trim());
    if (validIngredients.length === 0) {
      alert("Please add at least one ingredient");
      return;
    }

    setLoading(true);

    try {
      const mealData = {
        title: title.trim(),
        ingredients: validIngredients.map((ing) => ({
          quantity: ing.quantity.trim() || null,
          name: ing.name.trim().toLowerCase(),
        })),
        hasVeggieSide: hasVeggieSide,
      };

      const response = await fetch("/api/meals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mealData),
      });

      if (response.ok) {
        setTitle("");
        setIngredients([{ quantity: "", name: "" }]);
        setHasVeggieSide(false);
        onMealAdded();
        alert("Meal added successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error("Error adding meal:", error);
      alert("Error adding meal. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Add New Meal</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Meal Title</label>
          <input
            type="text"
            id="title"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Bean Salad"
            required
          />
        </div>

        <div className="form-group">
          <label>Ingredients</label>
          <p
            style={{ fontSize: "0.9rem", color: "#666", marginBottom: "10px" }}
          >
            Leave quantity empty for items like salt, pepper, olive oil that you
            only need one of.
          </p>
          <div className="ingredient-list">
            {ingredients.map((ingredient, index) => (
              <div key={index} className="ingredient-item">
                <input
                  type="number"
                  className="form-control quantity-input"
                  placeholder="Qty"
                  value={ingredient.quantity}
                  onChange={(e) =>
                    updateIngredient(index, "quantity", e.target.value)
                  }
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ingredient (e.g., can of chickpeas, salt, olive oil)"
                  value={ingredient.name}
                  onChange={(e) =>
                    updateIngredient(index, "name", e.target.value)
                  }
                  required
                />
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => removeIngredient(index)}
                  disabled={ingredients.length === 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={addIngredient}
            style={{ marginTop: "10px" }}
          >
            Add Ingredient
          </button>
        </div>

        <div className="form-group">
          <label className="veggie-checkbox">
            <input
              type="checkbox"
              checked={hasVeggieSide}
              onChange={(e) => setHasVeggieSide(e.target.checked)}
            />
            Veggie Side
          </label>
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Adding..." : "Add Meal"}
        </button>
      </form>
    </div>
  );
}

export default AddMeal;
