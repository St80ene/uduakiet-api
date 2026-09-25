export interface JwtPayload {
  sub: string;
  email: string;
  role_id?: string;
  type?: 'access' | 'refresh'; // Optional field to distinguish between access and refresh tokens
}
