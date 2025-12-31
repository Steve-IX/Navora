import { Controller, Get, Options, Head, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

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

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Explicitly handle OPTIONS requests for health check
  @Options()
  @Head()
  handleOptions(@Req() req: Request, @Res() res: Response) {
    res.sendStatus(200);
  }
}

