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
      max_tokens: 512,
      messages: [
        {
          role: 'system',
          content: `You are a precise nutrition expert. Extract food and macros from the user's input. Auto-detect meal_type from context clues or time of day. Return ONLY valid JSON with this exact shape, no markdown fences, no extra text:
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

Be accurate with macro estimates using standard nutritional databases. Sum up all items into one entry.`,
        },
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    const text = response.choices[0].message.content ?? '';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean) as ParsedFoodEntry;
  }

  try {
    return await attempt();
  } catch {
    // Retry once
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
    max_tokens: 1024,
    messages: [
      {
        role: 'system',
        content: `You are a knowledgeable nutritionist. Suggest exactly 3 meal options that fit the user's remaining macros and goals. Return ONLY a valid JSON array, no markdown fences:
[
  {
    "meal_name": string,
    "description": string,
    "approx_calories": number,
    "approx_protein": number,
    "approx_carbs": number,
    "approx_fat": number,
    "reasoning": string
  }
]`,
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

  const text = response.choices[0].message.content ?? '[]';
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as MealSuggestion[];
}
