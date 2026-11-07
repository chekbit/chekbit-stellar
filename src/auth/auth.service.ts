import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';

interface AccessToken {
  token: string;
  expiresAt: number; // timestamp
}

@Injectable()
export class AuthService {
  private currentToken: AccessToken | null = null;

  constructor(private readonly configService: ConfigService) {}

  generateToken(clientId: string, clientSecret: string): AccessToken {
    const expectedClientId = this.configService.get<string>('APP_CLIENT_ID');
    const expectedClientSecret = this.configService.get<string>('APP_CLIENT_SECRET');
    console.log(`Expected clientId: ${expectedClientId}, Expected clientSecret: ${expectedClientSecret}`);

    if (clientId?.trim() !== expectedClientId || clientSecret?.trim() !== expectedClientSecret) {
      throw new UnauthorizedException('Invalid client credentials');
    }

    // Generate a random token
    const token = randomBytes(32).toString('hex');
    const expiresIn = 360000; // seconds
    const expiresAt = Date.now() + expiresIn * 1000;

    this.currentToken = { token, expiresAt };
    return this.currentToken;
  }

  validateToken(token: string): boolean {
    if (!this.currentToken) return false;
    if (this.currentToken.token !== token) return false;
    if (Date.now() > this.currentToken.expiresAt) return false;
    return true;
  }
  
}