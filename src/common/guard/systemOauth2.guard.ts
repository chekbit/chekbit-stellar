
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class SystemOauth2Guard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization']?.trim() || '';
    const [scheme, token] = authHeader.split(/\s+/);
    console.log(`Received request with Authorization header: ${authHeader}`);
    console.log(`Parsed scheme: ${scheme}, token: ${token}`);


    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    const valid = this.authService.validateToken(token);
    console.log(`Token validation result: ${valid}`);
    if (!valid) {
      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }
}