import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from '../core/core.module';
import { GestaoCozinhaModule } from '../modules/gestao-cozinha/gestao-cozinha.module';
import { GestaoCentralGlpModule } from '../modules/gestao-central-glp/gestao-central-glp.module';
import { PedidosModule } from '../modules/pedidos/pedidos.module';
import { BackofficeModule } from '../modules/backoffice/backoffice.module';
import { IdentidadeModule } from '../modules/identidade/identidade.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    CoreModule,
    GestaoCozinhaModule,
    GestaoCentralGlpModule,
    PedidosModule,
    BackofficeModule,
    IdentidadeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
