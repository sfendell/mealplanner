# MealPrep

Static meal planning app. Meals live in `meals.txt`; prep steps in `prep.txt`.

## Local development

```bash
npm install
npm run dev
```

## Deploy

Pushes to `main` build and deploy to GitHub Pages via GitHub Actions.

Site: https://sfendell.github.io/mealplanner/

In the repo settings, set **Pages → Source** to **GitHub Actions**.

## Editing meals

Edit `meals.txt` (alphabetized on save via project scripts), commit, and push. No frontend meal editing.
