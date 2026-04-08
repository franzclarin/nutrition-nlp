'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DailySummary {
  date: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  entry_count: number;
}

interface FoodLog {
  id: string;
  foodName: string;
  calories: string;
  proteinG: string;
  carbsG: string;
  fatG: string;
  mealType: string;
  loggedAt: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: string, b: string) {
  return a === b;
}

export default function HistoryPage() {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [dayLogs, setDayLogs] = useState<FoodLog[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [loadingDay, setLoadingDay] = useState(false);

  const fetchSummaries = useCallback(async () => {
    setLoadingSummaries(true);
    const res = await fetch('/api/history');
    const data = await res.json();
    setSummaries(data.summaries || []);
    setLoadingSummaries(false);
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const fetchDayLogs = async (date: string) => {
    setLoadingDay(true);
    const res = await fetch(`/api/food-logs?date=${date}`);
    const data = await res.json();
    setDayLogs(data.logs || []);
    setLoadingDay(false);
  };

  const handleDayClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    fetchDayLogs(dateStr);
  };

  const summaryMap = new Map(summaries.map((s) => [s.date, s]));

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const monthName = new Date(viewYear, viewMonth).toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  // Weekly averages (last 4 full weeks)
  const weeklyData = Array.from({ length: 4 }).map((_, wi) => {
    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() - wi * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const weekDates: string[] = [];
    for (let d = 0; d < 7; d++) {
      const dd = new Date(weekStart);
      dd.setDate(dd.getDate() + d);
      weekDates.push(dd.toISOString().split('T')[0]);
    }

    const weekSums = weekDates.reduce(
      (acc, date) => {
        const s = summaryMap.get(date);
        if (s) {
          acc.calories += s.calories;
          acc.protein += s.protein_g;
          acc.carbs += s.carbs_g;
          acc.days += 1;
        }
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, days: 0 }
    );

    return {
      week: weekLabel,
      calories: weekSums.days > 0 ? Math.round(weekSums.calories / weekSums.days) : 0,
      protein: weekSums.days > 0 ? Math.round(weekSums.protein / weekSums.days) : 0,
      carbs: weekSums.days > 0 ? Math.round(weekSums.carbs / weekSums.days) : 0,
    };
  }).reverse();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground">History</h1>
        <p className="text-sm text-muted mt-0.5">Your nutrition journey over the past 30 days</p>
      </div>

      {/* Weekly chart */}
      <div className="card">
        <h2 className="font-heading text-lg font-semibold text-foreground mb-4">Weekly Averages</h2>
        {loadingSummaries ? (
          <div className="skeleton h-48 w-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '12px',
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="calories" name="Calories" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="protein" name="Protein (g)" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="carbs" name="Carbs (g)" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Calendar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-foreground">{monthName}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => {
                const d = new Date(viewYear, viewMonth - 1);
                setViewMonth(d.getMonth());
                setViewYear(d.getFullYear());
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-muted"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => {
                const d = new Date(viewYear, viewMonth + 1);
                setViewMonth(d.getMonth());
                setViewYear(d.getFullYear());
              }}
              disabled={viewMonth === today.getMonth() && viewYear === today.getFullYear()}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-muted disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const summary = summaryMap.get(dateStr);
            const isToday = isSameDay(dateStr, today.toISOString().split('T')[0]);
            const isSelected = selectedDate === dateStr;
            const isFuture = new Date(dateStr) > today;

            return (
              <button
                key={day}
                onClick={() => !isFuture && handleDayClick(dateStr)}
                disabled={isFuture}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-xs font-medium transition-all duration-150 ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm'
                    : isToday
                    ? 'bg-accent-light text-primary font-bold'
                    : summary
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : isFuture
                    ? 'text-gray-200 cursor-default'
                    : 'text-muted hover:bg-gray-50'
                }`}
              >
                <span>{day}</span>
                {summary && !isSelected && (
                  <span className="text-[9px] opacity-60 leading-none mt-0.5">
                    {Math.round(summary.calories / 100) / 10}k
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="card animate-slide-in">
          <h2 className="font-heading text-lg font-semibold text-foreground mb-1">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </h2>

          {summaryMap.get(selectedDate) && (
            <div className="grid grid-cols-4 gap-2 mt-3 mb-4">
              {[
                { label: 'Cal', value: Math.round(summaryMap.get(selectedDate)!.calories), unit: 'kcal', color: 'text-primary' },
                { label: 'Protein', value: Math.round(summaryMap.get(selectedDate)!.protein_g), unit: 'g', color: 'text-blue-600' },
                { label: 'Carbs', value: Math.round(summaryMap.get(selectedDate)!.carbs_g), unit: 'g', color: 'text-amber-600' },
                { label: 'Fat', value: Math.round(summaryMap.get(selectedDate)!.fat_g), unit: 'g', color: 'text-purple-600' },
              ].map((m) => (
                <div key={m.label} className="text-center p-3 bg-gray-50 rounded-xl">
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-[10px] text-muted">{m.label} / {m.unit}</p>
                </div>
              ))}
            </div>
          )}

          {loadingDay ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-10 rounded-xl" />
              ))}
            </div>
          ) : dayLogs.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">No meals logged this day.</p>
          ) : (
            <div className="space-y-2">
              {dayLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-foreground">{log.foodName}</p>
                    <p className="text-xs text-muted">
                      {log.mealType} • P: {Math.round(Number(log.proteinG))}g C: {Math.round(Number(log.carbsG))}g F: {Math.round(Number(log.fatG))}g
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{Math.round(Number(log.calories))} kcal</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
