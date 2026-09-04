import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PedidosService, CriarPedidoManualDto, MudarStatusDto } from './pedidos.service';
import { ModuloGuard } from '../../core/gating/modulo.guard';
import { RequerModulo } from '../../core/gating/requer-modulo.decorator';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';

@Controller('pedidos')
@UseGuards(AuthGuard('jwt'), RolesGuard, ModuloGuard)
@RequerModulo('pedidos_kds')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post('manual')
  async criarPedidoManual(@CurrentTenant() tenantId: string, @Body() dto: CriarPedidoManualDto) {
    if (!tenantId) {
      throw new Error('Tenant context missing');
    }
    return this.pedidosService.criarPedidoManual(tenantId, dto);
  }

  @Post(':id/status')
  async mudarStatus(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: MudarStatusDto
  ) {
    if (!tenantId) {
      throw new Error('Tenant context missing');
    }
    return this.pedidosService.mudarStatus(tenantId, id, dto);
  }
}
