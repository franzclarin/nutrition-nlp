'use client';

import { useState, useEffect, useCallback } from 'react';
import MacroRings from '@/components/MacroRings';
import FoodInput from '@/components/FoodInput';
import FoodLogEntry from '@/components/FoodLogEntry';
import MealSuggestionCard from '@/components/MealSuggestionCard';
import { calculateMacroTargets } from '@/lib/macros';
import { Coffee, Sun, Sunset, Moon } from 'lucide-react';

type Goal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'build_endurance';
type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

interface Profile {
  weightKg: string;
  heightCm: number;
  age: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  name: string;
}

interface FoodLog {
  id: string;
  foodName: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  fiberG: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes: string | null;
  loggedAt: string;
  logDate: string;
}

const MEAL_ORDER: FoodLog['mealType'][] = ['breakfast', 'lunch', 'dinner', 'snack'];

const MEAL_ICONS: Record<string, React.ReactNode> = {
  breakfast: <Coffee size={16} />,
  lunch: <Sun size={16} />,
  dinner: <Sunset size={16} />,
  snack: <Moon size={16} />,
};

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

// localStorage cache key
const CACHE_KEY = 'nutrilog_daily_logs';

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [prefillInput, setPrefillInput] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    const res = await fetch('/api/profile');
    const data = await res.json();
    setProfile(data.profile);
    setLoadingProfile(false);
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    // Try localStorage cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { date, data } = JSON.parse(cached);
        if (date === today) {
          setLogs(data);
          setLoadingLogs(false);
        }
      } catch {
        // ignore
      }
    }
    const res = await fetch(`/api/food-logs?date=${today}`);
    const data = await res.json();
    setLogs(data.logs || []);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, data: data.logs || [] }));
    setLoadingLogs(false);
  }, [today]);

  useEffect(() => {
    fetchProfile();
    fetchLogs();
  }, [fetchProfile, fetchLogs]);

  const handleEntryLogged = (entry: Record<string, unknown>) => {
    const newLogs = [...logs, entry as unknown as FoodLog];
    setLogs(newLogs);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, data: newLogs }));
  };

  const handleDelete = (id: string) => {
    const newLogs = logs.filter((l) => l.id !== id);
    setLogs(newLogs);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, data: newLogs }));
  };

  const handleUpdate = (id: string, updated: Record<string, unknown>) => {
    const newLogs = logs.map((l) => (l.id === id ? { ...l, ...(updated as Partial<FoodLog>) } : l));
    setLogs(newLogs);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, data: newLogs }));
  };

  const targets = profile
    ? calculateMacroTargets(
        Number(profile.weightKg),
        profile.heightCm,
        profile.age,
        profile.goal,
        profile.activityLevel
      )
    : { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 65, fiber_g: 28 };

  const consumed = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + Number(l.calories),
      protein_g: acc.protein_g + Number(l.proteinG),
      carbs_g: acc.carbs_g + Number(l.carbsG),
      fat_g: acc.fat_g + Number(l.fatG),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  // Group logs by meal type
  const logsByMeal = MEAL_ORDER.reduce((acc, mealType) => {
    acc[mealType] = logs.filter((l) => l.mealType === mealType);
    return acc;
  }, {} as Record<string, FoodLog[]>);

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? 'Good morning' : greetingHour < 17 ? 'Good afternoon' : 'Good evening';

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {loadingProfile ? (
          <div className="space-y-1.5">
            <div className="skeleton h-7 w-48" />
            <div className="skeleton h-4 w-32" />
          </div>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-semibold text-foreground">
              {greeting}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-muted">{formattedDate}</p>
          </>
        )}
      </div>

      {/* Macro rings */}
      {loadingProfile ? (
        <div className="card">
          <div className="skeleton h-5 w-40 mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="skeleton rounded-full w-24 h-24" />
                <div className="skeleton h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <MacroRings consumed={consumed} targets={targets} />
      )}

      {/* Food input */}
      <FoodInput
        onEntryLogged={handleEntryLogged}
        prefill={prefillInput}
        key={prefillInput}
      />

      {/* Food log */}
      <div className="card">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Today&apos;s Log</h2>

        {loadingLogs ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-2">
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-4 w-1/2" />
                  <div className="skeleton h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-muted">
            <div className="text-4xl mb-3">🥗</div>
            <p className="text-sm">No meals logged yet today.</p>
            <p className="text-xs mt-1">Use the input above to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {MEAL_ORDER.filter((m) => logsByMeal[m].length > 0).map((mealType) => (
              <div key={mealType}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-muted">{MEAL_ICONS[mealType]}</span>
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">
                    {MEAL_LABEL[mealType]}
                  </h3>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-muted">
                    {Math.round(logsByMeal[mealType].reduce((s, l) => s + Number(l.calories), 0))} kcal
                  </span>
                </div>
                <div className="space-y-0.5">
                  {logsByMeal[mealType].map((entry) => (
                    <FoodLogEntry
                      key={entry.id}
                      entry={entry}
                      onDelete={handleDelete}
                      onUpdate={handleUpdate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Suggestions */}
      <MealSuggestionCard
        onSuggestionSelect={(mealName) => {
          setPrefillInput(mealName);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />
    </div>
  );
}
