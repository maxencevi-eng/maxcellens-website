-- Colonnes is_bot et human_validated pour le flagging des bots (Supabase SQL Editor)
ALTER TABLE analytics_sessions
  ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS human_validated boolean DEFAULT null;
