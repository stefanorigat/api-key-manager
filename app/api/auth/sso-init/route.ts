import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizationUrl } from '@/lib/sso-auth';

export async function GET(request: NextRequest) {
  try {
    const { url, codeVerifier, state } = await getAuthorizationUrl();

    return NextResponse.json({
      url,
      codeVerifier,
      state,
    });
  } catch (error) {
    console.error('SSO init error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize SSO login' },
      { status: 500 }
    );
  }
}

