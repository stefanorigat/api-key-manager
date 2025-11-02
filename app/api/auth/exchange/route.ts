import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/sso-auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, state, codeVerifier } = body;

    if (!code || !state || !codeVerifier) {
      return NextResponse.json(
        { message: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get user info from Keycloak
    const { user, tokens } = await handleCallback(code, codeVerifier, state, state);

    // JIT (Just-In-Time) User Provisioning
    // Check if user exists in Supabase users table
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('email', user.email)
      .single();

    let dbUser = existingUser;

    if (fetchError && fetchError.code === 'PGRST116') {
      // User doesn't exist - create new user (JIT provisioning)
      console.log(`Creating new SSO user: ${user.email}`);
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{
          email: user.email,
          name: user.name || user.email.split('@')[0],
          password_hash: 'SSO_USER', // Special marker for SSO users (no password-based login)
          auth_provider: 'sso',
          last_login: new Date().toISOString(),
        }])
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create SSO user:', insertError);
        throw new Error('Failed to create user account');
      }

      dbUser = newUser;
      console.log(`✓ SSO user created successfully: ${user.email}`);
    } else if (existingUser) {
      // User exists - update last login timestamp
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('email', user.email);

      if (updateError) {
        console.warn('Failed to update last login:', updateError);
        // Don't throw - this is not critical
      }
      
      console.log(`✓ Existing SSO user logged in: ${user.email}`);
    } else if (fetchError) {
      // Unexpected database error
      console.error('Database error during user lookup:', fetchError);
      throw new Error('Database error during authentication');
    }

    return NextResponse.json({
      user: {
        id: dbUser?.id || user.id,
        email: user.email,
        name: dbUser?.name || user.name,
      },
      tokens: {
        accessToken: tokens.accessToken,
        idToken: tokens.idToken, // Include ID token for SSO logout
        expiresAt: tokens.expiresAt,
      },
    });
  } catch (error: any) {
    console.error('Token exchange error:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to exchange authorization code' },
      { status: 500 }
    );
  }
}

