import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_RESPONSE_INTERCEPTOR } from './skip-response-interceptor';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  constructor(private readonly reflector: Reflector) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(
      SKIP_RESPONSE_INTERCEPTOR,
      [context.getHandler(), context.getClass()],
    );

    if (shouldSkip) {
      return next.handle();
    }

    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => ({
        statusCode: response.statusCode,
        message: data?.message ?? 'Request successful',
        data: data?.data ?? null,
      })),
    );
  }
}
