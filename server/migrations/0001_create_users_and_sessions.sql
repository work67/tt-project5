-- Usernames are case-insensitive: "Alice" and "alice" are the same account.
CREATE TABLE users (
  username TEXT PRIMARY KEY COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- id is the SHA-256 hash of the session token; the raw token only lives in the cookie.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL REFERENCES users (username) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX sessions_username_idx ON sessions (username);
