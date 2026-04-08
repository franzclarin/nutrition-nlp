'use client';

import { useState, useRef } from 'react';
import { Sparkles, Send } from 'lucide-react';
import toast from 'react-hot-toast';

interface FoodInputProps {
  onEntryLogged: (entry: Record<string, unknown>) => void;
  prefill?: string;
}

export default function FoodInput({ onEntryLogged, prefill }: FoodInputProps) {
  const [input, setInput] = useState(prefill || '');
  const [mealType, setMealType] = useState('');
  const [loading, setLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  const handleSubmit = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/log-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawInput: input.trim(), mealType: mealType || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log food');
      onEntryLogged(data.entry);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      toast.success(`Logged: ${data.entry.foodName}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not log food';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-primary" />
        <h2 className="font-heading text-lg font-semibold text-foreground">Log a Meal</h2>
      </div>
      <p className="text-xs text-muted mb-3">
        Describe what you ate in plain English — I&apos;ll handle the math.
      </p>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="e.g. 2 scrambled eggs, whole wheat toast with butter, and a glass of OJ"
          className="input resize-none min-h-[80px] pr-12 text-sm"
          disabled={loading}
          rows={3}
        />
        <button
          onClick={handleSubmit}
          disabled={loading || !input.trim()}
          className="absolute right-2.5 bottom-2.5 p-2 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send size={14} />
          )}
        </button>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex gap-2">
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMealType(mealType === m ? '' : m)}
              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                mealType === m
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-muted hover:bg-gray-200'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted hidden sm:inline">⌘↵ to submit</span>
      </div>

      {loading && (
        <div className="mt-4 p-4 rounded-xl bg-accent-light/30 border border-accent/30 animate-pulse-soft">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/40 flex items-center justify-center">
              <Sparkles size={14} className="text-primary" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-3 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
