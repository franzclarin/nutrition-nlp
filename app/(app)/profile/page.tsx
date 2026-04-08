'use client';

import { useState, useEffect, useCallback } from 'react';
import { useClerk } from '@clerk/nextjs';
import { calculateMacroTargets, GOAL_LABELS, ACTIVITY_LABELS } from '@/lib/macros';
import { Flame, LogOut, Save, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

type Goal = 'lose_weight' | 'maintain' | 'gain_muscle' | 'build_endurance';
type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active';

interface Profile {
  name: string;
  age: number;
  heightCm: number;
  weightKg: string;
  goal: Goal;
  activityLevel: ActivityLevel;
}

export default function ProfilePage() {
  const { signOut } = useClerk();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<{
    name: string;
    age: string;
    height_cm: string;
    weight_kg: string;
    goal: Goal;
    activity_level: ActivityLevel;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [streak, setStreak] = useState(0);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/profile');
    const data = await res.json();
    if (data.profile) {
      setProfile(data.profile);
      setForm({
        name: data.profile.name,
        age: String(data.profile.age),
        height_cm: String(data.profile.heightCm),
        weight_kg: String(data.profile.weightKg),
        goal: data.profile.goal,
        activity_level: data.profile.activityLevel,
      });
    }
    setLoading(false);
  }, []);

  const fetchStreak = useCallback(async () => {
    const res = await fetch('/api/history');
    const data = await res.json();
    const summaries: { date: string }[] = data.summaries || [];

    // Count consecutive days with logs in the last 7 days
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (summaries.find((s) => s.date === dateStr)) count++;
    }
    setStreak(count);
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchStreak();
  }, [fetchProfile, fetchStreak]);

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
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
      const data = await res.json();
      setProfile(data.profile);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const targets =
    form
      ? calculateMacroTargets(
          Number(form.weight_kg),
          Number(form.height_cm),
          Number(form.age),
          form.goal,
          form.activity_level
        )
      : null;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-7 w-32" />
        <div className="card space-y-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-10 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted mt-0.5">Manage your nutrition settings</p>
      </div>

      {/* Streak card */}
      <div className="card flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
          <Flame size={24} />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{streak} <span className="text-base font-normal text-muted">/ 7</span></p>
          <p className="text-sm text-muted">days logged this week</p>
        </div>
        {streak >= 7 && (
          <span className="ml-auto text-xs font-medium bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
            Perfect week! 🔥
          </span>
        )}
      </div>

      {/* Profile form */}
      <div className="card space-y-4">
        <h2 className="font-heading text-lg font-semibold text-foreground">Personal Info</h2>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Name</label>
          <input
            type="text"
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Age</label>
            <input
              type="number"
              className="input"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Height (cm)</label>
            <input
              type="number"
              className="input"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">Weight (kg)</label>
            <input
              type="number"
              className="input"
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Goal</label>
          <select
            className="input"
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}
          >
            {(Object.entries(GOAL_LABELS) as [Goal, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground block mb-1.5">Activity Level</label>
          <select
            className="input"
            value={form.activity_level}
            onChange={(e) => setForm({ ...form, activity_level: e.target.value as ActivityLevel })}
          >
            {(Object.entries(ACTIVITY_LABELS) as [ActivityLevel, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Macro targets preview */}
      {targets && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-primary" />
            <h2 className="font-heading text-lg font-semibold text-foreground">Daily Targets</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Calories', value: targets.calories, unit: 'kcal', color: 'text-primary' },
              { label: 'Protein', value: targets.protein_g, unit: 'g', color: 'text-blue-600' },
              { label: 'Carbs', value: targets.carbs_g, unit: 'g', color: 'text-amber-600' },
              { label: 'Fat', value: targets.fat_g, unit: 'g', color: 'text-purple-600' },
            ].map((m) => (
              <div key={m.label} className="text-center p-4 bg-gray-50 rounded-xl">
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted mt-0.5">{m.label} / {m.unit}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">
            Targets update in real-time as you adjust your profile.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          className="btn-ghost flex items-center gap-2 text-muted"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  );
}
