import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { GestaoCentralGlpBackofficeController } from './gestao-central-glp.backoffice.controller';
import { GestaoCentralGlpController } from './gestao-central-glp.controller';
import { GestaoCentralGlpService } from './gestao-central-glp.service';

@Module({
  imports: [CoreModule],
  controllers: [GestaoCentralGlpController, GestaoCentralGlpBackofficeController],
  providers: [GestaoCentralGlpService],
  exports: [GestaoCentralGlpService],
})
export class GestaoCentralGlpModule {}
