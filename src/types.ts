export type Ingredient = {
  quantity: string | null;
  name: string;
};

export type Meal = {
  id: string;
  title: string;
  ingredients: Ingredient[];
  hasVeggieSide: boolean;
};
