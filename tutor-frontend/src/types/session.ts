export interface StoredSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  sessionId: string;
  role?: 'learner' | 'tutor' | 'admin';
  userId?: string;
  email?: string;
  fullName?: string;
}
