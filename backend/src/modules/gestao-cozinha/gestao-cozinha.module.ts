import { Module } from '@nestjs/common';
import { CoreModule } from '../../core/core.module';
import { InsumoController } from './insumo.controller';
import { InsumoService } from './insumo.service';
import { CusteioController } from './custeio.controller';
import { CusteioService } from './custeio.service';
import { FichaController } from './ficha.controller';
import { FichaService } from './ficha.service';
import { ProducaoController } from './producao.controller';
import { ProducaoService } from './producao.service';
import { CmvController } from './cmv.controller';
import { CmvService } from './cmv.service';

import { EstoqueListener } from './estoque.listener';
import { ReconciliacaoService } from './reconciliacao.service';
import { FaturamentoListener } from './faturamento.listener';

@Module({
  imports: [CoreModule],
  controllers: [InsumoController, FichaController, CusteioController, CmvController, ProducaoController],
  providers: [InsumoService, FichaService, CusteioService, CmvService, ProducaoService, EstoqueListener, ReconciliacaoService, FaturamentoListener],
  exports: [InsumoService, FichaService, CusteioService, CmvService, ProducaoService, ReconciliacaoService],
})
export class GestaoCozinhaModule {}
