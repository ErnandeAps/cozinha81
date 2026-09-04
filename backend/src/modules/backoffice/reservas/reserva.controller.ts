import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { ReservaService, type ReservaRow } from './reserva.service';
import type { AtualizarReservaDto, CriarReservaDto } from './reserva.dto';

@Controller('backoffice/reservas')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class ReservaController {
  constructor(private readonly reservaService: ReservaService) {}

  @Post()
  criar(@Body() body: CriarReservaDto): Promise<ReservaRow> {
    if (!body.tenantId) {
      throw new BadRequestException('tenantId é obrigatório para reservas criadas pelo backoffice.');
    }
    return this.reservaService.criar(body.cozinhaId, {
      inicio: body.inicio,
      fim: body.fim,
      modalidade: body.modalidade,
      tenantId: body.tenantId,
    });
  }

  @Get()
  listarTodos(): Promise<ReservaRow[]> {
    return this.reservaService.listarTodos('platform');
  }

  @Get('cozinha/:cozinhaId')
  listarPorCozinha(@Param('cozinhaId') cozinhaId: string): Promise<ReservaRow[]> {
    return this.reservaService.listarPorCozinha(cozinhaId, 'platform');
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: AtualizarReservaDto): Promise<ReservaRow> {
    if (!body.tenantId) {
      throw new BadRequestException('tenantId é obrigatório para atualizar reservas pelo backoffice.');
    }
    return this.reservaService.atualizar(id, {
      cozinhaId: body.cozinhaId,
      inicio: body.inicio,
      fim: body.fim,
      modalidade: body.modalidade,
      tenantId: body.tenantId,
    });
  }

  @Delete(':id')
  remover(@Param('id') id: string): Promise<void> {
    return this.reservaService.remover(id, 'platform');
  }
}
