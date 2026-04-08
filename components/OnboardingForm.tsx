'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Check, Zap, TrendingDown, Dumbbell, Wind } from 'lucide-react';
import toast from 'react-hot-toast';
import { calculateMacroTargets, ACTIVITY_LABELS } from '@/lib/macros';

type Goal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'build_endurance';
type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

interface FormData {
  name: string;
  age: string;
  height_cm: string;
  weight_kg: string;
  goal: Goal | '';
  activity_level: ActivityLevel | '';
}

const GOALS: { value: Goal; label: string; description: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'lose_weight',
    label: 'Lose Weight',
    description: 'Calorie deficit with high protein to preserve muscle',
    icon: <TrendingDown size={22} />,
    color: 'bg-blue-50 border-blue-200 text-blue-700',
  },
  {
    value: 'maintain',
    label: 'Maintain Weight',
    description: 'Balanced macros to sustain current body composition',
    icon: <Zap size={22} />,
    color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    value: 'gain_muscle',
    label: 'Gain Muscle',
    description: 'Calorie surplus with high protein for muscle synthesis',
    icon: <Dumbbell size={22} />,
    color: 'bg-amber-50 border-amber-200 text-amber-700',
  },
  {
    value: 'build_endurance',
    label: 'Build Endurance',
    description: 'High carb fueling for sustained athletic performance',
    icon: <Wind size={22} />,
    color: 'bg-purple-50 border-purple-200 text-purple-700',
  },
];

const ACTIVITY_LEVELS: { value: ActivityLevel; label: string }[] = [
  { value: 'sedentary', label: ACTIVITY_LABELS.sedentary },
  { value: 'lightly_active', label: ACTIVITY_LABELS.lightly_active },
  { value: 'moderately_active', label: ACTIVITY_LABELS.moderately_active },
  { value: 'very_active', label: ACTIVITY_LABELS.very_active },
];

export default function OnboardingForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: '',
    age: '',
    height_cm: '',
    weight_kg: '',
    goal: '',
    activity_level: '',
  });

  const totalSteps = 4;

  const targets =
    form.goal && form.activity_level && form.weight_kg && form.height_cm && form.age
      ? calculateMacroTargets(
          Number(form.weight_kg),
          Number(form.height_cm),
          Number(form.age),
          form.goal as Goal,
          form.activity_level as ActivityLevel
        )
      : null;

  const canProceed = () => {
    if (step === 1) return form.name && form.age && form.height_cm && form.weight_kg;
    if (step === 2) return !!form.goal;
    if (step === 3) return !!form.activity_level;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          age: Number(form.age),
          height_cm: Number(form.height_cm),
          weight_kg: Number(form.weight_kg),
          goal: form.goal,
          activity_level: form.activity_level,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Profile created! Welcome to NutriLog.');
      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-heading text-4xl font-semibold text-primary mb-1">NutriLog</h1>
          <p className="text-muted">Let&apos;s set up your nutrition profile</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                i < step ? 'bg-primary' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="card shadow-card-lg">
          {/* Step 1: Basic info */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-1">About you</h2>
                <p className="text-sm text-muted">We&apos;ll use this to calculate your personalized targets.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Your name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Alex"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Age</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="28"
                    min="13"
                    max="100"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">Height (cm)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="175"
                    value={form.height_cm}
                    onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">Current weight (kg)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="70.5"
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 2: Goal */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-1">Your goal</h2>
                <p className="text-sm text-muted">This determines your macro split and calorie targets.</p>
              </div>
              <div className="space-y-2.5">
                {GOALS.map((g) => (
                  <button
                    key={g.value}
                    onClick={() => setForm({ ...form, goal: g.value })}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-150 flex items-start gap-3 ${
                      form.goal === g.value
                        ? 'border-primary bg-accent-light/20'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${g.color} border`}>{g.icon}</div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{g.label}</p>
                      <p className="text-xs text-muted mt-0.5">{g.description}</p>
                    </div>
                    {form.goal === g.value && (
                      <div className="ml-auto">
                        <Check size={16} className="text-primary" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Activity level */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-1">Activity level</h2>
                <p className="text-sm text-muted">How active are you on a typical week?</p>
              </div>
              <div className="space-y-2">
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setForm({ ...form, activity_level: a.value })}
                    className={`w-full text-left p-3.5 rounded-xl border-2 transition-all duration-150 flex items-center justify-between ${
                      form.activity_level === a.value
                        ? 'border-primary bg-accent-light/20'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-sm font-medium text-foreground">{a.label}</span>
                    {form.activity_level === a.value && <Check size={16} className="text-primary" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Summary */}
          {step === 4 && targets && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="font-heading text-2xl font-semibold text-foreground mb-1">
                  Your daily targets, {form.name.split(' ')[0]}
                </h2>
                <p className="text-sm text-muted">Based on your profile and goals.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Calories', value: targets.calories, unit: 'kcal', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                  { label: 'Protein', value: targets.protein_g, unit: 'g', color: 'bg-blue-50 border-blue-200 text-blue-700' },
                  { label: 'Carbs', value: targets.carbs_g, unit: 'g', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                  { label: 'Fat', value: targets.fat_g, unit: 'g', color: 'bg-purple-50 border-purple-200 text-purple-700' },
                ].map((m) => (
                  <div key={m.label} className={`p-4 rounded-xl border ${m.color}`}>
                    <p className="text-2xl font-bold">{m.value}</p>
                    <p className="text-xs font-medium opacity-70">{m.label} / {m.unit}</p>
                  </div>
                ))}
              </div>
              <div className="bg-accent-light/30 rounded-xl p-4 text-sm text-foreground">
                <p>
                  <strong>Goal:</strong> {GOALS.find((g) => g.value === form.goal)?.label}
                </p>
                <p className="mt-1">
                  <strong>Activity:</strong> {ACTIVITY_LEVELS.find((a) => a.value === form.activity_level)?.label.split('(')[0].trim()}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="btn-ghost flex items-center gap-1.5 disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Back
            </button>

            {step < totalSteps ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="btn-primary flex items-center gap-1.5"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {loading ? 'Saving...' : "Let's go!"}
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-4">Step {step} of {totalSteps}</p>
      </div>
    </div>
  );
}
