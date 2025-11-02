# Keycloak SSO Setup Guide

This guide explains how to set up Single Sign-On (SSO) with Keycloak for your API Key Management dashboard.

## Overview

The SSO implementation uses:
- **OpenID Connect (OIDC)** protocol
- **PKCE** (Proof Key for Code Exchange) for security
- **Authorization Code Flow** for token exchange
- **Keycloak** as the identity provider

## Prerequisites

- Keycloak server installed and running
- Admin access to Keycloak
- Your Next.js application running

## Part 1: Keycloak Configuration

### 1. Create a Realm (if not exists)

1. Log in to your Keycloak Admin Console
2. Click on the realm dropdown (top left)
3. Click "Create Realm"
4. Enter a name (e.g., `my-app`)
5. Click "Create"

### 2. Create a Client

1. In your realm, go to **Clients** in the left menu
2. Click "Create client"
3. Fill in the client details:
   ```
   Client type: OpenID Connect
   Client ID: api-key-dashboard
   Name: API Key Dashboard
   ```
4. Click "Next"

### 3. Configure Client Settings

#### Capability Config:
- ✅ **Client authentication**: ON
- ✅ **Authorization**: OFF
- ✅ **Standard flow**: ON (Authorization Code Flow)
- ✅ **Direct access grants**: OFF
- ✅ **Implicit flow**: OFF

Click "Next"

#### Login Settings:
```
Root URL: http://localhost:3000
Home URL: http://localhost:3000/dashboard
Valid redirect URIs: http://localhost:3000/api/auth/callback
Valid post logout redirect URIs: http://localhost:3000
Web origins: http://localhost:3000
```

Click "Save"

### 4. Get Client Credentials

