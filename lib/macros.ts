export type Goal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'build_endurance';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
};

const GOAL_CALORIE_ADJUSTMENTS: Record<Goal, number> = {
  lose_weight: -500,
  maintain: 0,
  gain_muscle: 300,
  build_endurance: 200,
};

// Macro splits: [protein%, carbs%, fat%]
const GOAL_MACRO_SPLITS: Record<Goal, [number, number, number]> = {
  lose_weight: [0.4, 0.3, 0.3],
  maintain: [0.3, 0.4, 0.3],
  gain_muscle: [0.35, 0.45, 0.2],
  build_endurance: [0.25, 0.55, 0.2],
};

export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female' = 'male'
): number {
  // Mifflin-St Jeor
  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calculateMacroTargets(
  weightKg: number,
  heightCm: number,
  age: number,
  goal: Goal,
  activityLevel: ActivityLevel,
  sex: 'male' | 'female' = 'male'
): MacroTargets {
  const bmr = calculateBMR(weightKg, heightCm, age, sex);
  const tdee = bmr * ACTIVITY_FACTORS[activityLevel];
  const targetCalories = Math.round(tdee + GOAL_CALORIE_ADJUSTMENTS[goal]);

  const [proteinPct, carbsPct, fatPct] = GOAL_MACRO_SPLITS[goal];

  // Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g
  const proteinG = Math.round((targetCalories * proteinPct) / 4);
  const carbsG = Math.round((targetCalories * carbsPct) / 4);
  const fatG = Math.round((targetCalories * fatPct) / 9);

  // Fiber: ~14g per 1000 calories
  const fiberG = Math.round((targetCalories / 1000) * 14);

  return {
    calories: targetCalories,
    protein_g: proteinG,
    carbs_g: carbsG,
    fat_g: fatG,
    fiber_g: fiberG,
  };
}

export const GOAL_LABELS: Record<Goal, string> = {
  lose_weight: 'Lose Weight',
  maintain: 'Maintain Weight',
  gain_muscle: 'Gain Muscle',
  build_endurance: 'Build Endurance',
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job, little exercise)',
  lightly_active: 'Lightly Active (1–3 days/week)',
  moderately_active: 'Moderately Active (3–5 days/week)',
  very_active: 'Very Active (6–7 days/week)',
};
