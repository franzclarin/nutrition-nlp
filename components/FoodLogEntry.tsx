'use client';

import { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface FoodLogEntryProps {
  entry: {
    id: string;
    foodName: string;
    calories: string;
    proteinG: string;
    carbsG: string;
    fatG: string;
    fiberG: string;
    mealType: string;
    notes: string | null;
    loggedAt: Date | string;
  };
  onDelete: (id: string) => void;
  onUpdate: (id: string, updated: Record<string, unknown>) => void;
}

const MEAL_BADGE_CLASS: Record<string, string> = {
  breakfast: 'meal-badge-breakfast',
  lunch: 'meal-badge-lunch',
  dinner: 'meal-badge-dinner',
  snack: 'meal-badge-snack',
};

export default function FoodLogEntry({ entry, onDelete, onUpdate }: FoodLogEntryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fields, setFields] = useState({
    food_name: entry.foodName,
    calories: Number(entry.calories),
    protein_g: Number(entry.proteinG),
    carbs_g: Number(entry.carbsG),
    fat_g: Number(entry.fatG),
    fiber_g: Number(entry.fiberG),
    meal_type: entry.mealType,
    notes: entry.notes || '',
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/food-logs/${entry.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDelete(entry.id);
      toast.success('Entry deleted');
    } catch {
      toast.error('Failed to delete entry');
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(`/api/food-logs/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onUpdate(entry.id, data.entry);
      setIsEditing(false);
      toast.success('Entry updated');
    } catch {
      toast.error('Failed to update entry');
    }
  };

  const loggedTime = new Date(entry.loggedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isEditing) {
    return (
      <div className="animate-fade-in bg-accent-light/30 border border-accent rounded-xl p-4 space-y-3">
        <input
          className="input text-sm"
          value={fields.food_name}
          onChange={(e) => setFields({ ...fields, food_name: e.target.value })}
          placeholder="Food name"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(['calories', 'protein_g', 'carbs_g', 'fat_g'] as const).map((k) => (
            <div key={k}>
              <label className="text-xs text-muted block mb-1">
                {k.replace('_g', '').replace('_', ' ')}
                {k !== 'calories' ? ' (g)' : ' (kcal)'}
              </label>
              <input
                type="number"
                className="input text-sm"
                value={fields[k]}
                onChange={(e) => setFields({ ...fields, [k]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            className="input text-sm flex-1"
            value={fields.meal_type}
            onChange={(e) => setFields({ ...fields, meal_type: e.target.value })}
          >
            {['breakfast', 'lunch', 'dinner', 'snack'].map((m) => (
              <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
          <input
            className="input text-sm flex-1"
            value={fields.notes}
            onChange={(e) => setFields({ ...fields, notes: e.target.value })}
            placeholder="Notes (optional)"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm flex items-center gap-1.5">
            <X size={14} /> Cancel
          </button>
          <button onClick={handleSave} className="btn-primary text-sm flex items-center gap-1.5">
            <Check size={14} /> Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-slide-in flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group ${isDeleting ? 'opacity-50' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground truncate">{entry.foodName}</span>
          <span className={MEAL_BADGE_CLASS[entry.mealType] || 'meal-badge-snack'}>
            {entry.mealType}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-sm font-semibold text-foreground">{Math.round(Number(entry.calories))} kcal</span>
          <span className="text-xs text-muted">P: {Math.round(Number(entry.proteinG))}g</span>
          <span className="text-xs text-muted">C: {Math.round(Number(entry.carbsG))}g</span>
          <span className="text-xs text-muted">F: {Math.round(Number(entry.fatG))}g</span>
          {entry.notes && (
            <span className="text-xs text-muted italic truncate max-w-[200px]">{entry.notes}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-muted mr-1 hidden sm:inline">{loggedTime}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-accent-light/40 transition-all opacity-0 group-hover:opacity-100"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger-light transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
