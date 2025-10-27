import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { message: string; timestamp: string; service: string } {
    return {
      message: 'API Gateway is running',
      timestamp: new Date().toISOString(),
      service: 'api-gateway',
    };
  }

  getDetailedHealth() {
    return {
      service: 'api-gateway',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}