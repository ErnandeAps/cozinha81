import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { BillingService, type FaturaRow, type FaturaItemRow, type FluxoCaixaLancamentoRow } from './billing.service';

@Controller('backoffice/billing')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /** Gera fatura consolidada para um inquilino e período. */
  @Post('gerar')
  gerar(
    @Body() body: { tenantId: string; inicio: string; fim: string },
  ): Promise<FaturaRow & { itens: FaturaItemRow[] }> {
    if (!body.tenantId || !body.inicio || !body.fim) {
      throw new BadRequestException('tenantId, inicio e fim são obrigatórios.');
    }
    return this.billingService.gerarFatura(body.tenantId, body.inicio, body.fim);
  }

  /** Lista os lançamentos do fluxo de caixa. */
  @Get('fluxo-caixa')
  listarFluxoCaixa(
    @Query('tenantId') tenantId?: string,
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ): Promise<FluxoCaixaLancamentoRow[]> {
    return this.billingService.listarLancamentosCaixa(tenantId, inicio, fim);
  }

  /** Cria um lançamento manual de entrada/saída do caixa. */
  @Post('fluxo-caixa')
  criarLancamentoFluxoCaixa(
    @Body() body: {
      tenantId?: string;
      tipo: 'entrada' | 'saida';
      descricao: string;
      valor: number;
      dataLancamento?: string;
    },
  ): Promise<FluxoCaixaLancamentoRow> {
    if (!body.descricao?.trim()) {
      throw new BadRequestException('Descrição é obrigatória.');
    }
    return this.billingService.registrarLancamentoCaixa(body);
  }

  /** Lista faturas de um inquilino específico. */
  @Get('tenant/:tenantId')
  listarPorTenant(@Param('tenantId') tenantId: string): Promise<FaturaRow[]> {
    return this.billingService.listarPorTenant(tenantId);
  }

  /** Lista todas as faturas (visão consolidada do staff). */
  @Get()
  listarTodas(): Promise<FaturaRow[]> {
    return this.billingService.listarTodas();
  }

  /** Registra pagamento de uma fatura aberta. */
  @Post(':id/pagar')
  pagar(@Param('id') id: string): Promise<FaturaRow> {
    return this.billingService.pagarFatura(id);
  }

  /** Cancela uma fatura aberta. */
  @Post(':id/cancelar')
  cancelar(@Param('id') id: string): Promise<FaturaRow> {
    return this.billingService.cancelarFatura(id);
  }

  /** Exclui uma fatura aberta (mesma lógica de cancelamento). */
  @Delete(':id')
  excluir(@Param('id') id: string): Promise<FaturaRow> {
    return this.billingService.excluirFatura(id);
  }

  /** Obtém fatura com detalhamento de itens. */
  @Get(':id')
  obter(@Param('id') id: string): Promise<FaturaRow & { itens: FaturaItemRow[] }> {
    return this.billingService.obterFatura(id);
  }
}
