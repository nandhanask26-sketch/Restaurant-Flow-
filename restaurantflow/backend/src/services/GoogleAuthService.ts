import { env } from '../config/env';
import { UnauthorizedError, BadRequestError } from '../utils/errors';

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  emailVerified: boolean;
}

export class GoogleAuthService {
  /**
   * Verifies Google ID Token or Access Token directly with Google's API
   */
  static async verifyGoogleToken(tokenOrCredential: string): Promise<VerifiedGoogleUser> {
    if (!tokenOrCredential || typeof tokenOrCredential !== 'string') {
      throw new BadRequestError('A valid Google authentication token is required.');
    }

    const trimmedToken = tokenOrCredential.trim();

    // 1. First attempt verification via Google Tokeninfo endpoint (for ID tokens / JWT credentials)
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${trimmedToken}`);
      if (response.ok) {
        const data = (await response.json()) as any;

        // Validate Audience if GOOGLE_CLIENT_ID is configured
        if (env.GOOGLE_CLIENT_ID && data.aud !== env.GOOGLE_CLIENT_ID) {
          throw new UnauthorizedError('Google token audience does not match configured Client ID.');
        }

        // Validate Issuer
        const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
        if (!validIssuers.includes(data.iss)) {
          throw new UnauthorizedError('Invalid Google token issuer.');
        }

        if (!data.email) {
          throw new UnauthorizedError('Google account did not provide an email address.');
        }

        return {
          googleId: data.sub,
          email: data.email.toLowerCase().trim(),
          fullName: data.name || data.given_name || data.email.split('@')[0],
          avatarUrl: data.picture,
          emailVerified: data.email_verified === 'true' || data.email_verified === true,
        };
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err;
    }

    // 2. Second attempt: Verification via Google Userinfo endpoint (for Bearer OAuth access tokens)
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${trimmedToken}`,
        },
      });

      if (response.ok) {
        const data = (await response.json()) as any;

        if (!data.email) {
          throw new UnauthorizedError('Google account did not provide an email address.');
        }

        return {
          googleId: data.sub,
          email: data.email.toLowerCase().trim(),
          fullName: data.name || data.given_name || data.email.split('@')[0],
          avatarUrl: data.picture,
          emailVerified: data.email_verified === true,
        };
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedError) throw err;
    }

    // 3. If in local development and test mode, allow mock Google token structure for testing
    if (env.NODE_ENV === 'development' && trimmedToken.startsWith('mock-google-token:')) {
      const parts = trimmedToken.split(':');
      const testEmail = parts[1] || 'customer@example.com';
      const testName = parts[2] || 'Google User';
      return {
        googleId: `mock_gid_${Date.now()}`,
        email: testEmail.toLowerCase().trim(),
        fullName: testName,
        emailVerified: true,
      };
    }

    throw new UnauthorizedError('Google token verification failed. Please try signing in again.');
  }
}
