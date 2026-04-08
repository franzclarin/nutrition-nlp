'use client';

import { useState } from 'react';
import { Wand2, ChevronRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Suggestion {
  meal_name: string;
  description: string;
  approx_calories: number;
  approx_protein: number;
  approx_carbs: number;
  approx_fat: number;
  reasoning: string;
}

interface MealSuggestionCardProps {
  onSuggestionSelect: (mealName: string) => void;
}

export default function MealSuggestionCard({ onSuggestionSelect }: MealSuggestionCardProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/recommend-meal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get suggestions');
      setSuggestions(data.suggestions);
      setHasLoaded(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not fetch suggestions';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wand2 size={16} className="text-primary" />
          <h2 className="font-heading text-lg font-semibold text-foreground">What should I eat next?</h2>
        </div>
        <button
          onClick={fetchSuggestions}
          disabled={loading}
          className="btn-primary text-sm flex items-center gap-2"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Wand2 size={14} />
          )}
          {hasLoaded ? 'Refresh' : 'Suggest'}
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-100 space-y-2">
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && suggestions.length === 0 && !hasLoaded && (
        <div className="text-center py-8 text-muted">
          <Wand2 size={32} className="mx-auto mb-3 text-accent opacity-60" />
          <p className="text-sm">Click &quot;Suggest&quot; to get personalized meal ideas based on your remaining macros.</p>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <div className="space-y-3 animate-fade-in">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSuggestionSelect(s.meal_name + ' — ' + s.description)}
              className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-accent hover:bg-accent-light/20 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-foreground">{s.meal_name}</p>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{s.description}</p>
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs font-medium text-foreground">{s.approx_calories} kcal</span>
                    <span className="text-xs text-muted">P: {s.approx_protein}g</span>
                    <span className="text-xs text-muted">C: {s.approx_carbs}g</span>
                    <span className="text-xs text-muted">F: {s.approx_fat}g</span>
                  </div>
                  <p className="text-xs text-primary mt-2 italic">{s.reasoning}</p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted shrink-0 mt-0.5 group-hover:text-primary transition-colors"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
