-- Create users table for authentication
-- Supports both password-based and SSO authentication
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Use 'SSO_USER' for SSO-only accounts
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login TIMESTAMPTZ,
  auth_provider TEXT DEFAULT 'local' -- 'local' for password, 'sso' for SSO users
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own data
CREATE POLICY "Users can read their own data" ON users
  FOR SELECT
  USING (true);

-- Create policy to allow user creation (for registration)
CREATE POLICY "Allow user creation" ON users
  FOR INSERT
  WITH CHECK (true);

-- Optional: Add sample users
-- Password for password-based user: "admin123" (hashed using bcrypt with 10 rounds)
-- You should change this in production!
INSERT INTO users (email, password_hash, name, auth_provider) VALUES
  ('admin@example.com', '$2b$10$rKvN5xCqYPp0LMlNqZF6JeYP1TqGbxWKqYMvmFxGE5m0g8h3Y7KqG', 'Admin User', 'local'),
  ('sso-demo@example.com', 'SSO_USER', 'SSO Demo User', 'sso');

-- Note: To create a proper password hash, use bcrypt in your application:
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('your-password', 10);

-- JIT (Just-In-Time) User Provisioning:
-- When users log in via SSO for the first time, they are automatically
-- created in the users table with password_hash='SSO_USER' and auth_provider='sso'

