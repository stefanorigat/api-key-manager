# Authentication Setup Guide

This guide explains how to set up and use the authentication system for the API Key Management dashboard.

## Overview

The authentication system uses:
- **Supabase** for database storage
- **bcryptjs** for password hashing
- **Session/Local Storage** for session management
- **Modal-based login** interface

## Setup Instructions

### 1. Create the Users Table in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Create users table for authentication
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login TIMESTAMPTZ
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
```

### 2. Create Test Users

You need to hash passwords using bcrypt before inserting them. Here are two methods:

#### Method A: Using Node.js Script

Create a file `hash-password.js`:

```javascript
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const hash = await bcrypt.hash(password, 10);
  console.log('Password:', password);
  console.log('Hash:', hash);
}

// Change 'your-password' to your desired password
hashPassword('admin123');
```

Run it:
```bash
node hash-password.js
```

#### Method B: Online Tool

1. Go to [bcrypt-generator.com](https://bcrypt-generator.com/)
2. Enter your password (e.g., "admin123")
3. Set rounds to 10
4. Copy the generated hash

#### Insert User with Hashed Password

```sql
-- Example with password "admin123"
-- Hash: $2b$10$rKvN5xCqYPp0LMlNqZF6JeYP1TqGbxWKqYMvmFxGE5m0g8h3Y7KqG
INSERT INTO users (email, password_hash, name) VALUES
  ('admin@example.com', '$2b$10$rKvN5xCqYPp0LMlNqZF6JeYP1TqGbxWKqYMvmFxGE5m0g8h3Y7KqG', 'Admin User');

-- Add more users as needed
INSERT INTO users (email, password_hash, name) VALUES
  ('user@example.com', '$2b$10$YOUR_HASH_HERE', 'Regular User');
```

### 3. Test the Login System

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard`

3. You should see the login modal automatically

4. Use the test credentials:
   - **Email**: `admin@example.com`
   - **Password**: `admin123`

5. Check "Remember me" if you want to stay logged in

## Features

### ✅ Login Modal
- Clean, professional design matching the Milano Cortina 2026 theme
- Email and password fields
- "Remember me" checkbox
- Error message display
- Cannot be dismissed (no close button)

### ✅ Session Management
- **Remember Me Checked**: Uses `localStorage` (persists across browser sessions)
- **Remember Me Unchecked**: Uses `sessionStorage` (cleared when browser closes)
- Automatic session restoration on page load

### ✅ User Avatar Dropdown
- Displays user's first initial or name
- Shows full name and email
- Logout button

### ✅ Protected Dashboard
- Automatically shows login modal when not authenticated
- Redirects to login on logout
- All API key operations require authentication

## How It Works

### Login Flow

1. User enters email and password
2. System fetches user from Supabase `users` table
3. Password is compared with stored hash using bcrypt
4. On success:
   - User session is stored (localStorage or sessionStorage)
   - Login modal closes
   - API keys are loaded
   - User avatar appears in header

### Logout Flow

1. User clicks "Logout" from avatar dropdown
2. Session is cleared from both storages
3. Login modal appears
4. API keys are cleared from state

### Session Persistence

```typescript
// Check if user is logged in
const currentUser = getCurrentUser();

// Returns user object if session exists:
// {
//   id: "uuid",
//   email: "admin@example.com",
//   name: "Admin User"
// }
```

## Security Considerations

### ⚠️ Important Notes

1. **Password Hashing**: This implementation hashes passwords client-side for simplicity. In production, you should:
   - Hash passwords server-side
   - Use secure API endpoints
   - Never expose password hashes

2. **Session Storage**: Uses localStorage by default (persistent sessions). Users can uncheck "Remember Me" to use sessionStorage (session-only). For production:
   - Implement JWT tokens with expiration
   - Use HTTP-only cookies instead of browser storage
   - Add automatic session refresh
   - Implement refresh token rotation

3. **User Table Access**: The current RLS policy allows reading all users. For production:
   ```sql
   -- More restrictive policy
   DROP POLICY "Users can read their own data" ON users;
   
   CREATE POLICY "Users can read only their own data" ON users
     FOR SELECT
     USING (id = auth.uid());
   ```

### 🔐 Production Recommendations

1. **Use Supabase Auth**: Instead of a custom users table:
   ```typescript
   // Use Supabase's built-in auth
   import { createClient } from '@supabase/supabase-js';
   
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'admin@example.com',
     password: 'admin123',
   });
   ```

2. **Server-Side Password Verification**: Create API routes:
   ```typescript
   // app/api/auth/login/route.ts
   import { NextResponse } from 'next/server';
   import bcrypt from 'bcryptjs';
   
   export async function POST(request: Request) {
     const { email, password } = await request.json();
     // Verify password server-side
     // Return JWT token
   }
   ```

3. **Add Rate Limiting**: Prevent brute-force attacks

4. **Add HTTPS**: Always use HTTPS in production

5. **Add 2FA**: Implement two-factor authentication

## Troubleshooting

### "Invalid email or password"

- Check that the user exists in the database
- Verify the password hash is correct
- Ensure email is lowercase in both login and database

### "Cannot read property 'password_hash' of undefined"

- User doesn't exist in database
- Check spelling of email
- Verify users table exists and has data

### Session not persisting

- Check browser console for errors
- Verify localStorage/sessionStorage is not disabled
- Try clearing browser cache

### Password hash not working

- Ensure you're using bcrypt with 10 rounds
- Hash must start with `$2b$10$` or `$2a$10$`
- Verify the full hash (60 characters) is stored in database

## File Structure

```
dandi/
├── lib/
│   ├── auth.ts              # Authentication functions
│   └── supabase.ts          # Supabase client
├── app/
│   └── dashboard/
│       └── page.tsx         # Dashboard with login modal
├── supabase-users-table.sql # SQL to create users table
└── AUTHENTICATION_SETUP.md  # This file
```

## API Reference

### `login(email, password)`
Authenticates user and returns user object or null.

### `storeSession(user, rememberMe = true)`
Stores user session. By default uses localStorage (persistent). Set `rememberMe=false` to use sessionStorage (expires when browser closes).

**Parameters:**
- `user`: User object with id, email, and name
- `rememberMe`: Boolean (default: `true`) - If true uses localStorage, if false uses sessionStorage

### `getCurrentUser()`
Retrieves current user from storage (checks both localStorage and sessionStorage).

### `logout()`
Clears user session from all storage.

### `isAuthenticated()`
Returns boolean indicating if user is logged in.

## Next Steps

- ✅ Test login with different users
- ✅ Test "Remember me" functionality
- ✅ Test logout
- 🔄 Add password reset functionality (optional)
- 🔄 Add user registration (optional)
- 🔄 Implement Supabase Auth (recommended for production)
- 🔄 Add user roles and permissions

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify Supabase connection
3. Check users table exists and has data
4. Ensure environment variables are set correctly

