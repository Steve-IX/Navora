import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  healthCheck() {
    return {
      status: 'ok',
      service: 'gps-mapping-backend',
      timestamp: new Date().toISOString(),
    };
  }
}

