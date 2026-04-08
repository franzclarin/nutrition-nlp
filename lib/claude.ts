import Anthropic from '@anthropic-ai/sdk';

function getClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
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

export async function parseFoodEntry(
  rawInput: string,
  timeOfDay?: string
): Promise<ParsedFoodEntry> {
  const systemPrompt = `You are a precise nutrition expert. Extract food and macros from the user's input. Auto-detect meal_type from context clues or time of day. Return ONLY valid JSON, no markdown fences.

The JSON must match this exact shape:
{
  "food_name": string (concise summary, e.g. "2 Scrambled Eggs + Whole Wheat Toast"),
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "meal_type": "breakfast" | "lunch" | "dinner" | "snack",
  "notes": string | null
}

Be accurate with macro estimates using standard nutritional databases. Sum up all items into one entry.`;

  const userMessage = timeOfDay
    ? `Current time: ${timeOfDay}\n\nFood input: ${rawInput}`
    : `Food input: ${rawInput}`;

  async function attempt(): Promise<ParsedFoodEntry> {
    const message = await getClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      messages: [{ role: 'user', content: userMessage }],
      system: systemPrompt,
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return JSON.parse(text.trim()) as ParsedFoodEntry;
  }

  try {
    return await attempt();
  } catch {
    return await attempt();
  }
}

export async function getMealRecommendations(context: {
  remaining: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  goal: string;
  eatenToday: string[];
  timeOfDay: string;
}): Promise<MealSuggestion[]> {
  const systemPrompt = `You are a knowledgeable nutritionist. Suggest exactly 3 meal options that fit the user's remaining macros and goals. Return ONLY a valid JSON array, no markdown fences.

Each suggestion must match:
{
  "meal_name": string,
  "description": string (1-2 sentences, specific and actionable),
  "approx_calories": number,
  "approx_protein": number,
  "approx_carbs": number,
  "approx_fat": number,
  "reasoning": string (1 sentence explaining why this fits their remaining needs)
}`;

  const userMessage = `Time of day: ${context.timeOfDay}
Goal: ${context.goal}
Eaten today: ${context.eatenToday.length > 0 ? context.eatenToday.join(', ') : 'Nothing yet'}
Remaining macros needed:
- Calories: ${context.remaining.calories} kcal
- Protein: ${context.remaining.protein_g}g
- Carbs: ${context.remaining.carbs_g}g
- Fat: ${context.remaining.fat_g}g

Suggest 3 specific meals that would help fill these remaining needs well.`;

  const message = await getClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: userMessage }],
    system: systemPrompt,
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
  return JSON.parse(text.trim()) as MealSuggestion[];
}
