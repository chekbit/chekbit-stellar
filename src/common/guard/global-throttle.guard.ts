import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GlobalThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    if (req.user?.id) {
      return Promise.resolve(`user-${req.user.id}`);
    }

    let ip = req.ip;

    if (ip.startsWith('::ffff:')) {
      ip = ip.replace('::ffff:', '');
    }

    return Promise.resolve(`ip-${ip}`);
  }

  protected getRequestKey(context: ExecutionContext): string {
    return 'global'; // one bucket for all routes
  }
}
