import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('platform')
@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      name: 'Intellifarm API',
      version: '1.0.0',
      docs: '/docs',
    };
  }

  @Get('health')
  getHealth() {
    return {
      ok: true,
      timestamp: new Date().toISOString(),
    };
  }
}
