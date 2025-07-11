# MealPrep - Meal Planning Web App

A simple and intuitive web application for planning meals and generating shopping lists. Built with React frontend and Express/SQLite backend.

## Features

- **Add Meals**: Create meals with ingredients, quantities, and veggie side options
- **View Meals**: Browse all your saved meals
- **Weekly Planning**: Plan meals for each day of the week
- **Shopping Lists**: Automatically generate shopping lists with ingredient quantities
- **Veggie Tracking**: Track how many veggie sides you need for the week

## Data Structure

Meals are stored with the following structure:

```javascript
{
  id: 1,
  title: "Bean Salad",
  ingredients: [
    {
      quantity: 1,
      ingredient: "can of chickpeas",
      veggie: true
    },
    {
      quantity: 1,
      ingredient: "cucumber",
      veggie: true
    },
    {
      ingredient: "dijon mustard",
      veggie: false
    }
  ]
}
```

Ingredients without quantities (like "dijon mustard") are stored without the quantity field.

## Installation

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start the development server**:

   ```bash
   # Terminal 1: Start the backend server
   npm run server

   # Terminal 2: Start the frontend development server
   npm run dev
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## Usage

### Adding a Meal

1. Click on the "Add Meal" tab
2. Enter a meal title (e.g., "Bean Salad")
3. Add ingredients:
   - Enter quantity (optional)
   - Enter ingredient name (e.g., "can of chickpeas")
   - Check "Veggie" if it's a vegetable side
4. Click "Add Ingredient" to add more ingredients
5. Click "Add Meal" to save

### Planning Weekly Meals

1. Click on the "Weekly Plan" tab
2. Select meals for each day of the week
3. View the automatically generated shopping list
4. See the total count of veggie sides needed

### Managing Meals

1. Click on the "My Meals" tab
2. View all your saved meals
3. Delete meals you no longer need

## API Endpoints

- `GET /api/meals` - Get all meals
- `POST /api/meals` - Create a new meal
- `DELETE /api/meals/:id` - Delete a meal

## Database

The app uses SQLite for data storage. The database file (`meals.db`) is created automatically when you first run the server.

## Production Build

To build for production:

```bash
npm run build
```

This creates a `dist` folder with the optimized production build.

## Technologies Used

- **Frontend**: React, Vite
- **Backend**: Express.js, SQLite3
- **Styling**: CSS with modern design
- **Database**: SQLite (file-based)

## Project Structure

```
mealprep/
├── src/
│   ├── components/
│   │   ├── AddMeal.jsx
│   │   ├── MealList.jsx
│   │   └── MealPlan.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server/
│   └── index.js
├── package.json
├── vite.config.js
└── README.md
```

## Example Meal

Here's an example of how to add the "Bean Salad" meal mentioned in the requirements:

**Title**: Bean Salad

**Ingredients**:

- Quantity: 1, Ingredient: can of chickpeas, Veggie: ✓
- Quantity: 1, Ingredient: cucumber, Veggie: ✓
- Quantity: 1, Ingredient: can of black beans, Veggie: ✓
- Ingredient: dijon mustard, Veggie: ✗

This will be stored as:

```javascript
{
  "title": "Bean Salad",
  "ingredients": [
    {"quantity": 1, "ingredient": "can of chickpeas", "veggie": true},
    {"quantity": 1, "ingredient": "cucumber", "veggie": true},
    {"quantity": 1, "ingredient": "can of black beans", "veggie": true},
    {"ingredient": "dijon mustard", "veggie": false}
  ]
}
```
