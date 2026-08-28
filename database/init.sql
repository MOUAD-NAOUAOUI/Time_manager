CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE not null,
    password_hash VARCHAR(255) not null,
    timezone varchar(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) not null,
    color VARCHAR(7) DEFAULT '#A0785A',
    estimated_minutes INT DEFAULT 30,
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    embedding vector(1536),
    created_at TIMESTAMP with time zone default CURRENT_TIMESTAMP


);

create table time_sessions(
    id uuid primary key default gen_random_uuid(),
    task_id uuid not null references tasks(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone,
    duration_minutes int,
    created_at timestamp with time zone default CURRENT_TIMESTAMP
);

create table subscriptions(
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    stripe_customer_id varchar(255),
    plan varchar(50) not null default 'free',
    status varchar(50) default 'active',
    created_at timestamp with time zone default CURRENT_TIMESTAMP 
);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_minutes_spent INT DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS energy_required VARCHAR(20) DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS plan VARCHAR(50) NOT NULL DEFAULT 'free';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;