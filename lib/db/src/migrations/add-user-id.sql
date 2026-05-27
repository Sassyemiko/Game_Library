-- Per-user libraries: assign existing rows to guest preview bucket, then enforce NOT NULL.
ALTER TABLE games ADD COLUMN IF NOT EXISTS user_id text;
UPDATE games SET user_id = 'guest' WHERE user_id IS NULL;
ALTER TABLE games ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS games_user_id_idx ON games (user_id);
