import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { JwtPayload } from '../interfaces/jwt_payload.interface';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt_refresh',
) {
  constructor(configService: ConfigService) {
    super({
      // 1. Extract from Authorization header as bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // 2. Validate using the REFRESH secret
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      // 3. Passes the raw request object to the validate method below
      passReqToCallback: true,
    });
  }

  validate(req: Request, payload: JwtPayload) {
    // Extract the raw token string from header to check against the DB hash later

    const authHeader: string | string[] | undefined =
      req.get('Authorization') ?? req.headers['authorization'];

    // Safely normalize to a string without triggering unsafe assignments
    const tokenHeader: string | undefined =
      typeof authHeader === 'string'
        ? authHeader
        : Array.isArray(authHeader)
          ? authHeader[0]
          : undefined;

    const refreshToken: string | undefined = tokenHeader
      ?.replace(/^bearer\s+/i, '')
      .trim();

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const { type, sub } = payload;

    if (type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Return the payload data and raw token (Passport attaches this to req.user)
    return {
      userId: sub,
      refreshToken,
    };
  }
}
