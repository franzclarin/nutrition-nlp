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

const FOOD_PARSE_MODELS = ['gpt-5', 'gpt-4o'] as const;

const FOOD_PARSE_USER_PROMPT = (input: string) =>
  `You are a nutrition expert. Analyze this food and respond with ONLY a JSON object, nothing else. No explanation, no markdown.

Food input: "${input}"

Respond with exactly this JSON structure:
{
  "food_name": "name of food",
  "calories": 500,
  "protein_g": 30,
  "carbs_g": 40,
  "fat_g": 20,
  "fiber_g": 5,
  "meal_type": "dinner",
  "notes": ""
}

For portions like "3/4 of" calculate proportionally.
For mixed proteins like "half chicken half beef" combine the macros.
Use realistic estimates. All numbers must be plain numbers, not strings.`;

export async function parseFoodMacros(input: string): Promise<ParsedFoodEntry> {
  const client = getOpenAIClient();

  for (const model of FOOD_PARSE_MODELS) {
    try {
      const response = await client.chat.completions.create({
        model,
        max_completion_tokens: 1000,
        messages: [{ role: 'user', content: FOOD_PARSE_USER_PROMPT(input) }],
      });

      console.log(`[parseFoodMacros] Full response from ${model}:`, JSON.stringify({
        id: response.id,
        model: response.model,
        finish_reason: response.choices[0]?.finish_reason,
        content: response.choices[0]?.message?.content,
        refusal: response.choices[0]?.message?.refusal,
        usage: response.usage,
      }));

      const choice = response.choices[0];

      if (choice.message.refusal) {
        console.error(`[parseFoodMacros] ${model} refused:`, choice.message.refusal);
        continue;
      }

      if (!choice.message.content || choice.message.content.trim().length === 0) {
        console.error(`[parseFoodMacros] ${model} returned empty content. finish_reason: ${choice.finish_reason}`);
        continue;
      }

      const raw = choice.message.content.trim();
      console.log(`[parseFoodMacros] Success with model: ${model}`);
      return sanitizeMacroResponse(robustParseJSON(raw) as Record<string, unknown>);
    } catch (err) {
      console.error(`[parseFoodMacros] ${model} error:`, String(err));
      continue;
    }
  }

  throw new Error('All models failed to return a valid response');
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
        role: 'user',
        content: `You are a nutrition coach. Suggest exactly 3 meals based on the data below. Respond with ONLY a JSON object, no explanation, no markdown.

${JSON.stringify({
  remainingMacros: context.remaining,
  todaysLogs: context.eatenToday,
  userGoal: context.goal,
  timeOfDay: context.timeOfDay,
}, null, 2)}

Respond with exactly this structure:
{
  "suggestions": [
    {
      "meal_name": "Grilled Chicken Salad",
      "description": "Brief description",
      "approx_calories": 400,
      "approx_protein": 35,
      "approx_carbs": 20,
      "approx_fat": 15,
      "reasoning": "Why this fits the remaining macros"
    }
  ]
}`,
      },
    ],
  });

  console.log('[getMealRecommendations] Full response:', JSON.stringify({
    id: response.id,
    model: response.model,
    finish_reason: response.choices[0]?.finish_reason,
    content: response.choices[0]?.message?.content,
    refusal: response.choices[0]?.message?.refusal,
    usage: response.usage,
  }));

  const recChoice = response.choices[0];
  if (recChoice.message.refusal) {
    throw new Error(`Model refused recommendations request: ${recChoice.message.refusal}`);
  }
  if (!recChoice.message.content || recChoice.message.content.trim().length === 0) {
    throw new Error(`Model returned empty recommendations. finish_reason: ${recChoice.finish_reason}`);
  }

  const raw = recChoice.message.content.trim();
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
