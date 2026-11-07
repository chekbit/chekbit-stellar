import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class BasicAuthMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic');
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Decode base64 "username:password"
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString(
      'ascii',
    );
    const [username, password] = credentials.split(':');

    // Compare with environment variables
    if (
      username !== this.configService.get<string>('BULL_DASHBOARD_USER') ||
      password !== this.configService.get<string>('BULL_DASHBOARD_PASS')
    ) {
      res.setHeader('WWW-Authenticate', 'Basic');
      throw new UnauthorizedException('Invalid credentials');
    }

    next();
  }
}
