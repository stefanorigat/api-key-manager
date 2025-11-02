import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/sso-auth';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/dashboard?error=missing_params', request.url)
      );
    }

    // In a real implementation, you'd retrieve these from a secure session store
    // For now, we'll handle them client-side via sessionStorage
    // This is a simplified example - production should use HTTP-only cookies
    
    const callbackHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Processing Login...</title>
          <style>
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              font-family: system-ui, -apple-system, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
            }
            .container {
              text-align: center;
              background: white;
              padding: 3rem;
              border-radius: 1rem;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              width: 50px;
              height: 50px;
              animation: spin 1s linear infinite;
              margin: 0 auto 1rem;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            h2 { color: #333; margin: 0 0 0.5rem; }
            p { color: #666; margin: 0; }
            .error { color: #dc2626; background: #fee; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h2>Processing SSO Login...</h2>
            <p>Please wait while we complete your authentication.</p>
            <div id="error-message" class="error" style="display: none;"></div>
          </div>
          <script>
            (async function() {
              try {
                const urlParams = new URLSearchParams(window.location.search);
                const code = urlParams.get('code');
                const state = urlParams.get('state');
                
                // Get stored values from sessionStorage
                const storedState = sessionStorage.getItem('oauth_state');
                const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
                
                if (!storedState || !codeVerifier) {
                  throw new Error('Session data not found. Please try logging in again.');
                }
                
                if (state !== storedState) {
                  throw new Error('State mismatch. Possible security issue.');
                }
                
                // Exchange code for tokens
                const response = await fetch('/api/auth/exchange', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code, state, codeVerifier }),
                });
                
                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.message || 'Failed to complete login');
                }
                
                const data = await response.json();
                
                // Add auth provider and ID token to user object for SSO logout
                const user = {
                  ...data.user,
                  authProvider: 'sso',
                  idToken: data.tokens.idToken, // Store for Keycloak logout
                };
                
                // Store user session in localStorage (SSO sessions are typically persistent)
                // This matches the password-based login behavior when "remember me" is checked
                localStorage.setItem('user', JSON.stringify(user));
                
                // Clean up OAuth session data
                sessionStorage.removeItem('oauth_state');
                sessionStorage.removeItem('oauth_code_verifier');
                
                // Redirect to dashboard
                window.location.href = '/dashboard';
              } catch (error) {
                console.error('SSO callback error:', error);
                document.getElementById('error-message').style.display = 'block';
                document.getElementById('error-message').textContent = error.message;
                
                setTimeout(() => {
                  window.location.href = '/dashboard?error=sso_failed';
                }, 3000);
              }
            })();
          </script>
        </body>
      </html>
    `;

    return new NextResponse(callbackHtml, {
      headers: { 'Content-Type': 'text/html' },
    });
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard?error=callback_failed', request.url)
    );
  }
}

