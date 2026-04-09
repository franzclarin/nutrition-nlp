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

export async function parseFoodMacros(
  input: string,
  timeOfDay?: string
): Promise<ParsedFoodEntry> {
  const client = getOpenAIClient();

  const userContent = timeOfDay
    ? `Current time: ${timeOfDay}\n\nFood input: ${input}`
    : `Food input: ${input}`;

  async function attempt(): Promise<ParsedFoodEntry> {
    const response = await client.chat.completions.create({
      model: 'gpt-5',
      max_completion_tokens: 512,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a precise nutrition expert. Extract food and macros from the user's input. Auto-detect meal_type from context clues or time of day. Return ONLY a valid JSON object with this exact shape:
{
  "food_name": string,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "notes": string | null
}

Be accurate with macro estimates using standard nutritional databases. Sum all items into one entry.`,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    const text = response.choices[0].message.content ?? '';
    console.log('[parseFoodMacros] Raw OpenAI response:', text);

    try {
      const clean = text.replace(/```json|```/g, '').trim();
      return JSON.parse(clean) as ParsedFoodEntry;
    } catch (err) {
      console.error('[parseFoodMacros] JSON parse failed. Raw text was:', text);
      throw new Error('OpenAI returned non-JSON response');
    }
  }

  // Attempt once; on any error retry once before propagating
  try {
    return await attempt();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Don't retry config errors — they won't recover
    if (msg.includes('OPENAI_API_KEY') || msg.includes('401') || msg.includes('403')) {
      throw err;
    }
    console.warn('[parseFoodMacros] First attempt failed, retrying once:', msg);
    return await attempt();
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
    // json_object mode requires a top-level object, not an array —
    // so we ask for { suggestions: [...] } and unwrap below.
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a knowledgeable nutritionist. Based on the user's remaining macros and goal, suggest exactly 3 specific meals. Return a JSON object with a single "suggestions" key containing an array:
{
  "suggestions": [
    {
      "meal_name": string,
      "description": string,
      "approx_calories": number,
      "approx_protein": number,
      "approx_carbs": number,
      "approx_fat": number,
      "reasoning": string
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

  const text = response.choices[0].message.content ?? '{"suggestions":[]}';
  console.log('[getMealRecommendations] Raw OpenAI response:', text);

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { suggestions: MealSuggestion[] };
    return parsed.suggestions ?? [];
  } catch (err) {
    console.error('[getMealRecommendations] JSON parse failed. Raw text was:', text);
    throw new Error('OpenAI returned non-JSON response');
  }
}
