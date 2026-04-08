# NutriLog

A full-stack macro tracking web app with AI-powered food logging and meal recommendations.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Clerk** for authentication (email/password + Google OAuth)
- **Neon PostgreSQL** + Drizzle ORM
- **Anthropic Claude** (`claude-sonnet-4-20250514`) for natural language food parsing and meal recommendations

## Features

- Natural language food logging ("I had 2 eggs and toast")
- Circular macro progress rings (calories, protein, carbs, fat)
- AI meal recommendations based on remaining macros
- 30-day history with calendar view and weekly bar charts
- Multi-step onboarding with personalized macro target calculation (Mifflin-St Jeor)
- Full CRUD on food log entries
- Streak counter on profile page
- Responsive: sidebar on desktop, bottom tab bar on mobile

## Setup

### 1. Clone & install

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
```

- **Clerk**: Create a project at [clerk.com](https://clerk.com), enable Email/Password + Google OAuth
- **Neon**: Create a database at [neon.tech](https://neon.tech), copy the connection string
- **Anthropic**: Get an API key at [console.anthropic.com](https://console.anthropic.com)

### 3. Database migration

Run the SQL in `drizzle/0000_initial.sql` in your Neon console, or use Drizzle Kit:

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (auth)/sign-in/          # Clerk sign-in page
  (auth)/sign-up/          # Clerk sign-up page
  (app)/dashboard/         # Main dashboard with macro rings + food log
  (app)/history/           # Calendar + weekly charts
  (app)/profile/           # Profile editor + macro targets
  api/log-food/            # POST: NLP → Claude → save food entry
  api/recommend-meal/      # POST: AI meal suggestions
  api/food-logs/           # GET: fetch logs by date
  api/food-logs/[id]/      # DELETE/PUT: CRUD on entries
  api/profile/             # GET/POST: user profile
  api/history/             # GET: 30-day daily summaries
components/
  MacroRings.tsx           # SVG circular progress rings
  FoodInput.tsx            # Natural language input with AI parsing
  FoodLogEntry.tsx         # Individual log entry with edit/delete
  MealSuggestionCard.tsx   # AI meal recommendations
  Sidebar.tsx              # Desktop navigation
  BottomNav.tsx            # Mobile navigation
  OnboardingForm.tsx       # 4-step onboarding wizard
lib/
  db.ts                    # Drizzle + Neon client
  schema.ts                # Database schema
  macros.ts                # BMR / macro target calculations
  claude.ts                # Claude API wrappers
```

## Macro Calculation

Uses the **Mifflin-St Jeor equation** × activity factor, adjusted by goal:

| Goal | Adjustment | Macro Split (P/C/F) |
|------|-----------|---------------------|
| Lose Weight | -500 kcal | 40/30/30% |
| Maintain | 0 kcal | 30/40/30% |
| Gain Muscle | +300 kcal | 35/45/20% |
| Build Endurance | +200 kcal | 25/55/20% |
