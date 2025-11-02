import { Issuer, Client, generators } from 'openid-client';

let keycloakClient: Client | null = null;

// Initialize Keycloak OIDC client
async function getKeycloakClient(): Promise<Client> {
  if (keycloakClient) {
    return keycloakClient;
  }

  const issuerUrl = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  const clientSecret = process.env.KEYCLOAK_CLIENT_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

  if (!issuerUrl || !clientId || !clientSecret) {
    throw new Error('Missing Keycloak configuration. Please check your .env.local file.');
  }

  try {
    const keycloakIssuer = await Issuer.discover(issuerUrl);
    
    // Customize the issuer to disable strict validation for Keycloak compatibility
    // @ts-ignore - Symbol indexing is valid for openid-client but TypeScript doesn't allow it
    (keycloakIssuer as any)[Symbol.for('openid-client.custom.http_options')] = (url: any, options: any) => {
      options.timeout = 10000;
      return options;
    };
    
    keycloakClient = new keycloakIssuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [redirectUri],
      response_types: ['code'],
    });

    return keycloakClient;
  } catch (error) {
    console.error('Failed to initialize Keycloak client:', error);
    throw new Error('Failed to connect to Keycloak server');
  }
}

// Generate authorization URL
export async function getAuthorizationUrl(): Promise<{ url: string; codeVerifier: string; state: string }> {
  const client = await getKeycloakClient();
  
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);
  const state = generators.state();

  const authUrl = client.authorizationUrl({
    scope: 'openid email profile',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
  });

  return { url: authUrl, codeVerifier, state };
}

// Handle callback and exchange code for tokens
export async function handleCallback(
  code: string,
  codeVerifier: string,
  state: string,
  expectedState: string
): Promise<any> {
  if (state !== expectedState) {
    throw new Error('State mismatch - possible CSRF attack');
  }

  const client = await getKeycloakClient();
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

  try {
    // Exchange code for tokens using grant method (bypasses some validations)
    const tokenSet = await client.grant({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    // Get user info
    const userinfo = await client.userinfo(tokenSet.access_token!);

    return {
      user: {
        id: userinfo.sub,
        email: userinfo.email as string,
        name: (userinfo.name as string) || (userinfo.preferred_username as string),
      },
      tokens: {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        idToken: tokenSet.id_token,
        expiresAt: tokenSet.expires_at,
      },
    };
  } catch (error: any) {
    console.error('Token exchange error details:', error);
    
    // If it's an issuer validation error, provide helpful guidance
    if (error.message?.includes('iss')) {
      throw new Error(
        'Keycloak issuer validation failed. Your Keycloak instance needs to be configured to include ' +
        'the "iss" claim in token responses. See KEYCLOAK_SSO_SETUP.md for configuration steps.'
      );
    }
    
    throw error;
  }
}

// Client-side: Initiate SSO login
export function initiateSSOLogin() {
  if (typeof window === 'undefined') return;

  // Generate and store state/verifier before redirecting
  fetch('/api/auth/sso-init')
    .then(res => res.json())
    .then(data => {
      if (data.url) {
        // Store state and verifier in sessionStorage for callback validation
        sessionStorage.setItem('oauth_state', data.state);
        sessionStorage.setItem('oauth_code_verifier', data.codeVerifier);
        
        // Redirect to Keycloak
        window.location.href = data.url;
      }
    })
    .catch(error => {
      console.error('Failed to initiate SSO:', error);
      alert('Failed to initiate SSO login. Please try again.');
    });
}

// Client-side: Initiate SSO logout
export function initiateSSOLogout(idToken?: string) {
  if (typeof window === 'undefined') return;

  const issuerUrl = process.env.NEXT_PUBLIC_KEYCLOAK_ISSUER;
  const clientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
  const postLogoutRedirectUri = appUrl; // Redirect to home page after logout

  if (!issuerUrl || !clientId) {
    console.error('Missing Keycloak configuration for logout');
    return;
  }

  // Build Keycloak end session URL
  const logoutUrl = new URL(`${issuerUrl}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set('client_id', clientId);
  logoutUrl.searchParams.set('post_logout_redirect_uri', postLogoutRedirectUri);
  
  // Include ID token hint if available (recommended for proper logout)
  if (idToken) {
    logoutUrl.searchParams.set('id_token_hint', idToken);
  }

  console.log('Logging out from Keycloak...');
  
  // Redirect to Keycloak logout
  window.location.href = logoutUrl.toString();
}

