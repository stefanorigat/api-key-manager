# Supabase Setup Guide

This guide will help you set up your Supabase database for the API Key Management system.

## 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in to your account
3. Create a new project

## 2. Get Your API Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (starts with `eyJ...`)

## 3. Configure Environment Variables

Create a file named `.env.local` in the root of your project (next to `package.json`):

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace the placeholder values with your actual Supabase credentials.

## 4. Create the Database Table

In your Supabase dashboard:

1. Go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the following SQL:

```sql
-- Create the api_keys table
CREATE TABLE api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used TIMESTAMPTZ,
  environment TEXT NOT NULL CHECK (environment IN ('Production', 'Development', 'Staging', 'Testing')),
  status TEXT NOT NULL CHECK (status IN ('Active', 'Inactive', 'Revoked', 'Expired')),
  permissions TEXT[] DEFAULT '{}' NOT NULL
);

-- Create an index on created_at for faster sorting
CREATE INDEX idx_api_keys_created_at ON api_keys(created_at DESC);

-- Create an index on status for faster filtering
CREATE INDEX idx_api_keys_status ON api_keys(status);

-- Create an index on environment for faster filtering
CREATE INDEX idx_api_keys_environment ON api_keys(environment);

-- Enable Row Level Security (RLS)
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations (for development)
-- NOTE: In production, you should create more restrictive policies
CREATE POLICY "Allow all operations for authenticated users" ON api_keys
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

4. Click **Run** to execute the SQL

## 5. Table Schema

### Table: `api_keys`

| Column       | Type         | Description                                           |
|--------------|--------------|-------------------------------------------------------|
| id           | UUID         | Primary key (auto-generated)                          |
| name         | TEXT         | Name/description of the API key                       |
| key          | TEXT         | The actual API key string                             |
| created_at   | TIMESTAMPTZ  | Timestamp when the key was created                    |
| last_used    | TIMESTAMPTZ  | Timestamp when the key was last used (nullable)       |
| environment  | TEXT         | Environment type (Production/Development/Staging/Testing) |
| status       | TEXT         | Key status (Active/Inactive/Revoked/Expired)         |
| permissions  | TEXT[]       | Array of permission strings (read, write, delete)     |

## 6. Test the Connection

1. Restart your Next.js development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard` in your browser
3. The table should load (might be empty initially)
4. Try creating a new API key to test the connection

## 7. Optional: Add Sample Data

If you want to add some sample data for testing:

```sql
INSERT INTO api_keys (name, key, environment, status, permissions) VALUES
  ('Production API Key', 'sk_prod_XXXXXXXXXXXXXXXXXXXXXXXX', 'Production', 'Active', ARRAY['read', 'write']),
  ('Development API Key', 'sk_dev_XXXXXXXXXXXXXXXXXXXXXXXX', 'Development', 'Active', ARRAY['read']),
  ('Staging API Key', 'sk_stag_XXXXXXXXXXXXXXXXXXXXXXXX', 'Staging', 'Inactive', ARRAY['read', 'write', 'delete']);
```

## 8. Security Considerations

### For Production:

1. **Update RLS Policies**: The current policy allows all operations. In production, implement proper authentication and authorization:

```sql
-- Remove the permissive policy
DROP POLICY "Allow all operations for authenticated users" ON api_keys;

-- Add authenticated user policy
CREATE POLICY "Users can manage their own API keys" ON api_keys
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

2. **Use Service Role Key for Server-Side Operations**: For server-side operations that require elevated privileges, use the service role key (keep it secret and never expose it to the client).

3. **Implement User Authentication**: Add Supabase Auth to your application to track which user owns which API keys.

4. **Add User Column**: Modify the table to include a `user_id` column:

```sql
ALTER TABLE api_keys ADD COLUMN user_id UUID REFERENCES auth.users(id);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
```

## Troubleshooting

### Error: "Failed to load API keys"

- Check that your `.env.local` file has the correct credentials
- Verify that the `api_keys` table exists in your Supabase database
- Check the browser console for detailed error messages
- Ensure RLS policies allow the operation you're trying to perform

### Error: "relation 'api_keys' does not exist"

- Run the CREATE TABLE SQL from Step 4
- Refresh the SQL Editor and verify the table appears in the table list

### Connection Issues

- Ensure you've restarted the Next.js dev server after adding `.env.local`
- Check that your Supabase project is not paused (free tier projects pause after inactivity)
- Verify your API credentials are correct (no extra spaces or quotes)

## Next Steps

Once everything is working:

1. ✅ Test all CRUD operations (Create, Read, Update, Delete)
2. ✅ Test bulk delete functionality
3. ✅ Test filtering and search
4. 🔐 Implement authentication (optional but recommended)
5. 🚀 Deploy to production

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

