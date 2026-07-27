CREATE TABLE _health_check (
    id SERIAL PRIMARY KEY,
    checked_by TEXT NOT NULL,
    checked_at TIMESTAMPTZ NOT NULL
DEFAULT now()
);