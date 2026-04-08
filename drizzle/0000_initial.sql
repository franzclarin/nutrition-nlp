-- NutriLog initial schema

CREATE TYPE "goal" AS ENUM ('lose_weight', 'maintain', 'gain_muscle', 'build_endurance');
CREATE TYPE "activity_level" AS ENUM ('sedentary', 'lightly_active', 'moderately_active', 'very_active');
CREATE TYPE "meal_type" AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');

CREATE TABLE IF NOT EXISTS "users_profile" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clerk_user_id" text UNIQUE NOT NULL,
  "name" text NOT NULL,
  "age" integer NOT NULL,
  "height_cm" integer NOT NULL,
  "weight_kg" numeric(5, 1) NOT NULL,
  "goal" "goal" NOT NULL,
  "activity_level" "activity_level" NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "food_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "logged_at" timestamp DEFAULT now() NOT NULL,
  "log_date" date NOT NULL,
  "raw_input" text NOT NULL,
  "food_name" text NOT NULL,
  "calories" numeric(7, 1) NOT NULL,
  "protein_g" numeric(6, 1) NOT NULL,
  "carbs_g" numeric(6, 1) NOT NULL,
  "fat_g" numeric(6, 1) NOT NULL,
  "fiber_g" numeric(6, 1) NOT NULL,
  "meal_type" "meal_type" NOT NULL,
  "notes" text
);

CREATE INDEX IF NOT EXISTS "food_logs_user_date_idx" ON "food_logs" ("user_id", "log_date");
