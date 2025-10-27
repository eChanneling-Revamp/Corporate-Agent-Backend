import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      service: 'auth-service',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}