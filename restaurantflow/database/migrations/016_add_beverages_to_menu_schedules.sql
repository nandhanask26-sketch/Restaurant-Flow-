-- Migration 016: Allow BEVERAGES in menu_schedules meal_type constraint
ALTER TABLE menu_schedules DROP CONSTRAINT IF EXISTS menu_schedules_meal_type_check;

ALTER TABLE menu_schedules ADD CONSTRAINT menu_schedules_meal_type_check 
  CHECK (meal_type IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS', 'BEVERAGES', 'ALL_DAY'));
