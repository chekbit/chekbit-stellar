// src/queue/jwt-admin.middleware.ts
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAdminMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader) throw new UnauthorizedException('unauthorized');

      const token = authHeader.split(' ')[1];
      if (!token) throw new UnauthorizedException('unauthorized');

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as any;

      if (!payload || !payload.isAdmin)
        throw new ForbiddenException('access denied');

      req['user'] = payload;
      next();
    } catch (err) {
      return res.status(401).json({ message: 'unauthorized' });
    }
  }
}
