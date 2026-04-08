import {
  pgTable,
  text,
  integer,
  numeric,
  uuid,
  timestamp,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const goalEnum = pgEnum('goal', [
  'lose_weight',
  'maintain',
  'gain_muscle',
  'build_endurance',
]);

export const activityLevelEnum = pgEnum('activity_level', [
  'sedentary',
  'lightly_active',
  'moderately_active',
  'very_active',
]);

export const mealTypeEnum = pgEnum('meal_type', [
  'breakfast',
  'lunch',
  'dinner',
  'snack',
]);

export const usersProfile = pgTable('users_profile', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  name: text('name').notNull(),
  age: integer('age').notNull(),
  heightCm: integer('height_cm').notNull(),
  weightKg: numeric('weight_kg', { precision: 5, scale: 1 }).notNull(),
  goal: goalEnum('goal').notNull(),
  activityLevel: activityLevelEnum('activity_level').notNull(),
  createdAt: timestamp('created_at').notNull().default(sql`now()`),
  updatedAt: timestamp('updated_at').notNull().default(sql`now()`),
});

export const foodLogs = pgTable('food_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  loggedAt: timestamp('logged_at').notNull().default(sql`now()`),
  logDate: date('log_date').notNull(),
  rawInput: text('raw_input').notNull(),
  foodName: text('food_name').notNull(),
  calories: numeric('calories', { precision: 7, scale: 1 }).notNull(),
  proteinG: numeric('protein_g', { precision: 6, scale: 1 }).notNull(),
  carbsG: numeric('carbs_g', { precision: 6, scale: 1 }).notNull(),
  fatG: numeric('fat_g', { precision: 6, scale: 1 }).notNull(),
  fiberG: numeric('fiber_g', { precision: 6, scale: 1 }).notNull(),
  mealType: mealTypeEnum('meal_type').notNull(),
  notes: text('notes'),
});

export type UserProfile = typeof usersProfile.$inferSelect;
export type NewUserProfile = typeof usersProfile.$inferInsert;
export type FoodLog = typeof foodLogs.$inferSelect;
export type NewFoodLog = typeof foodLogs.$inferInsert;