1. Go to the "Credentials" tab of your client
2. Copy the **Client Secret** (you'll need this)

### 5. Create a Test User

1. Go to **Users** in the left menu
2. Click "Add user"
3. Fill in the details:
   ```
   Username: testuser
   Email: testuser@example.com
   First name: Test
   Last name: User
   Email verified: ON
   ```
4. Click "Create"
5. Go to the "Credentials" tab
6. Click "Set password"
7. Enter a password (e.g., `password123`)
8. Turn OFF "Temporary"
9. Click "Save"

### 6. Configure Client Scopes (Optional)

To get user information in the token:

1. Go to **Client scopes** → **profile**
2. Ensure the following mappers are present:
   - `username`
   - `email`
   - `given name`
   - `family name`

## Part 2: Application Configuration

### 1. Add Environment Variables

You need to manually create or edit `.env.local` (it's in .gitignore):

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Keycloak SSO Configuration
NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8080/realms/my-app
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=api-key-dashboard
KEYCLOAK_CLIENT_SECRET=your-client-secret-from-keycloak
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important values to replace:**
- `your-project.supabase.co` - Your Supabase project URL
- `your-anon-key` - Your Supabase anon key
- `my-app` - Your Keycloak realm name
- `api-key-dashboard` - Your Keycloak client ID
- `your-client-secret-from-keycloak` - The client secret from step 4

### 2. Verify Keycloak Issuer URL

Your issuer URL should follow this format:
```
http(s)://[keycloak-host]/realms/[realm-name]
```

Examples:
- Local: `http://localhost:8080/realms/my-app`
- Production: `https://auth.example.com/realms/production`

Test it by visiting:
```
http://localhost:8080/realms/my-app/.well-known/openid-configuration
```

You should see a JSON response with OAuth endpoints.

### 3. Restart Your Application

```bash
npm run dev
```

## Part 3: Just-In-Time (JIT) User Provisioning

### How It Works

When a user logs in via SSO for the first time:

1. **Authentication**: User authenticates with Keycloak
2. **Token Exchange**: Your app receives user information from Keycloak
3. **User Lookup**: The app checks if the user exists in your Supabase `users` table
4. **Auto-Creation**: If the user doesn't exist:
   - A new user record is automatically created
   - `password_hash` is set to `'SSO_USER'` (they can't login with password)
   - `auth_provider` is set to `'sso'`
   - `last_login` timestamp is recorded
5. **Login**: If the user already exists:
   - The `last_login` timestamp is updated
   - User is logged in

### Benefits

✅ **Seamless Onboarding**: Users don't need to register separately  
✅ **Single Source of Truth**: Keycloak manages user identity  
✅ **Automatic Sync**: User data from Keycloak is synced to your database  
✅ **Security**: SSO users can't use password-based login  

### Database Schema

The `users` table supports both authentication methods:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,  -- 'SSO_USER' for SSO users
  name TEXT,
  auth_provider TEXT DEFAULT 'local',  -- 'local' or 'sso'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);
```

### Identifying SSO Users

You can query SSO users:

```sql
-- Get all SSO users
SELECT * FROM users WHERE auth_provider = 'sso';

-- Get all password-based users
SELECT * FROM users WHERE auth_provider = 'local';
```

### Security Note

SSO users have `password_hash = 'SSO_USER'`, which means:
- They cannot login using email/password
- They must use SSO to authenticate
- Their identity is managed by Keycloak

### Session Persistence

**SSO sessions use localStorage (persistent)**:
- Sessions persist across browser restarts
- Users stay logged in until they explicitly log out
- This matches standard SSO behavior in enterprise applications
- Consistent with password-based login when "Remember Me" is checked

## Part 4: Testing SSO Login

### 1. Test the Login Flow

1. Navigate to `http://localhost:3000/dashboard`
2. You'll see the login modal
3. Click "Login with SSO"
4. You'll be redirected to Keycloak
5. Enter credentials:
   - Username: `testuser`
   - Password: `password123` (or whatever you set)
6. Click "Sign In"
7. You'll be redirected back to the dashboard
8. You should be logged in!

### 2. Verify JIT User Creation

After successful SSO login:

1. **Check Browser Console**: You'll see logs like:
   ```
   ✓ SSO user created successfully: user@example.com
   ```
   OR
   ```
   ✓ Existing SSO user logged in: user@example.com
   ```

2. **Check Supabase Users Table**:
   ```sql
   SELECT * FROM users WHERE auth_provider = 'sso';
   ```
   You should see the new user with:
   - `password_hash = 'SSO_USER'`
   - `auth_provider = 'sso'`
   - `last_login` timestamp

3. **Check LocalStorage**: User session is stored in `localStorage`

### 3. Test SSO Logout

After logging in via SSO:

1. **Click the user avatar** in the top-right corner
2. **Click "Logout"**
3. You should be:
   - Redirected to Keycloak logout page (briefly)
   - Logged out from Keycloak
   - Redirected back to your app (login modal shown)

**Verify Complete Logout:**
1. Try logging in again via SSO
2. You should be prompted to enter credentials again (not auto-logged in)
3. This confirms you were properly logged out from Keycloak

**Difference from Password Logout:**
- **Password users**: Logout → Login modal (instant)
- **SSO users**: Logout → Keycloak → Back to app → Login modal

## How It Works

### 1. Login Initiation
```
User clicks "Login with SSO"
  ↓
Frontend calls /api/auth/sso-init
  ↓
Server generates:
  - code_verifier (PKCE)
  - code_challenge
  - state (CSRF protection)
  ↓
Returns authorization URL
  ↓
User redirected to Keycloak login
```

### 2. Authentication
```
User enters credentials in Keycloak
  ↓
Keycloak validates credentials
  ↓
Keycloak redirects to /api/auth/callback with code
```

### 3. Token Exchange
```
Callback page receives code
  ↓
Frontend calls /api/auth/exchange with:
  - code
  - code_verifier
  - state
  ↓
Server exchanges code for tokens
  ↓
Server gets user info from Keycloak
  ↓
Server creates/updates user in database
  ↓
Returns user session to frontend
  ↓
Stores user with authProvider='sso' and idToken
  ↓
User logged in!
```

### 4. Logout Flow
```
User clicks "Logout"
  ↓
App checks authProvider
  ↓
┌─ Password User ────────┐  ┌─ SSO User ──────────────────────┐
│ Clear local session    │  │ Clear local session             │
│ Show login modal       │  │ Build Keycloak logout URL       │
│ (Done)                 │  │ Include id_token_hint           │
└────────────────────────┘  │ Redirect to Keycloak logout     │
                            │   ↓                              │
                            │ Keycloak logs out user          │
                            │   ↓                              │
                            │ Redirect back to app            │
                            │   ↓                              │
                            │ Show login modal                │
                            └─────────────────────────────────┘
```

## Security Features

### ✅ PKCE (Proof Key for Code Exchange)
- Prevents authorization code interception attacks
- Uses `code_verifier` and `code_challenge`

### ✅ State Parameter
- Prevents CSRF attacks
- Validates that the callback matches the original request

### ✅ Secure Token Storage
- Access tokens stored server-side or in HTTP-only cookies
- Only user info stored in client storage

### ✅ Client Secret
- Never exposed to the browser
- Only used in server-side API routes

## Common Issues & Troubleshooting

### "Failed to connect to Keycloak server"

- Check `NEXT_PUBLIC_KEYCLOAK_ISSUER` is correct
- Verify Keycloak is running
- Test the `.well-known/openid-configuration` endpoint

### "Invalid redirect URI"

- Check Keycloak client settings
- Ensure `http://localhost:3000/api/auth/callback` is in "Valid redirect URIs"
- Match the protocol (http vs https)

### "State mismatch"

- Browser cleared sessionStorage during login
- Try again with a fresh login
- Check browser console for errors

### "Missing client secret"

- Verify `KEYCLOAK_CLIENT_SECRET` is set in `.env.local`
- Check it matches the value in Keycloak
- Restart the dev server after adding it

### "User not created in database" (JIT Provisioning Failure)

**Symptoms**: User can login via SSO but doesn't appear in users table

**Solutions**:
1. Check Supabase connection in `.env.local`
2. Verify `users` table exists with `auth_provider` column
3. Check RLS policies allow inserts:
   ```sql
   CREATE POLICY "Allow user creation" ON users
     FOR INSERT WITH CHECK (true);
   ```
4. Review server logs for detailed error messages
5. Run the updated SQL schema from `supabase-users-table.sql`

### Error: "response parameter 'iss' (issuer) missing"

**This has been resolved!** The project uses `openid-client` v5 which handles this gracefully.

If you still encounter this:
- Restart Next.js: `Ctrl+C` then `npm run dev`
- Clear sessionStorage: DevTools → Console → `sessionStorage.clear()`

## Production Considerations

### 1. HTTPS Only
```bash
NEXT_PUBLIC_KEYCLOAK_ISSUER=https://auth.example.com/realms/production
NEXT_PUBLIC_APP_URL=https://your-app.com
```

### 2. Update Keycloak Redirect URIs
```
Valid redirect URIs: https://your-app.com/api/auth/callback
Valid post logout redirect URIs: https://your-app.com
Web origins: https://your-app.com
```

### 3. Secure Session Storage

Instead of localStorage, use:
- HTTP-only cookies
- Server-side sessions
- JWT tokens with short expiration

### 4. Token Refresh

Implement token refresh for long-lived sessions:
```typescript
// Check if token expired
if (tokens.expiresAt < Date.now()) {
  // Refresh token
  const newTokens = await client.refresh(tokens.refreshToken);
  // Update stored tokens
}
```

### 5. Logout Implementation

✅ **Already Implemented!** The application automatically handles SSO logout:

**How it works:**
1. User clicks "Logout" in the dashboard
2. App checks if user logged in via SSO (`authProvider === 'sso'`)
3. If SSO: Clears local session and redirects to Keycloak logout
4. Keycloak logs out the user from all applications
5. Keycloak redirects back to your app

**Implementation:**
```typescript
// lib/sso-auth.ts
export function initiateSSOLogout(idToken?: string) {
  const logoutUrl = new URL(`${issuerUrl}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set('client_id', clientId);
  logoutUrl.searchParams.set('post_logout_redirect_uri', appUrl);
  if (idToken) {
    logoutUrl.searchParams.set('id_token_hint', idToken);
  }
  window.location.href = logoutUrl.toString();
}
```

**User Experience:**
- Password users: Logout → See login modal
- SSO users: Logout → Redirect to Keycloak → Back to app (logged out)

## Advanced Configuration

### Custom Claims

To get additional user information:

1. In Keycloak, go to **Client scopes**
2. Create a new scope or edit existing
3. Add mappers for custom attributes
4. Assign the scope to your client

### Role-Based Access

1. Create roles in Keycloak
2. Assign roles to users
3. Access roles in the token:
```typescript
const userinfo = await client.userinfo(tokenSet.access_token);
const roles = userinfo.realm_access?.roles || [];
```

### Multiple Realms

Support different environments:
```bash
# Development
NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8080/realms/dev

# Staging
NEXT_PUBLIC_KEYCLOAK_ISSUER=https://auth-staging.example.com/realms/staging

# Production
NEXT_PUBLIC_KEYCLOAK_ISSUER=https://auth.example.com/realms/production
```

## API Reference

### `/api/auth/sso-init`
**Method:** GET  
**Returns:**
```json
{
  "url": "https://keycloak.../auth?client_id=...",
  "codeVerifier": "...",
  "state": "..."
}
```

### `/api/auth/callback`
**Method:** GET  
**Query Params:** `code`, `state`  
**Returns:** HTML page that processes the callback

### `/api/auth/exchange`
**Method:** POST  
**Body:**
```json
{
  "code": "authorization_code",
  "state": "state_value",
  "codeVerifier": "pkce_verifier"
}
```
**Returns:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "User Name"
  },
  "tokens": {
    "accessToken": "...",
    "expiresAt": 1234567890
  }
}
```

## Resources

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
- [PKCE RFC](https://tools.ietf.org/html/rfc7636)
- [openid-client Library](https://github.com/panva/node-openid-client)
- [JIT Provisioning Best Practices](https://auth0.com/docs/manage-users/user-migration/bulk-user-imports)

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review the Next.js server logs (you'll see JIT provisioning logs)
3. Check Keycloak logs
4. Verify all environment variables are correct
5. Test the OIDC configuration endpoint
6. Check Supabase users table for newly created SSO users

## Features Implemented

- ✅ SSO login with Keycloak
- ✅ PKCE (Proof Key for Code Exchange) for security
- ✅ Just-In-Time (JIT) user provisioning
- ✅ SSO logout (logs out from Keycloak)
- ✅ Persistent sessions with localStorage
- ✅ Automatic user tracking (local vs SSO)

## Next Steps

- ✅ Test SSO login with different users
- ✅ Test SSO logout (should log out from Keycloak)
- 🔄 Add token refresh functionality
- 🔄 Implement role-based access control
- 🔄 Add MFA (Multi-Factor Authentication)
- 🔄 Set up production Keycloak instance

