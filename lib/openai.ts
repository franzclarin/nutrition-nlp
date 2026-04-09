import OpenAI from 'openai';

export function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface ParsedFoodEntry {
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes: string | null;
}

export interface MealSuggestion {
  meal_name: string;
  description: string;
  approx_calories: number;
  approx_protein: number;
  approx_carbs: number;
  approx_fat: number;
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function robustParseJSON(raw: string): unknown {
  // Attempt 1: direct parse
  try {
    return JSON.parse(raw);
  } catch {}

  // Attempt 2: strip markdown fences
  try {
    const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    return JSON.parse(stripped);
  } catch {}

  // Attempt 3: extract first { ... } block
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch {}

  // Attempt 4: extract and fix common issues (trailing commas, single quotes, unquoted keys)
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const fixed = match[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":');
      return JSON.parse(fixed);
    }
  } catch {}

  console.error('[robustParseJSON] All parse attempts failed. Raw:', raw);
  throw new Error('Could not parse JSON from OpenAI response');
}

function sanitizeMacroResponse(parsed: Record<string, unknown>): ParsedFoodEntry {
  const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

  const toNum = (val: unknown, fallback = 0): number => {
    const n = parseFloat(String(val));
    return isNaN(n) ? fallback : Math.max(0, Math.round(n * 10) / 10);
  };

  const getMealType = (val: unknown): ParsedFoodEntry['meal_type'] => {
    if (validMealTypes.includes(val as ParsedFoodEntry['meal_type'])) {
      return val as ParsedFoodEntry['meal_type'];
    }
    const hour = new Date().getHours();
    if (hour < 10) return 'breakfast';
    if (hour < 14) return 'lunch';
    if (hour < 18) return 'snack';
    return 'dinner';
  };

  return {
    food_name: String(parsed.food_name ?? parsed.name ?? 'Unknown food').slice(0, 200),
    calories: toNum(parsed.calories ?? parsed.kcal),
    protein_g: toNum(parsed.protein_g ?? parsed.protein),
    carbs_g: toNum(parsed.carbs_g ?? parsed.carbs ?? parsed.carbohydrates_g),
    fat_g: toNum(parsed.fat_g ?? parsed.fat),
    fiber_g: toNum(parsed.fiber_g ?? parsed.fiber),
    meal_type: getMealType(parsed.meal_type),
    notes: parsed.notes ? String(parsed.notes).slice(0, 500) : null,
  };
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

export async function parseFoodMacros(input: string): Promise<ParsedFoodEntry> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: 'gpt-5',
    max_completion_tokens: 1000,
    messages: [
      {
        role: 'system',
        content: `You are a precise nutrition expert. The user will describe food they ate.
You must respond with ONLY a raw JSON object. No markdown. No backticks. No explanation.
No preamble. Just the JSON object itself starting with { and ending with }.

Use exactly these keys:
{
  "food_name": "descriptive name of the food",
  "calories": 350,
  "protein_g": 25,
  "carbs_g": 30,
  "fat_g": 10,
  "fiber_g": 3,
  "meal_type": "breakfast",
  "notes": "any relevant notes or empty string"
}

Rules:
- All numeric fields must be plain numbers, never strings or null
- meal_type must be exactly one of: breakfast, lunch, dinner, snack
- If you are unsure of exact macros, make a reasonable estimate
- Never return null for numeric fields, use 0 as fallback
- fiber_g and notes are optional but preferred`,
      },
      {
        role: 'user',
        content: `What are the macros for: ${input}`,
      },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  console.log('[parseFoodMacros] Raw response:', raw);

  const parsed = robustParseJSON(raw) as Record<string, unknown>;
  return sanitizeMacroResponse(parsed);
}

export async function getMealRecommendations(context: {
  remaining: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  goal: string;
  eatenToday: string[];
  timeOfDay: string;
}): Promise<MealSuggestion[]> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model: 'gpt-5',
    max_completion_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: `You are a knowledgeable nutritionist. Based on the user's remaining macros and goal, suggest exactly 3 specific meals.
You must respond with ONLY a raw JSON object. No markdown. No backticks. No preamble.

Use exactly this shape:
{
  "suggestions": [
    {
      "meal_name": "Grilled Chicken Salad",
      "description": "...",
      "approx_calories": 400,
      "approx_protein": 35,
      "approx_carbs": 20,
      "approx_fat": 15,
      "reasoning": "..."
    }
  ]
}`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          remainingMacros: context.remaining,
          todaysLogs: context.eatenToday,
          userGoal: context.goal,
          timeOfDay: context.timeOfDay,
        }),
      },
    ],
  });

  const raw = response.choices[0].message.content ?? '';
  console.log('[getMealRecommendations] Raw response:', raw);

  let parsed = robustParseJSON(raw);

  // Unwrap if the model returned { suggestions: [...] } or any other wrapper object
  if (!Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    const arrKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    parsed = arrKey ? (obj[arrKey] as unknown[]) : [parsed];
  }

  return (parsed as MealSuggestion[]).slice(0, 3);
}
