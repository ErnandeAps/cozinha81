import { Controller, Post, Get, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RecebimentoService, EstadoRecebimento } from './recebimento.service';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';

/**
 * Story 7.5 — controle de recebimento de delivery. O Operador opera no KDS
 * (FR-26), então Dono/Admin e Operador podem pausar/reativar.
 */
@Controller('recebimento')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Papeis('dono_admin', 'operador')
export class RecebimentoController {
  constructor(private readonly recebimento: RecebimentoService) {}

  @Get()
  async estado(@CurrentTenant() tenantId: string): Promise<EstadoRecebimento> {
    return this.recebimento.estado(tenantId);
  }

  @Post('pausar')
  async pausar(
    @CurrentTenant() tenantId: string,
    @Body() body: { confirmar?: boolean }
  ): Promise<{ success: boolean }> {
    // AC#3: ação destrutiva exige confirmação explícita (o modal do KDS envia confirmar=true).
    if (body?.confirmar !== true) {
      throw new BadRequestException('Ação destrutiva: confirmação explícita obrigatória (confirmar=true).');
    }
    await this.recebimento.pausar(tenantId);
    return { success: true };
  }

  @Post('reativar')
  async reativar(@CurrentTenant() tenantId: string): Promise<{ success: boolean }> {
    await this.recebimento.reativar(tenantId);
    return { success: true };
  }
}
