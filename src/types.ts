export type Ingredient = {
  quantity: string | null;
  name: string;
};

export type Meal = {
  id: string;
  title: string;
  ingredients: Ingredient[];
};

/** Meal title, or special values "eatout" / "leftovers", or empty. */
export type PlanMealValue = string;

export type WeeklyPlanDay = {
  date: string; // YYYY-MM-DD
  day: string; // monday, tuesday, ...
  meal: PlanMealValue; // meal title lowercase, eatout, leftovers, or ""
};

export type WeeklyPlanState = {
  monday: string | null;
  tuesday: string | null;
  wednesday: string | null;
  thursday: string | null;
  friday: string | null;
  saturday: string | null;
  sunday: string | null;
};
