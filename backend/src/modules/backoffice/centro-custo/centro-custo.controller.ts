import { BadRequestException, Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { CentroCustoService } from './centro-custo.service';

export interface SalvarCentroCustoDto {
  cozinhaId: string;
  nomeCozinha?: string;
  investimentoInicial?: number;
  prazoContratoMeses?: number;
  custosFixosMensais?: number;
  roiDesejado?: number;
  reservaManutencao?: number;
  aluguelMensal?: number;
  margem?: number;
  taxaAdministracao?: number;
  areaM2?: number;
  equipamentos?: number;
  servicos?: number;
  condominio?: number;
  seguranca?: number;
  manutencao?: number;
  outros?: number;
  equipamentosDetalhes?: Array<{ id?: string; nome?: string; valor?: number }>;
}

@Controller('backoffice/centro-custo')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class CentroCustoController {
  constructor(private readonly centroCustoService: CentroCustoService) {}

  @Get('cozinha/:cozinhaId')
  obter(@Param('cozinhaId') cozinhaId: string): Promise<Record<string, unknown>> {
    if (!cozinhaId) throw new BadRequestException('cozinhaId é obrigatório.');
    return this.centroCustoService.obterPorCozinha(cozinhaId);
  }

  @Put('cozinha/:cozinhaId')
  salvar(@Param('cozinhaId') cozinhaId: string, @Body() body: SalvarCentroCustoDto): Promise<Record<string, unknown>> {
    if (!cozinhaId) throw new BadRequestException('cozinhaId é obrigatório.');
    if (!body) throw new BadRequestException('payload obrigatório.');

    return this.centroCustoService.salvarPorCozinha(cozinhaId, body);
  }
}
