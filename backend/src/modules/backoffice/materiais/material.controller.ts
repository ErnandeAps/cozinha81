import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { AuthPrincipal } from '../../../core/auth/jwt-payload';
import { MaterialService, type MaterialRow, type MovimentoRow } from './material.service';
import { CriarMaterialDto, RegistrarMovimentoDto } from './material.dto';

@Controller('backoffice/materiais')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  criar(@Body() body: CriarMaterialDto): Promise<MaterialRow> {
    return this.materialService.criar(body.nome);
  }

  @Post('movimento')
  registrarMovimento(
    @Body() body: RegistrarMovimentoDto,
    @CurrentUser() staff: AuthPrincipal
  ): Promise<MovimentoRow> {
    return this.materialService.registrarMovimento(
      body.materialId,
      body.tipo,
      body.quantidade,
      body.valorUnitario || 0,
      body.tenantId || null,
      staff.sub
    );
  }

  @Get('saldo')
  listarSaldos(): Promise<{ id: string; nome: string; saldo: number }[]> {
    return this.materialService.listarSaldos();
  }

  @Get('consumos')
  listarConsumos(): Promise<MovimentoRow[]> {
    return this.materialService.listarTodosConsumos();
  }
}
