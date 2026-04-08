'use client';

interface RingProps {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  color: string;
  trackColor: string;
  size?: number;
}

function CircularRing({ label, consumed, target, unit, color, trackColor, size = 120 }: RingProps) {
  const clampedConsumed = Math.min(consumed, target);
  const percentage = target > 0 ? clampedConsumed / target : 0;
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);
  const isOver = consumed > target;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={trackColor}
            strokeWidth={8}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isOver ? '#EF4444' : color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="ring-progress"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold text-foreground leading-none">
            {Math.round(consumed)}
          </span>
          <span className="text-[10px] text-muted mt-0.5">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted">
          {isOver ? (
            <span className="text-danger">+{Math.round(consumed - target)} over</span>
          ) : (
            `${Math.round(target - consumed)} left`
          )}
        </p>
      </div>
    </div>
  );
}

interface MacroRingsProps {
  consumed: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  targets: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}

export default function MacroRings({ consumed, targets }: MacroRingsProps) {
  const rings = [
    {
      label: 'Calories',
      consumed: consumed.calories,
      target: targets.calories,
      unit: 'kcal',
      color: '#2D6A4F',
      trackColor: '#D1FAE5',
    },
    {
      label: 'Protein',
      consumed: consumed.protein_g,
      target: targets.protein_g,
      unit: 'g',
      color: '#3B82F6',
      trackColor: '#DBEAFE',
    },
    {
      label: 'Carbs',
      consumed: consumed.carbs_g,
      target: targets.carbs_g,
      unit: 'g',
      color: '#F59E0B',
      trackColor: '#FEF3C7',
    },
    {
      label: 'Fat',
      consumed: consumed.fat_g,
      target: targets.fat_g,
      unit: 'g',
      color: '#8B5CF6',
      trackColor: '#EDE9FE',
    },
  ];

  const caloriePercent = targets.calories > 0
    ? Math.round((consumed.calories / targets.calories) * 100)
    : 0;

  return (
    <div className="card">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="font-heading text-xl font-semibold text-foreground">Today&apos;s Progress</h2>
          <p className="text-sm text-muted mt-0.5">
            {caloriePercent}% of daily goal
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-foreground">{Math.round(consumed.calories)}</p>
          <p className="text-xs text-muted">of {targets.calories} kcal</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {rings.map((ring) => (
          <CircularRing key={ring.label} {...ring} />
        ))}
      </div>
    </div>
  );
}
