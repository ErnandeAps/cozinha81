import { Controller, Get, BadRequestException, NotFoundException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData() {
    return this.appService.getData();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('error-test')
  getErrorTest() {
    if (process.env.NODE_ENV === 'production') {
      throw new NotFoundException();
    }
    throw new BadRequestException({
      code: 'TEST_ERROR',
      message: 'This is a test error to exercise the global exception filter.',
      details: { timestamp: new Date().toISOString() },
    });
  }
}
