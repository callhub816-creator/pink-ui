-- Callhub D1 Schema

-- 1. Users Table (Existing but defining for reference)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, 
    email TEXT, 
    profile_data TEXT, -- JSON: { displayName, bio, avatarUrl, hearts, subscription, streak, last_chat_date }
    created_at TEXT
);
-- Index for fast user lookup (usually primary key is enough)

-- 2. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    body TEXT,
    created_at TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- 'user' or 'assistant'
    metadata TEXT, -- JSON for extra info
    is_deleted INTEGER DEFAULT 0
);
-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_messages_chat_id_created ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id_created ON messages(sender_id, created_at); -- For Rate Limiting

-- 3. Processed Orders (Revenue Security)
CREATE TABLE IF NOT EXISTS processed_orders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    order_id TEXT NOT NULL UNIQUE,
    amount INTEGER,
    created_at TEXT
);
-- Index for Idempotency Check
CREATE INDEX IF NOT EXISTS idx_processed_orders_order_id ON processed_orders(order_id);

-- 4. Audit Logs
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT,
    details TEXT, -- JSON
    created_at TEXT
);
-- Index for Analysis
CREATE INDEX IF NOT EXISTS idx_logs_user_action ON logs(user_id, action);
