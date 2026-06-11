-- Feature 2: Chess Platform Integrations — Lichess & Chess.com usernames
-- Adds two columns for storing external chess platform usernames on students.
-- Frontend renders clickable links to https://lichess.org/@/{username}
-- and https://www.chess.com/member/{username}.

ALTER TABLE students ADD COLUMN IF NOT EXISTS lichess_username TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS chesscom_username TEXT DEFAULT '';
