import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { AlertaService, type AlertaDocumentoRow } from './alerta.service';

@Controller('backoffice/alertas')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class AlertaController {
  constructor(private readonly alertaService: AlertaService) {}

  @Get()
  obterAlertasAtivos(): Promise<AlertaDocumentoRow[]> {
    return this.alertaService.obterAlertasAtivos();
  }

  @Get('cozinha/:cozinhaId')
  obterAlertasPorCozinha(@Param('cozinhaId') cozinhaId: string): Promise<AlertaDocumentoRow[]> {
    return this.alertaService.obterAlertasPorCozinha(cozinhaId);
  }
}
