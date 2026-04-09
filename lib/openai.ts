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
  console.log('[robustParseJSON] Input length:', raw.length);
  console.log('[robustParseJSON] First 500 chars:', raw.slice(0, 500));

  // Attempt 1: direct parse
  try {
    const result = JSON.parse(raw);
    console.log('[robustParseJSON] Attempt 1 succeeded');
    return result;
  } catch (e1) {
    console.log('[robustParseJSON] Attempt 1 failed:', String(e1));
  }

  // Attempt 2: strip markdown fences
  try {
    const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const result = JSON.parse(stripped);
    console.log('[robustParseJSON] Attempt 2 succeeded');
    return result;
  } catch (e2) {
    console.log('[robustParseJSON] Attempt 2 failed:', String(e2));
  }

  // Attempt 3: extract first { ... } block
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const result = JSON.parse(match[0]);
      console.log('[robustParseJSON] Attempt 3 succeeded');
      return result;
    }
  } catch (e3) {
    console.log('[robustParseJSON] Attempt 3 failed:', String(e3));
  }

  // Attempt 4: fix common JSON issues (trailing commas, single quotes, unquoted keys)
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const fixed = match[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":');
      const result = JSON.parse(fixed);
      console.log('[robustParseJSON] Attempt 4 succeeded');
      return result;
    }
  } catch (e4) {
    console.log('[robustParseJSON] Attempt 4 failed:', String(e4));
  }

  console.error('[robustParseJSON] All attempts failed. Raw was:', raw);
  throw new Error(`Could not parse JSON. Raw response: ${raw.slice(0, 200)}`);
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

  let raw: string | undefined;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-5',
      max_completion_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: `You are a nutrition database. You only output JSON. Never explain. Never reason out loud.

When given a food description, immediately output a single JSON object.
Start your response with { and end with }. Nothing before or after.

Required JSON structure:
{
  "food_name": string,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "notes": string
}

For partial portions like "3/4 of" or "half of", calculate accordingly.
For mixed proteins like "half chicken half beef", average or combine the macros.
Always estimate confidently. Never output null. Use 0 if truly unknown.
Do not include any text outside the JSON object.`,
        },
        {
          role: 'user',
          content: `What are the macros for: ${input}`,
        },
      ],
    });

    raw = response.choices[0].message.content ?? '';
    console.log('[parseFoodMacros] Raw response:', raw);

    return sanitizeMacroResponse(robustParseJSON(raw) as Record<string, unknown>);
  } catch (firstErr) {
    console.log('[parseFoodMacros] First attempt failed, trying self-correction:', String(firstErr));

    const fixResponse = await client.chat.completions.create({
      model: 'gpt-5',
      max_completion_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Convert this nutrition information into a single valid JSON object with these exact keys: food_name, calories, protein_g, carbs_g, fat_g, fiber_g, meal_type, notes. Output ONLY the JSON, nothing else.

Food: ${input}

Previous attempt that failed to parse: ${raw ?? 'no response'}`,
        },
      ],
    });

    const fixedRaw = fixResponse.choices[0].message.content ?? '';
    console.log('[parseFoodMacros] Self-correction raw:', fixedRaw);

    return sanitizeMacroResponse(robustParseJSON(fixedRaw) as Record<string, unknown>);
  }
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
