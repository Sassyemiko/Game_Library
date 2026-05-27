CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  referral_code text NOT NULL UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS friendships (
  id text PRIMARY KEY,
  user_id text NOT NULL,
  friend_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_user_friend_unique ON friendships (user_id, friend_id);
CREATE INDEX IF NOT EXISTS friendships_user_id_idx ON friendships (user_id);
