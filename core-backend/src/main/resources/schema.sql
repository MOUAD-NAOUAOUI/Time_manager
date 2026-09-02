-- ===========================================================================
-- Intelligent Time Manager - Enterprise PostgreSQL Production Schema
-- ===========================================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    timezone VARCHAR(100) DEFAULT 'UTC',
    role VARCHAR(50) DEFAULT 'ROLE_USER',
    sleep_start_time VARCHAR(10) DEFAULT '22:00',
    sleep_end_time VARCHAR(10) DEFAULT '06:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS sleep_start_time VARCHAR(10) DEFAULT '22:00';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sleep_end_time VARCHAR(10) DEFAULT '06:00';

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(50) NOT NULL DEFAULT 'free',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    stripe_customer_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tasks Table (Enhanced with Priority, Energy Level & Cumulative Metrics)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    estimated_minutes INT NOT NULL DEFAULT 30,
    actual_minutes_spent INT NOT NULL DEFAULT 0,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    energy_required VARCHAR(20) NOT NULL DEFAULT 'medium',
    category VARCHAR(100) DEFAULT 'general',
    color VARCHAR(20) DEFAULT '#A0785A',
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence VARCHAR(50) NOT NULL DEFAULT 'none';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 4. Time Sessions Table
CREATE TABLE IF NOT EXISTS time_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Persistent Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Chat Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Chat Proposals Table (Structured Audit Trail)
CREATE TABLE IF NOT EXISTS chat_proposals (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected'
    proposed_tasks_json TEXT NOT NULL,
    impact_analysis_json TEXT NOT NULL,
    priority_reasoning_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Persistent AI Generated Daily Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_date DATE NOT NULL,
    start_hour INT NOT NULL DEFAULT 9,
    end_hour INT NOT NULL DEFAULT 18,
    total_planned_minutes INT NOT NULL DEFAULT 0,
    utilization_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    overload_warning BOOLEAN NOT NULL DEFAULT FALSE,
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_schedule_date UNIQUE (user_id, schedule_date)
);

-- 9. Schedule Time Blocks Table
CREATE TABLE IF NOT EXISTS schedule_time_blocks (
    id UUID PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    color VARCHAR(20) DEFAULT '#A0785A',
    priority VARCHAR(20) DEFAULT 'medium',
    energy_required VARCHAR(20) DEFAULT 'medium',
    constraint_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AI Coaching Insights Table
CREATE TABLE IF NOT EXISTS coaching_insights (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    analysis TEXT NOT NULL,
    tips_json TEXT NOT NULL,
    completion_rate DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    total_focus_minutes INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Security Audit Logs Table
CREATE TABLE IF NOT EXISTS security_audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL, -- 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'RATE_LIMITED', etc.
    ip_address VARCHAR(100) NOT NULL,
    user_agent TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-throughput queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_time_sessions_user_id ON time_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_date ON schedules(user_id, schedule_date);
CREATE INDEX IF NOT EXISTS idx_schedule_blocks_schedule_id ON schedule_time_blocks(schedule_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_created ON security_audit_logs(created_at);
