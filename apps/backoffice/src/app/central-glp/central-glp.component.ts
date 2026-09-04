import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, map } from 'rxjs';
import { API_BASE } from '../core/api.config';

interface SectionCard {
  label: string;
  value: string;
  meta: string;
}

interface InquilinoOption { id: string; nome: string; }
interface DashboardGlp { estoqueAtualKg: number; percentualCapacidade: number; consumoTotalKg: number; custoMedioKg: number; valorFaturado: number; }
type StatusCentralGlp = 'ativa' | 'manutencao' | 'inativa';

interface CentralGlp {
  nomeCentral: string;
  capacidadeTotalKg: number;
  capacidadeCilindrosKg: number;
  capacidadePorCilindroKg: number;
  estoqueAtualKg: number;
  estoqueMinimoKg: number;
  estoqueCriticoKg: number;
  valorUnitarioKgFornecedor: number;
  valorUnitarioKgInquilino: number;
  unidadeCompra: 'kg';
  unidadeMedicao: 'm3';
  fatorConversao: number;
  statusCentral: StatusCentralGlp;
}
interface AbastecimentoGlp { id: string; data: string; fornecedor: string; notaFiscal?: string; quantidadeKg: number; quantidadeCilindros: number; valorTotal: number; custoPorKg: number; }
interface GasDashboardItem {
  id: string;
  tenantId: string;
  nomeInquilino: string;
  dataLeitura: string;
  leituraInicial: number;
  leituraFinal: number;
  consumoKg: number;
}

interface LeituraCentralGlpItem {
  id: string;
  tenantId: string;
  nomeInquilino: string;
  dataLeitura: string;
  leituraInicial: number;
  leituraFinal: number;
  consumoM3: number;
  consumoKg: number;
  observacao: string;
}

interface FechamentoGlpApi {
  id: string;
  tenantId?: string;
  nomeInquilino?: string;
  mes: string;
  consumoTotalKg: number;
  custoPeriodo: number;
  valorFaturado: number;
  perdasKg: number;
  saldoFinalKg: number;
  criadoEm: string;
}

@Component({
  selector: 'app-central-glp',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      <header>
        <span class="c81-eyebrow">// CENTRAL DE GLP</span>
        <h1 style="margin-top: var(--space-1);">{{ titulo() }}</h1>
      </header>

      @if (erro()) { <p role="alert" class="c81-alert-danger">{{ erro() }}</p> }

      @if (section() === 'dashboard') {
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
          @for (card of cards(); track card.label) {
            <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-4);">
              <div class="c81-eyebrow">{{ card.label }}</div>
              <h2 style="margin-top: var(--space-2); font-size: 2rem;">{{ card.value }}</h2>
              <p style="margin: var(--space-2) 0 0; color: var(--text-secondary);">{{ card.meta }}</p>
            </div>
          }
        </div>

        <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5); margin-top: var(--space-6);">
          <div style="display: flex; justify-content: space-between; align-items: end; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap;">
            <h3 style="margin: 0;">Consumo por inquilino</h3>
            <div style="display: flex; gap: var(--space-3); align-items: end; flex-wrap: wrap;">
              <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 200px; font-weight: 500;">
                Filtrar por inquilino
                <select class="c81-input" [value]="gasFiltroTenant()" (change)="alterarFiltroGas($any($event.target).value)">
                  <option value="">Todos</option>
                  @for (inquilino of inquilinos(); track inquilino.id) {
                    <option [value]="inquilino.id">{{ inquilino.nome }}</option>
                  }
                </select>
              </label>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 150px; font-weight: 500;">
                Data inicial
                <input class="c81-input" type="date" [value]="gasDataInicio()" (change)="alterarPeriodoGas($any($event.target).value, gasDataFim())" />
              </label>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 150px; font-weight: 500;">
                Data final
                <input class="c81-input" type="date" [value]="gasDataFim()" (change)="alterarPeriodoGas(gasDataInicio(), $any($event.target).value)" />
              </label>
              <button type="button" class="c81-button c81-button--secondary" (click)="aplicarPeriodoGasAtual()">Este mês</button>
              <button type="button" class="c81-button c81-button--secondary" (click)="aplicarPeriodoGas30Dias()">Últimos 30 dias</button>
            </div>
          </div>
          @if (gasDashboard().length === 0) {
            <p style="margin: 0; color: var(--text-secondary);">Nenhuma leitura registrada.</p>
          } @else {
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-4);">
              <div style="border: var(--hairline); border-radius: 10px; padding: var(--space-3); background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">TOTAL NO PERÍODO</div>
                <h4 style="margin: var(--space-2) 0 0; font-size: 1.5rem;">{{ gasResumo().totalConsumo.toFixed(1) }} kg</h4>
              </div>
              <div style="border: var(--hairline); border-radius: 10px; padding: var(--space-3); background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">LEITURAS</div>
                <h4 style="margin: var(--space-2) 0 0; font-size: 1.5rem;">{{ gasResumo().totalLeituras }}</h4>
              </div>
              <div style="border: var(--hairline); border-radius: 10px; padding: var(--space-3); background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">MAIOR CONSUMO</div>
                <h4 style="margin: var(--space-2) 0 0; font-size: 1.5rem;">{{ gasResumo().maiorConsumo.toFixed(1) }} kg</h4>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
              <div style="display: grid; grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr auto; gap: var(--space-3); align-items: center; padding: 0 var(--space-3) var(--space-2); color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; border-bottom: var(--hairline);">
                <div>Nome do inquilino</div>
                <div>Data da leitura</div>
                <div>Leitura inicial</div>
                <div>Leitura final</div>
                <div>Consumo kg</div>
                <div>Ação</div>
              </div>

              @for (item of gasDashboard(); track item.id) {
                <div style="display: grid; grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr auto; gap: var(--space-3); align-items: center; padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                  <div><strong>{{ item.nomeInquilino }}</strong></div>
                  <div>{{ formatarData(item.dataLeitura) }}</div>
                  <div>{{ item.leituraInicial.toFixed(2) }} m³</div>
                  <div>{{ item.leituraFinal.toFixed(2) }} m³</div>
                  <div>{{ item.consumoKg.toFixed(2) }} kg</div>
                  <button type="button" class="c81-button c81-button--secondary" (click)="excluirLeitura(item.tenantId, item.id)">Excluir</button>
                </div>
              }
            </div>
          }
        </div>

        <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: var(--space-5);">
          <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-4);">Fluxo do módulo</h3>
            <ul style="margin: 0; padding-left: 1.2rem; display: grid; gap: var(--space-2); color: var(--text-secondary);">
              <li>Compra e abastecimento da central.</li>
              <li>Monitoramento de estoque e capacidade dos cilindros.</li>
              <li>Leituras individuais por cozinha.</li>
              <li>Consumo, perdas e diferenças do estoque.</li>
              <li>Fechamento mensal e cobrança do gás da dark kitchen.</li>
            </ul>
          </div>

          <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-4);">Alertas</h3>
            <div style="display: flex; flex-direction: column; gap: var(--space-3); color: var(--text-secondary);">
              <div style="padding: var(--space-3); border-radius: 8px; background: rgba(249, 115, 22, 0.1); border: 1px solid rgba(249, 115, 22, 0.35);">
                Estoque baixo: 18% da capacidade.
              </div>
              <div style="padding: var(--space-3); border-radius: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.35);">
                Possível consumo anormal em Cozinha 03.
              </div>
            </div>
          </div>
        </div>
      }

      @if (section() === 'cadastro') {
        <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
          <div style="margin-bottom: var(--space-4);">
            <h3 style="margin: 0;">Cadastro da Central</h3>
          </div>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-4); font-weight: 500; color: var(--text-secondary);">
            Inquilino
            <select class="c81-input" [value]="tenantId()" (change)="selecionarInquilino($any($event.target).value)">
              <option value="">Selecione o inquilino</option>
              @for (inquilino of inquilinos(); track inquilino.id) {
                <option [value]="inquilino.id">{{ inquilino.nome }}</option>
              }
            </select>
          </label>

          @if (tenantId()) {
            @if (central()) {
              <p style="margin: 0 0 var(--space-4); color: var(--text-secondary); font-size: 0.95rem;">Estoque atual calculado: <strong>{{ central()!.estoqueAtualKg.toFixed(1) }} kg</strong></p>
            }
            <form (submit)="salvarCentral($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); align-items: end;">
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Nome da central
                  <input class="c81-input" [(ngModel)]="formCentral.nomeCentral" name="nomeCentral" required />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Capacidade máxima (kg)
                  <input class="c81-input" type="number" min="1" [(ngModel)]="formCentral.capacidadeTotalKg" name="capacidadeTotalKg" required />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Cilindros
                  <input class="c81-input" type="number" min="1" [(ngModel)]="formCentral.capacidadeCilindrosKg" name="capacidadeCilindrosKg" required />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Capacidade / cilindro
                  <input class="c81-input" type="number" min="1" step="0.1" [(ngModel)]="formCentral.capacidadePorCilindroKg" name="capacidadePorCilindroKg" required />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Capacidade total
                  <div class="c81-input" style="display:flex;align-items:center;min-height:42px;padding:0 var(--space-3);box-sizing:border-box; background: rgba(255,255,255,0.02);">{{ ((formCentral.capacidadeCilindrosKg || 0) * (formCentral.capacidadePorCilindroKg || 0)).toFixed(1) }} kg</div>
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Estoque mínimo
                  <input class="c81-input" type="number" min="0" [(ngModel)]="formCentral.estoqueMinimoKg" name="estoqueMinimoKg" required />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Estoque crítico
                  <input class="c81-input" type="number" min="0" [(ngModel)]="formCentral.estoqueCriticoKg" name="estoqueCriticoKg" required />
                </label>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); align-items: end;">
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Valor p/ fornecedor
                  <input class="c81-input" type="number" min="0" step="0.01" [(ngModel)]="formCentral.valorUnitarioKgFornecedor" name="valorUnitarioKgFornecedor" required />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Valor p/ inquilino
                  <input class="c81-input" type="number" min="0" step="0.01" [(ngModel)]="formCentral.valorUnitarioKgInquilino" name="valorUnitarioKgInquilino" required />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Unidade de compra
                  <input class="c81-input" [value]="'kg'" disabled />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Unidade de medição
                  <input class="c81-input" [value]="'m³'" disabled />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Fator de conversão
                  <input class="c81-input" type="number" min="0.001" step="0.001" [(ngModel)]="formCentral.fatorConversao" name="fatorConversao" required />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                  Status da central
                  <select class="c81-input" [(ngModel)]="formCentral.statusCentral" name="statusCentral">
                    <option value="ativa">Ativa</option>
                    <option value="manutencao">Em manutenção</option>
                    <option value="inativa">Inativa</option>
                  </select>
                </label>
                <div style="display: flex; justify-content: flex-end; align-items: end; min-height: 100%;">
                  <button class="c81-button c81-button--primary" type="submit" [disabled]="salvando()" style="min-width: 180px;">{{ salvando() ? 'Salvando...' : 'Salvar configuração' }}</button>
                </div>
              </div>
            </form>
          } @else {
            <p style="margin: 0; color: var(--text-secondary);">A central de GLP ainda não está vinculada a um inquilino ativo.</p>
          }
        </div>
      }

      @if (section() === 'abastecimentos') {
        <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
          <h3 style="margin: 0 0 var(--space-4);">Registrar abastecimento da central</h3>
          @if (!tenantId()) {
            <p style="margin: 0; color: var(--text-secondary);">Selecione a central do inquilino para registrar o abastecimento.</p>
          } @else {
            <form (submit)="registrarAbastecimento($event)" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
              <label>Data<input class="c81-input" type="date" [(ngModel)]="formAbastecimento.data" name="data" required /></label>
              <label>Fornecedor<input class="c81-input" [(ngModel)]="formAbastecimento.fornecedor" name="fornecedor" required /></label>
              <label>Nota fiscal<input class="c81-input" [(ngModel)]="formAbastecimento.notaFiscal" name="notaFiscal" /></label>
              <label>Quantidade (kg)<input class="c81-input" type="number" min="0.001" step="0.001" [(ngModel)]="formAbastecimento.quantidadeKg" name="quantidadeKg" required /></label>
              <label>Cilindros<input class="c81-input" type="number" min="1" step="1" [(ngModel)]="formAbastecimento.quantidadeCilindros" name="quantidadeCilindros" required /></label>
              <label>Valor total (R$)<input class="c81-input" type="number" min="0" step="0.01" [(ngModel)]="formAbastecimento.valorTotal" name="valorTotal" required /></label>
              <div style="align-self: end;"><button class="c81-button c81-button--primary" type="submit" [disabled]="salvando()">{{ salvando() ? 'Salvando...' : 'Registrar abastecimento' }}</button></div>
            </form>
            <h3 style="margin: 0 0 var(--space-4);">Últimos abastecimentos</h3>
            @if (abastecimentos().length === 0) { <p>Nenhum abastecimento registrado.</p> }
            @else { <ul style="margin: 0; padding-left: 1.2rem; display: grid; gap: var(--space-2); color: var(--text-secondary);">
              @for (abastecimento of abastecimentos(); track abastecimento.id) {
                <li style="display:flex; justify-content:space-between; align-items:center; gap: var(--space-3); flex-wrap:wrap;">
                  <span>{{ formatarData(abastecimento.data) }} - {{ abastecimento.fornecedor }} - {{ abastecimento.quantidadeKg }} kg - {{ abastecimento.notaFiscal || 'Sem nota' }} - R$ {{ abastecimento.valorTotal.toFixed(2) }} - R$ {{ abastecimento.custoPorKg.toFixed(2) }}/kg.</span>
                  <button type="button" class="c81-button c81-button--secondary" [disabled]="excluindoAbastecimento() === abastecimento.id" (click)="excluirAbastecimento(abastecimento.id)">
                    {{ excluindoAbastecimento() === abastecimento.id ? 'Excluindo...' : 'Excluir' }}
                  </button>
                </li>
              }
            </ul> }
          }
        </div>
      }

      @if (section() === 'leituras') {
        <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6);">
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; min-width: 0;">
              Inquilino
              <select class="c81-input" [(ngModel)]="formLeitura.tenantId" name="leituraTenantId" (ngModelChange)="onLeituraTenantChange($event)">
                <option value="">Selecione o inquilino</option>
                @for (inquilino of inquilinos(); track inquilino.id) {
                  <option [value]="inquilino.id">{{ inquilino.nome }}</option>
                }
              </select>
            </label>
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; min-width: 0;">
              Data da leitura inicial
              <input class="c81-input" type="date" [(ngModel)]="formLeitura.dataInicial" name="leituraDataInicial" />
            </label>
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; min-width: 0;">
              Leitura inicial (m³)
              <input class="c81-input" type="number" step="0.01" [(ngModel)]="formLeitura.leituraInicial" name="leituraInicial" />
            </label>
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; min-width: 0;">
              Data da leitura final
              <input class="c81-input" type="date" [(ngModel)]="formLeitura.dataFinal" name="leituraDataFinal" />
            </label>
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; min-width: 0;">
              Leitura final (m³)
              <input class="c81-input" type="number" step="0.01" [(ngModel)]="formLeitura.leituraFinal" name="leituraFinal" />
            </label>
          </div>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; margin-bottom: var(--space-5);">
            Observação
            <textarea class="c81-input" rows="3" [(ngModel)]="formLeitura.observacao" name="leituraObservacao" placeholder="Observações da medição, ajuste de equipamento, etc."></textarea>
          </label>

          <div style="display: flex; gap: var(--space-3);">
            <button type="button" class="c81-button c81-button--primary" (click)="salvarLeitura()">Salvar medição</button>
            <button type="button" class="c81-button c81-button--secondary" (click)="limparLeituraForm()">Limpar</button>
          </div>
        </div>

        <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5); margin-top: var(--space-6);">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); margin-bottom: var(--space-4); flex-wrap: wrap;">
            <h3 style="margin: 0;">Histórico por inquilino</h3>
            <span style="color: var(--text-secondary); font-size: 0.9rem;">{{ leiturasCentral().length }} registros</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3); margin-bottom: var(--space-4);">
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div class="c81-eyebrow">TOTAL DO PERÍODO</div>
              <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ leituraResumo().totalConsumoM3.toFixed(2) }} m³</div>
            </div>
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div class="c81-eyebrow">CONSUMO EM KG</div>
              <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ leituraResumo().totalConsumoKg.toFixed(2) }} kg</div>
            </div>
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div class="c81-eyebrow">REGISTROS</div>
              <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ leituraResumo().totalLeituras }}</div>
            </div>
          </div>

          @if (leiturasCentral().length === 0) {
            <p style="margin: 0; color: var(--text-secondary);">Nenhuma medição registrada.</p>
          } @else {
            <div style="display: flex; flex-direction: column; gap: var(--space-3);">
              <div style="display: grid; grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr; gap: var(--space-3); align-items: center; padding: 0 var(--space-3) var(--space-2); color: var(--text-secondary); font-size: 0.8rem; text-transform: uppercase; border-bottom: var(--hairline);">
                <div>Nome do inquilino</div>
                <div>Data da leitura</div>
                <div>Leitura inicial</div>
                <div>Leitura final</div>
                <div>Consumo kg</div>
              </div>

              @for (item of leiturasCentral(); track item.id) {
                <div style="display: grid; grid-template-columns: 1.5fr 1.2fr 1fr 1fr 1fr; gap: var(--space-3); align-items: center; padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                  <div><strong>{{ item.nomeInquilino }}</strong></div>
                  <div>{{ formatarData(item.dataLeitura) }}</div>
                  <div>{{ item.leituraInicial.toFixed(2) }} m³</div>
                  <div>{{ item.leituraFinal.toFixed(2) }} m³</div>
                  <div>{{ item.consumoKg.toFixed(2) }} kg</div>
                </div>
              }
            </div>
          }
        </div>
      }

      @if (section() === 'fechamento') {
        <div style="display: flex; flex-direction: column; gap: var(--space-5);">
          <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
            <div style="display: flex; justify-content: space-between; align-items: end; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap;">
              <div>
                <div class="c81-eyebrow">CABEÇALHO DO FECHAMENTO</div>
                <h3 style="margin: var(--space-2) 0 0;">Fechamento mensal</h3>
              </div>
              <button type="button" class="c81-button c81-button--primary" (click)="salvarFechamento()">Salvar</button>
            </div>

            @if (fechamentoSalvo()) {
              <p style="margin: 0 0 var(--space-4); color: var(--success-700, #2e7d32);">{{ fechamentoSalvo() }}</p>
            }

            @if (fechamentosVisiveis().length > 0) {
              <div style="margin: 0 0 var(--space-4); border: var(--hairline); border-radius: 10px; padding: var(--space-3); background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">FECHAMENTOS SALVOS</div>
                <div style="display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: var(--space-2);">
                  @for (fechamento of fechamentosVisiveis(); track fechamento.id) {
                    <div style="min-width: 210px; padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.01);">
                      <div style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 700;">{{ obterNomeInquilino(fechamento.tenantId || this.formFechamento.inquilinoId || this.tenantId()) }}</div>
                      <div style="font-size: 0.72rem; color: var(--text-secondary); text-transform: uppercase; margin-top: var(--space-1);">{{ formatarMes(fechamento.mes) }}</div>
                      <div style="margin-top: var(--space-1); font-weight: 700;">{{ formatarMoeda(fechamento.valorFaturado) }}</div>
                      <div style="margin-top: var(--space-1); font-size: 0.8rem; color: var(--text-secondary);">Custo: {{ formatarMoeda(fechamento.custoPeriodo) }}</div>
                      <div style="margin-top: var(--space-2); font-size: 0.8rem; color: var(--text-secondary);">Valor faturado: {{ formatarMoeda(fechamento.valorFaturado) }}</div>
                      <div style="display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-2);">
                        <button type="button" class="c81-button c81-button--secondary" (click)="revisarFechamento(fechamento)">Revisar</button>
                        <button type="button" class="c81-button c81-button--primary" (click)="editarFechamento(fechamento)">Editar</button>
                        <button type="button" class="c81-button c81-button--secondary" (click)="excluirFechamento(fechamento.id)">Excluir</button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4);">
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; color: var(--text-secondary);">
                Inquilinos
                <select class="c81-input" [(ngModel)]="formFechamento.inquilinoId" name="fechamentoInquilino" (ngModelChange)="onFechamentoTenantChange($event)">
                  <option value="">Todos</option>
                  @for (inquilino of inquilinos(); track inquilino.id) {
                    <option [value]="inquilino.id">{{ inquilino.nome }}</option>
                  }
                </select>
              </label>

              <label style="display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; font-weight: 500; color: var(--text-secondary);">
                Período
                <div style="display: flex; gap: var(--space-2);">
                  <input class="c81-input" type="date" [(ngModel)]="formFechamento.periodoInicio" name="fechamentoPeriodoInicio" />
                  <input class="c81-input" type="date" [(ngModel)]="formFechamento.periodoFim" name="fechamentoPeriodoFim" />
                </div>
              </label>

              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; color: var(--text-secondary);">
                Data do fechamento
                <input class="c81-input" type="date" [(ngModel)]="formFechamento.dataFechamento" name="fechamentoData" />
              </label>

            </div>
          </div>

          <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); flex-wrap: wrap;">
              <h3 style="margin: 0;">Leituras aguardando fechamento</h3>
              <span class="c81-eyebrow">{{ leiturasAguardandoFechamento().length }} registros</span>
            </div>

            @if (leiturasAguardandoFechamento().length === 0) {
              <p style="margin: 0; color: var(--text-secondary);">Nenhuma leitura pendente para o inquilino selecionado.</p>
            } @else {
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; min-width: 920px;">
                  <thead>
                    <tr style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.75rem; border-bottom: var(--hairline);">
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Inquilino</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Leit. anterior</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Leit. atual</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Consumo</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">kg</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of leiturasAguardandoFechamento(); track item.id) {
                      <tr style="border-bottom: var(--hairline);">
                        <td style="padding: var(--space-3);"><strong>{{ item.nomeInquilino }}</strong></td>
                        <td style="padding: var(--space-3);">{{ item.leituraInicial.toFixed(2) }} m³</td>
                        <td style="padding: var(--space-3);">{{ item.leituraFinal.toFixed(2) }} m³</td>
                        <td style="padding: var(--space-3);">{{ item.consumoM3.toFixed(2) }} m³</td>
                        <td style="padding: var(--space-3);">{{ item.consumoKg.toFixed(2) }} kg</td>
                        <td style="padding: var(--space-3);">{{ formatarValorFechamento(item) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      }

      @if (section() === 'relatorios') {
        <div style="display: flex; flex-direction: column; gap: var(--space-5);">
          <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-4);">Relatório mensal de consumo por cozinha</h3>
            @if (relatorioConsumoPorCozinha().length === 0) {
              <p style="margin: 0; color: var(--text-secondary);">Nenhuma leitura para consolidar no período atual.</p>
            } @else {
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; min-width: 500px;">
                  <thead>
                    <tr style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.75rem; border-bottom: var(--hairline);">
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Cozinha / inquilino</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Leituras</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Total kg</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Média kg</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of relatorioConsumoPorCozinha(); track item.nome) {
                      <tr style="border-bottom: var(--hairline);">
                        <td style="padding: var(--space-3);"><strong>{{ item.nome }}</strong></td>
                        <td style="padding: var(--space-3);">{{ item.leituras }}</td>
                        <td style="padding: var(--space-3);">{{ item.totalKg.toFixed(2) }} kg</td>
                        <td style="padding: var(--space-3);">{{ item.mediaKg.toFixed(2) }} kg</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>

          <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-4);">Comparativo entre abastecimento, consumo e perdas</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
              <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">ABASTECIMENTO</div>
                <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ relatorioComparativo().abastecimentosKg.toFixed(2) }} kg</div>
              </div>
              <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">CONSUMO</div>
                <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ relatorioComparativo().consumoKg.toFixed(2) }} kg</div>
              </div>
              <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">PERDAS</div>
                <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ relatorioComparativo().perdasKg.toFixed(2) }} kg</div>
              </div>
              <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">ESTOQUE FINAL</div>
                <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ relatorioComparativo().estoqueFinalKg.toFixed(2) }} kg</div>
              </div>
            </div>
            <div style="margin-top: var(--space-4); display: grid; gap: var(--space-2);">
              <div style="display: flex; justify-content: space-between; color: var(--text-secondary);"><span>Abastecimento</span><strong>{{ relatorioComparativo().abastecimentosKg.toFixed(2) }} kg</strong></div>
              <div style="height: 10px; border-radius: 999px; background: rgba(255,255,255,0.08); overflow: hidden; display: flex;">
                <div style="width: {{ calcularPercentual(relatorioComparativo().abastecimentosKg, relatorioComparativo().abastecimentosKg + relatorioComparativo().consumoKg + relatorioComparativo().perdasKg) }}%; background: #4ade80; height: 100%;"></div>
                <div style="width: {{ calcularPercentual(relatorioComparativo().consumoKg, relatorioComparativo().abastecimentosKg + relatorioComparativo().consumoKg + relatorioComparativo().perdasKg) }}%; background: #f59e0b; height: 100%;"></div>
                <div style="width: {{ calcularPercentual(relatorioComparativo().perdasKg, relatorioComparativo().abastecimentosKg + relatorioComparativo().consumoKg + relatorioComparativo().perdasKg) }}%; background: #ef4444; height: 100%;"></div>
              </div>
              <div style="display: flex; justify-content: space-between; color: var(--text-secondary);"><span>Diferença líquida</span><strong>{{ relatorioComparativo().diferenca.toFixed(2) }} kg</strong></div>
            </div>
          </div>

          <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-4);">Previsão de autonomia e indicadores de vazamento</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-3);">
              <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">AUTONOMIA</div>
                <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ relatorioAutonomia().autonomiaDias }} dias</div>
              </div>
              <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">ALERTA</div>
                <div style="font-size: 1rem; font-weight: 700; margin-top: var(--space-1); text-transform: uppercase;">{{ relatorioAutonomia().alerta }}</div>
              </div>
              <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">MÉDIA DIÁRIA</div>
                <div style="font-size: 1.5rem; font-weight: 700; margin-top: var(--space-1);">{{ relatorioAutonomia().consumoMedioDiario.toFixed(2) }} kg</div>
              </div>
              <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
                <div class="c81-eyebrow">PICOS</div>
                <div style="font-size: 1.1rem; font-weight: 700; margin-top: var(--space-1);">{{ relatorioAutonomia().picos }} item(s)</div>
              </div>
            </div>
            @if (relatorioAutonomia().maiorPico) {
              <p style="margin: var(--space-4) 0 0; color: var(--text-secondary);">
                Maior pico identificado: <strong>{{ relatorioAutonomia().maiorPico?.nome ?? 'N/A' }}</strong> com {{ (relatorioAutonomia().maiorPico?.valor ?? 0).toFixed(2) }} kg no período.
              </p>
            }
          </div>

          <div style="border: var(--hairline); border-radius: 12px; background: var(--surface-card); padding: var(--space-5);">
            <h3 style="margin: 0 0 var(--space-4);">Resumo financeiro para cobrança por restaurante</h3>
            @if (relatorioFinanceiro().length === 0) {
              <p style="margin: 0; color: var(--text-secondary);">Nenhum valor de consumo para cobrir no período.</p>
            } @else {
              <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                  <thead>
                    <tr style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.75rem; border-bottom: var(--hairline);">
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Restaurante</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Consumo kg</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Valor unit.</th>
                      <th style="padding: 0 var(--space-3) var(--space-2); text-align: left;">Cobrança</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of relatorioFinanceiro(); track item.nome) {
                      <tr style="border-bottom: var(--hairline);">
                        <td style="padding: var(--space-3);"><strong>{{ item.nome }}</strong></td>
                        <td style="padding: var(--space-3);">{{ item.totalKg.toFixed(2) }} kg</td>
                        <td style="padding: var(--space-3);">{{ formatarMoeda(item.valorUnitarioKg) }}</td>
                        <td style="padding: var(--space-3);"><strong>{{ formatarMoeda(item.valorCobrado) }}</strong></td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class CentralGlpComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  protected readonly section = toSignal(
    this.route.data.pipe(map((data) => (data['section'] as string) ?? 'dashboard')),
    { initialValue: 'dashboard' },
  );

  protected readonly inquilinos = signal<InquilinoOption[]>([]);
  protected readonly tenantId = signal('');
  protected readonly dashboard = signal<DashboardGlp | null>(null);
  protected readonly central = signal<CentralGlp | null>(null);
  protected readonly abastecimentos = signal<AbastecimentoGlp[]>([]);
  protected readonly gasDashboard = signal<GasDashboardItem[]>([]);
  protected readonly precosPorTenant = signal<Record<string, number>>({});
  protected readonly gasFiltroTenant = signal<string>('');
  protected readonly gasDataInicio = signal<string>('');
  protected readonly gasDataFim = signal<string>('');
  protected readonly perdas = signal<Array<{ id: string; tenantId: string; tipo: string; quantidadeKg: number }>>([]);
  protected readonly leiturasCentral = signal<LeituraCentralGlpItem[]>([]);
  protected readonly fechamentos = signal<FechamentoGlpApi[]>([]);
  protected readonly fechamentosGlobais = signal<FechamentoGlpApi[]>([]);
  protected readonly leiturasAguardandoFechamento = computed(() => {
    const tenantId = this.formFechamento.inquilinoId || this.tenantId();
    if (!tenantId) {
      return this.leiturasCentral();
    }
    return this.leiturasCentral().filter((item) => item.tenantId === tenantId);
  });
  protected readonly fechamentosDoInquilino = computed(() => {
    const tenantId = this.formFechamento.inquilinoId || this.tenantId();
    const itens = this.fechamentos();
    if (!tenantId) {
      return itens;
    }
    return itens.filter((item) => item.tenantId === tenantId).sort((a, b) => b.mes.localeCompare(a.mes));
  });
  protected readonly fechamentosVisiveis = computed(() => {
    const itens = this.formFechamento.inquilinoId ? this.fechamentosDoInquilino() : this.fechamentosGlobais();
    const mesInicio = this.formFechamento.periodoInicio ? this.formFechamento.periodoInicio.slice(0, 7) : '';
    const mesFim = this.formFechamento.periodoFim ? this.formFechamento.periodoFim.slice(0, 7) : '';

    return itens
      .slice()
      .sort((a, b) => b.mes.localeCompare(a.mes))
      .filter((item) => {
        const matchPeriodo = (!mesInicio || item.mes >= mesInicio) && (!mesFim || item.mes <= mesFim);
        return matchPeriodo;
      });
  });
  protected readonly erro = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly excluindoAbastecimento = signal<string | null>(null);
  protected readonly fechamentoSalvo = signal<string | null>(null);
  protected formFechamento = {
    inquilinoId: '',
    periodoInicio: '',
    periodoFim: '',
    dataFechamento: '',
  };
  protected formCentral: {
    nomeCentral: string;
    capacidadeTotalKg: number;
    capacidadeCilindrosKg: number;
    capacidadePorCilindroKg: number;
    estoqueAtualKg: number;
    estoqueMinimoKg: number;
    estoqueCriticoKg: number;
    valorUnitarioKgFornecedor: number;
    valorUnitarioKgInquilino: number;
    unidadeCompra: 'kg';
    unidadeMedicao: 'm3';
    fatorConversao: number;
    statusCentral: StatusCentralGlp;
  } = {
    nomeCentral: '',
    capacidadeTotalKg: 0,
    capacidadeCilindrosKg: 0,
    capacidadePorCilindroKg: 0,
    estoqueAtualKg: 0,
    estoqueMinimoKg: 0,
    estoqueCriticoKg: 0,
    valorUnitarioKgFornecedor: 0,
    valorUnitarioKgInquilino: 0,
    unidadeCompra: 'kg',
    unidadeMedicao: 'm3',
    fatorConversao: 1,
    statusCentral: 'ativa',
  };
  protected formAbastecimento = { data: '', fornecedor: '', notaFiscal: '', quantidadeKg: 0, quantidadeCilindros: 0, valorTotal: 0 };
  protected formLeitura = {
    tenantId: '',
    dataInicial: '',
    leituraInicial: '',
    dataFinal: '',
    leituraFinal: '',
    observacao: '',
  };

  constructor() {
    this.http.get<InquilinoOption[]>(`${API_BASE}/backoffice/inquilinos`).subscribe({
      next: (lista) => {
        this.inquilinos.set(lista);

        if (this.section() === 'abastecimentos') {
          const tenantInicial = lista[0]?.id ?? '';
          this.tenantId.set(tenantInicial);
          this.formFechamento.inquilinoId = tenantInicial;
          this.formLeitura.tenantId = tenantInicial;
          this.central.set(null);
          this.abastecimentos.set([]);
          if (tenantInicial) {
            this.carregarCentral(tenantInicial);
            this.carregarAbastecimentos(tenantInicial);
          }
        } else if (this.section() === 'cadastro' || this.section() === 'leituras' || this.section() === 'dashboard' || this.section() === 'relatorios') {
          if (lista.length > 0 && !this.tenantId()) {
            this.gasFiltroTenant.set('');
            this.formFechamento.inquilinoId = '';
            this.tenantId.set('');
            this.central.set(null);
          }
        }
        if (this.section() === 'fechamento') {
          this.formFechamento.inquilinoId = '';
          this.carregarFechamentosGlobais();
        }
        if (this.section() === 'dashboard' || this.section() === 'relatorios') {
          this.carregarDashboard();
          this.carregarResumoGlobal();
        }
        this.carregarGasDashboard();
      },
      error: () => {
        this.erro.set('Não foi possível carregar os inquilinos.');
        this.carregarGasDashboard();
      },
    });
  }

  protected selecionarInquilino(tenantId: string): void {
    this.tenantId.set(tenantId);
    this.gasFiltroTenant.set(tenantId);
    this.formLeitura.tenantId = tenantId;
    this.formFechamento.inquilinoId = tenantId;
    this.formFechamento.periodoInicio = this.getPeriodoAtual().inicio;
    this.formFechamento.periodoFim = this.getPeriodoAtual().fim;
    this.formFechamento.dataFechamento = new Date().toISOString().slice(0, 10);
    this.fechamentoSalvo.set(null);
    this.dashboard.set(null);
    this.erro.set(null);
    this.central.set(null);
    if (!tenantId) {
      this.gasDashboard.set([]);
      this.leiturasCentral.set([]);
      this.fechamentos.set([]);
      return;
    }
    this.carregarCentral(tenantId);
    this.carregarAbastecimentos(tenantId);
    this.carregarLeiturasCentral(tenantId);
    this.carregarGasDashboard();
    this.carregarDashboard();
    this.carregarFechamentos(tenantId);
  }

  protected salvarCentral(event: Event): void {
    event.preventDefault();
    const tenantId = this.tenantId();
    if (!tenantId || this.salvando()) return;

    const payload = this.normalizarCentralForm(this.formCentral);
    this.salvando.set(true);
    this.erro.set(null);
    this.http.post<CentralGlp>(`${API_BASE}/backoffice/central-glp/central`, { tenantId, ...payload }).subscribe({
      next: (central) => {
        this.central.set(central);
        this.formCentral = this.normalizarCentralForm({
          nomeCentral: central.nomeCentral ?? payload.nomeCentral,
          capacidadeTotalKg: central.capacidadeTotalKg,
          capacidadeCilindrosKg: central.capacidadeCilindrosKg,
          capacidadePorCilindroKg: central.capacidadePorCilindroKg ?? (central.capacidadeTotalKg / (central.capacidadeCilindrosKg || 1)),
          estoqueAtualKg: central.estoqueAtualKg,
          estoqueMinimoKg: central.estoqueMinimoKg,
          estoqueCriticoKg: central.estoqueCriticoKg,
          valorUnitarioKgFornecedor: central.valorUnitarioKgFornecedor ?? 0,
          valorUnitarioKgInquilino: central.valorUnitarioKgInquilino ?? 0,
          unidadeCompra: 'kg',
          unidadeMedicao: 'm3',
          fatorConversao: central.fatorConversao,
          statusCentral: central.statusCentral ?? 'ativa',
        });
        this.salvando.set(false);
        this.carregarDashboard();
      },
      error: (error) => { this.erro.set(error?.error?.message ?? 'Não foi possível salvar a central.'); this.salvando.set(false); },
    });
  }

  protected registrarAbastecimento(event: Event): void {
    event.preventDefault();
    const tenantId = this.tenantId();
    if (!tenantId || this.salvando()) return;
    this.salvando.set(true);
    this.erro.set(null);
    this.http.post<AbastecimentoGlp>(`${API_BASE}/backoffice/central-glp/abastecimentos`, { tenantId, ...this.formAbastecimento }).subscribe({
      next: () => { this.formAbastecimento = { data: '', fornecedor: '', notaFiscal: '', quantidadeKg: 0, quantidadeCilindros: 0, valorTotal: 0 }; this.salvando.set(false); this.carregarCentral(tenantId); this.carregarAbastecimentos(tenantId); this.carregarDashboard(); },
      error: (error) => { this.erro.set(error?.error?.message ?? 'Não foi possível registrar o abastecimento.'); this.salvando.set(false); },
    });
  }

  private normalizarCentralForm(form: Partial<CentralGlp> | null | undefined): typeof this.formCentral {
    const base = form ?? this.formCentral;
    const numero = (valor: number | string | null | undefined, fallback = 0): number => {
      const parsed = Number(valor ?? fallback);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    return {
      nomeCentral: String(base.nomeCentral ?? this.formCentral.nomeCentral ?? 'Central de GLP').trim() || 'Central de GLP',
      capacidadeTotalKg: numero(base.capacidadeTotalKg, 0),
      capacidadeCilindrosKg: numero(base.capacidadeCilindrosKg, 0),
      capacidadePorCilindroKg: numero(base.capacidadePorCilindroKg, 0),
      estoqueAtualKg: numero(base.estoqueAtualKg, 0),
      estoqueMinimoKg: numero(base.estoqueMinimoKg, 0),
      estoqueCriticoKg: numero(base.estoqueCriticoKg, 0),
      valorUnitarioKgFornecedor: numero(base.valorUnitarioKgFornecedor, 0),
      valorUnitarioKgInquilino: numero(base.valorUnitarioKgInquilino, 0),
      unidadeCompra: 'kg',
      unidadeMedicao: 'm3',
      fatorConversao: numero(base.fatorConversao, 1),
      statusCentral: base.statusCentral ?? this.formCentral.statusCentral ?? 'ativa',
    };
  }

  private carregarCentral(tenantId: string): void {
    this.http.get<CentralGlp | null>(`${API_BASE}/backoffice/central-glp/central`, { params: { tenantId } }).subscribe({
      next: (central) => {
        const estaAtivo = this.tenantId() === tenantId || this.formFechamento.inquilinoId === tenantId;
        if (!estaAtivo) {
          return;
        }

        this.central.set(central);
        if (central) {
          this.formCentral = this.normalizarCentralForm({
            nomeCentral: central.nomeCentral ?? this.formCentral.nomeCentral,
            capacidadeTotalKg: central.capacidadeTotalKg,
            capacidadeCilindrosKg: central.capacidadeCilindrosKg,
            capacidadePorCilindroKg: central.capacidadePorCilindroKg ?? (central.capacidadeTotalKg / (central.capacidadeCilindrosKg || 1)),
            estoqueAtualKg: central.estoqueAtualKg,
            estoqueMinimoKg: central.estoqueMinimoKg,
            estoqueCriticoKg: central.estoqueCriticoKg,
            valorUnitarioKgFornecedor: central.valorUnitarioKgFornecedor ?? 0,
            valorUnitarioKgInquilino: central.valorUnitarioKgInquilino ?? 0,
            unidadeCompra: 'kg',
            unidadeMedicao: 'm3',
            fatorConversao: central.fatorConversao,
            statusCentral: central.statusCentral ?? 'ativa',
          });
          this.precosPorTenant.update((mapa) => ({ ...mapa, [tenantId]: central.valorUnitarioKgInquilino ?? 0 }));
        }
      },
    });
  }
  private carregarAbastecimentos(tenantId: string): void { this.http.get<AbastecimentoGlp[]>(`${API_BASE}/backoffice/central-glp/abastecimentos`, { params: { tenantId } }).subscribe({ next: (lista) => this.abastecimentos.set(lista) }); }
  private carregarDashboard(): void { this.http.get<DashboardGlp>(`${API_BASE}/backoffice/central-glp/dashboard`).subscribe({ next: (dashboard) => this.dashboard.set(dashboard) }); }
  private carregarResumoGlobal(): void {
    const inquilinos = this.inquilinos();
    if (!inquilinos.length) {
      this.abastecimentos.set([]);
      this.perdas.set([]);
      this.precosPorTenant.set({});
      return;
    }

    const requests = inquilinos.map((inquilino) => forkJoin({
      central: this.http.get<CentralGlp | null>(`${API_BASE}/backoffice/central-glp/central`, { params: { tenantId: inquilino.id } }),
      abastecimentos: this.http.get<AbastecimentoGlp[]>(`${API_BASE}/backoffice/central-glp/abastecimentos`, { params: { tenantId: inquilino.id } }),
      perdas: this.http.get<Array<{ id: string; tipo: string; quantidadeKg: number }>>(`${API_BASE}/backoffice/central-glp/perdas`, { params: { tenantId: inquilino.id } }),
    }));

    forkJoin(requests).subscribe({
      next: (listas) => {
        const precos = listas.reduce<Record<string, number>>((acc, grupo, index) => {
          const tenantId = inquilinos[index].id;
          acc[tenantId] = grupo.central?.valorUnitarioKgInquilino ?? 0;
          return acc;
        }, {});
        const abastecimentos = listas.flatMap((grupo, index) => grupo.abastecimentos.map((item) => ({ ...item, tenantId: inquilinos[index].id })));
        const perdas = listas.flatMap((grupo, index) => grupo.perdas.map((item) => ({ ...item, tenantId: inquilinos[index].id })));
        this.precosPorTenant.set(precos);
        this.abastecimentos.set(abastecimentos);
        this.perdas.set(perdas);
      },
      error: () => {
        this.abastecimentos.set([]);
        this.perdas.set([]);
        this.precosPorTenant.set({});
      },
    });
  }
  private carregarFechamentos(tenantId: string): void {
    this.http.get<FechamentoGlpApi[]>(`${API_BASE}/backoffice/central-glp/fechamento`, { params: { tenantId } }).subscribe({
      next: (lista) => {
        const organizados = [...lista].sort((a, b) => b.mes.localeCompare(a.mes));
        this.fechamentos.set(organizados);
      },
      error: () => this.fechamentos.set([]),
    });

    this.carregarFechamentosGlobais();
  }

  private carregarFechamentosGlobais(): void {
    const inquilinos = this.inquilinos();
    if (inquilinos.length === 0) {
      this.fechamentosGlobais.set([]);
      return;
    }

    const requests = inquilinos.map((inquilino) =>
      this.http.get<FechamentoGlpApi[]>(`${API_BASE}/backoffice/central-glp/fechamento`, { params: { tenantId: inquilino.id } }),
    );

    forkJoin(requests).subscribe({
      next: (listas) => {
        const acumulado = listas.flat();
        this.fechamentosGlobais.set(acumulado.sort((a, b) => b.mes.localeCompare(a.mes)));
      },
      error: () => this.fechamentosGlobais.set([]),
    });
  }
  private carregarGasDashboard(): void {
    const params: Record<string, string> = {};
    if (this.gasFiltroTenant()) {
      params['tenantId'] = this.gasFiltroTenant();
    }
    if (this.gasDataInicio()) {
      params['dataInicio'] = this.gasDataInicio();
    }
    if (this.gasDataFim()) {
      params['dataFim'] = this.gasDataFim();
    }

    this.http.get<GasDashboardItem[]>(`${API_BASE}/backoffice/central-glp/leituras/dashboard`, { params }).subscribe({
      next: (lista) => this.gasDashboard.set(lista),
      error: () => this.gasDashboard.set([]),
    });
  }

  protected onLeituraTenantChange(tenantId: string): void {
    this.formLeitura.tenantId = tenantId;
    if (tenantId) {
      this.carregarLeiturasCentral(tenantId);
    } else {
      this.leiturasCentral.set([]);
    }
  }

  protected salvarLeitura(): void {
    const tenantId = this.formLeitura.tenantId || this.tenantId();
    if (!tenantId) {
      this.erro.set('Selecione um inquilino antes de salvar a medição.');
      return;
    }

    const leituraInicial = Number(this.formLeitura.leituraInicial);
    const leituraFinal = Number(this.formLeitura.leituraFinal);
    const dataLeitura = this.formLeitura.dataFinal || this.formLeitura.dataInicial;

    if (!this.formLeitura.dataInicial || !this.formLeitura.dataFinal || !Number.isFinite(leituraInicial) || !Number.isFinite(leituraFinal)) {
      this.erro.set('Preencha a data e as leituras inicial/final antes de salvar.');
      return;
    }

    if (leituraFinal < leituraInicial) {
      this.erro.set('A leitura final não pode ser menor que a inicial.');
      return;
    }

    this.erro.set(null);
    this.http.post(`${API_BASE}/backoffice/central-glp/leituras`, {
      tenantId,
      cozinhaId: tenantId,
      data: dataLeitura,
      leituraAnterior: leituraInicial,
      leituraAtual: leituraFinal,
      unidade: 'm3',
      fatorConversao: this.central()?.fatorConversao,
    }).subscribe({
      next: () => {
        this.limparLeituraForm();
        this.carregarLeiturasCentral(tenantId);
        this.carregarGasDashboard();
      },
      error: (error) => {
        this.erro.set(error?.error?.message ?? 'Não foi possível salvar a leitura.');
      },
    });
  }

  protected limparLeituraForm(): void {
    this.formLeitura = {
      tenantId: this.tenantId() || '',
      dataInicial: '',
      leituraInicial: '',
      dataFinal: '',
      leituraFinal: '',
      observacao: '',
    };
  }

  private carregarLeiturasCentral(tenantId: string): void {
    if (!tenantId) {
      this.leiturasCentral.set([]);
      return;
    }

    this.http.get<Array<{ id: string; data: string; leituraAnterior: number | string; leituraAtual: number | string; consumoM3?: number | string; consumoKg?: number | string; unidade?: string; fatorConversao?: number | string; }>>(
      `${API_BASE}/backoffice/central-glp/leituras`,
      { params: { tenantId } },
    ).subscribe({
      next: (lista) => {
        const fator = this.central()?.fatorConversao ?? 1;
        this.leiturasCentral.set(
          lista.map((item) => {
            const leituraInicial = Number(item.leituraAnterior ?? 0);
            const leituraFinal = Number(item.leituraAtual ?? 0);
            const consumoM3 = Number(item.consumoM3 ?? (leituraFinal - leituraInicial));
            const consumoKg = Number(item.consumoKg ?? (consumoM3 * fator));
            return {
              id: item.id,
              tenantId,
              nomeInquilino: this.obterNomeInquilino(tenantId),
              dataLeitura: item.data,
              leituraInicial,
              leituraFinal,
              consumoM3,
              consumoKg,
              observacao: '',
            };
          }),
        );
      },
      error: () => this.leiturasCentral.set([]),
    });
  }

  protected readonly leituraResumo = () => {
    const itens = this.leiturasCentral();
    if (itens.length === 0) {
      return { totalConsumoM3: 0, totalConsumoKg: 0, totalLeituras: 0 };
    }

    return {
      totalConsumoM3: itens.reduce((total, item) => total + item.consumoM3, 0),
      totalConsumoKg: itens.reduce((total, item) => total + item.consumoKg, 0),
      totalLeituras: itens.length,
    };
  };

  protected alterarFiltroGas(tenantId: string): void {
    this.gasFiltroTenant.set(tenantId);
    this.carregarGasDashboard();
  }

  protected alterarPeriodoGas(dataInicio: string, dataFim: string): void {
    this.gasDataInicio.set(dataInicio || '');
    this.gasDataFim.set(dataFim || '');
    this.carregarGasDashboard();
  }

  protected aplicarPeriodoGasAtual(): void {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    this.gasDataInicio.set(inicio.toISOString().slice(0, 10));
    this.gasDataFim.set(fim.toISOString().slice(0, 10));
    this.carregarGasDashboard();
  }

  protected aplicarPeriodoGas30Dias(): void {
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 29);

    this.gasDataInicio.set(inicio.toISOString().slice(0, 10));
    this.gasDataFim.set(fim.toISOString().slice(0, 10));
    this.carregarGasDashboard();
  }

  protected excluirLeitura(tenantId: string, id: string): void {
    if (!tenantId || !id) return;
    const confirmado = window.confirm('Deseja excluir esta leitura de gás?');
    if (!confirmado) return;
    this.http.delete(`${API_BASE}/backoffice/central-glp/leituras/${id}`, { params: { tenantId } }).subscribe({
      next: () => this.carregarGasDashboard(),
      error: () => this.carregarGasDashboard(),
    });
  }

  protected excluirAbastecimento(id: string): void {
    const tenantId = this.tenantId();
    if (!tenantId || !id) return;
    const confirmado = window.confirm('Deseja excluir este abastecimento?');
    if (!confirmado) return;

    this.excluindoAbastecimento.set(id);
    this.http.delete(`${API_BASE}/backoffice/central-glp/abastecimentos/${id}`, { params: { tenantId } }).subscribe({
      next: () => {
        this.excluindoAbastecimento.set(null);
        this.carregarCentral(tenantId);
        this.carregarAbastecimentos(tenantId);
        this.carregarDashboard();
      },
      error: () => {
        this.excluindoAbastecimento.set(null);
        this.erro.set('Não foi possível excluir o abastecimento.');
        this.carregarAbastecimentos(tenantId);
      },
    });
  }

  protected obterNomeInquilino(tenantId: string): string {
    return this.inquilinos().find((inquilino) => inquilino.id === tenantId)?.nome ?? 'Inquilino';
  }

  protected formatarData(dataIso: string): string {
    const data = new Date(dataIso);
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
  }

  private getPeriodoAtual(): { inicio: string; fim: string } {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    return {
      inicio: inicio.toISOString().slice(0, 10),
      fim: fim.toISOString().slice(0, 10),
    };
  }

  protected formatarValorFechamento(item: LeituraCentralGlpItem): string {
    const valorUnitario = this.central()?.valorUnitarioKgInquilino ?? 0;
    const valor = item.consumoKg * valorUnitario;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }

  protected formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor ?? 0);
  }

  protected formatarMes(mes: string): string {
    const [ano, mesNumero] = mes.split('-');
    const data = new Date(Number(ano), Number(mesNumero) - 1, 1);
    return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  protected salvarFechamento(): void {
    const tenantId = this.formFechamento.inquilinoId || this.tenantId();
    const periodoInicio = this.formFechamento.periodoInicio || this.getPeriodoAtual().inicio;
    const periodoFim = this.formFechamento.periodoFim || this.getPeriodoAtual().fim;
    const mes = periodoInicio.slice(0, 7);
    const tenantAtivo = this.tenantId();

    if (!tenantId) {
      this.erro.set('Selecione um inquilino antes de salvar o fechamento.');
      return;
    }

    const centralAtual = this.central();
    if (centralAtual && tenantAtivo === tenantId && this.formFechamento.inquilinoId === tenantId) {
      const custoPorKg = centralAtual.valorUnitarioKgInquilino ?? 0;
      const consumoTotalKg = this.leiturasCentral().reduce((total, item) => total + item.consumoKg, 0);
      const valorFaturado = consumoTotalKg * custoPorKg;
      const payload = { tenantId, mes, custoPorKg, valorFaturado };

      this.erro.set(null);
      this.http.post<FechamentoGlpApi>(`${API_BASE}/backoffice/central-glp/fechamento`, payload).subscribe({
        next: (fechamento) => {
          const periodo = `${periodoInicio} até ${periodoFim}`;
          const data = this.formFechamento.dataFechamento || new Date().toISOString().slice(0, 10);
          this.fechamentoSalvo.set(
            `Fechamento salvo: ${fechamento.mes} • ${this.formatarDataEmTexto(data)} • Valor faturado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fechamento.valorFaturado)} • Período: ${periodo}`,
          );
          this.carregarFechamentos(tenantId);
        },
        error: (error) => {
          this.erro.set(error?.error?.message ?? 'Não foi possível salvar o fechamento.');
        },
      });
      return;
    }

    this.tenantId.set(tenantId);

    const prosseguir = (central: CentralGlp | null) => {
      if (!central) {
        this.erro.set('Cadastre a central de GLP antes do fechamento mensal.');
        return;
      }

      const custoPorKg = central.valorUnitarioKgInquilino ?? 0;
      const consumoTotalKg = this.leiturasCentral().reduce((total, item) => total + item.consumoKg, 0);
      const valorFaturado = consumoTotalKg * custoPorKg;
      const payload = { tenantId, mes, custoPorKg, valorFaturado };

      this.erro.set(null);
      this.http.post<FechamentoGlpApi>(`${API_BASE}/backoffice/central-glp/fechamento`, payload).subscribe({
        next: (fechamento) => {
          const periodo = `${periodoInicio} até ${periodoFim}`;
          const data = this.formFechamento.dataFechamento || new Date().toISOString().slice(0, 10);
          this.fechamentoSalvo.set(
            `Fechamento salvo: ${fechamento.mes} • ${this.formatarDataEmTexto(data)} • Valor faturado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(fechamento.valorFaturado)} • Período: ${periodo}`,
          );
          this.carregarFechamentos(tenantId);
        },
        error: (error) => {
          this.erro.set(error?.error?.message ?? 'Não foi possível salvar o fechamento.');
        },
      });
    };

    this.http.get<CentralGlp | null>(`${API_BASE}/backoffice/central-glp/central`, { params: { tenantId } }).subscribe({
      next: (central) => {
        this.central.set(central);
        if (central) {
          this.formCentral = this.normalizarCentralForm({
            nomeCentral: central.nomeCentral ?? this.formCentral.nomeCentral,
            capacidadeTotalKg: central.capacidadeTotalKg,
            capacidadeCilindrosKg: central.capacidadeCilindrosKg,
            capacidadePorCilindroKg: central.capacidadePorCilindroKg ?? (central.capacidadeTotalKg / (central.capacidadeCilindrosKg || 1)),
            estoqueAtualKg: central.estoqueAtualKg,
            estoqueMinimoKg: central.estoqueMinimoKg,
            estoqueCriticoKg: central.estoqueCriticoKg,
            valorUnitarioKgFornecedor: central.valorUnitarioKgFornecedor ?? 0,
            valorUnitarioKgInquilino: central.valorUnitarioKgInquilino ?? 0,
            unidadeCompra: 'kg',
            unidadeMedicao: 'm3',
            fatorConversao: central.fatorConversao,
            statusCentral: central.statusCentral ?? 'ativa',
          });
        }
        prosseguir(central);
      },
      error: () => prosseguir(null),
    });
  }

  protected editarFechamento(item: FechamentoGlpApi): void {
    const tenantId = item.tenantId || this.formFechamento.inquilinoId || this.tenantId();
    this.tenantId.set(tenantId);
    this.formFechamento.inquilinoId = tenantId;
    this.formFechamento.periodoInicio = `${item.mes}-01`;
    this.formFechamento.periodoFim = new Date(Number(item.mes.slice(0, 4)), Number(item.mes.slice(5, 7)), 0).toISOString().slice(0, 10);
    this.fechamentoSalvo.set(`Edição habilitada para ${this.formatarMes(item.mes)}.`);
  }

  protected revisarFechamento(item: FechamentoGlpApi | string): void {
    const fechamento = typeof item === 'string'
      ? [...this.fechamentos(), ...this.fechamentosGlobais()].find((registro) => registro.id === item)
      : item;
    if (!fechamento) return;

    const tenantId = fechamento.tenantId || this.tenantId() || this.formFechamento.inquilinoId;
    this.tenantId.set(tenantId);
    this.formFechamento.inquilinoId = tenantId;
    this.formFechamento.periodoInicio = `${fechamento.mes}-01`;
    this.formFechamento.periodoFim = new Date(Number(fechamento.mes.slice(0, 4)), Number(fechamento.mes.slice(5, 7)), 0).toISOString().slice(0, 10);
    this.fechamentoSalvo.set(`Registro em revisão: ${this.obterNomeInquilino(tenantId)}.`);
  }

  protected excluirFechamento(id: string): void {
    const fechamento = [...this.fechamentos(), ...this.fechamentosGlobais()].find((item) => item.id === id);
    if (!fechamento) return;
    const tenantId = fechamento.tenantId || this.formFechamento.inquilinoId || this.tenantId();
    if (!tenantId) return;

    const confirmado = window.confirm('Deseja excluir este fechamento salvo?');
    if (!confirmado) return;

    this.http.delete(`${API_BASE}/backoffice/central-glp/fechamento/${id}`, { params: { tenantId } }).subscribe({
      next: () => {
        this.fechamentos.set(this.fechamentos().filter((item) => item.id !== id));
        this.fechamentosGlobais.set(this.fechamentosGlobais().filter((item) => item.id !== id));
        this.fechamentoSalvo.set('Fechamento removido com sucesso.');
      },
      error: (error) => {
        this.erro.set(error?.error?.message ?? 'Não foi possível excluir o fechamento.');
      },
    });
  }

  protected formatarDataEmTexto(dataIso: string): string {
    const data = new Date(`${dataIso}T00:00:00`);
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
  }

  protected onFechamentoTenantChange(tenantId: string): void {
    this.tenantId.set(tenantId);
    this.formFechamento.inquilinoId = tenantId;
    this.fechamentoSalvo.set(null);
    this.erro.set(null);
    this.central.set(null);
    if (!tenantId) {
      this.leiturasCentral.set([]);
      this.fechamentos.set([]);
      return;
    }
    this.carregarCentral(tenantId);
    this.carregarLeiturasCentral(tenantId);
    this.carregarFechamentos(tenantId);
  }

  protected readonly gasResumo = () => {
    const itens = this.gasDashboard();
    if (itens.length === 0) {
      return { totalConsumo: 0, totalLeituras: 0, maiorConsumo: 0 };
    }

    const totalConsumo = itens.reduce((total, item) => total + item.consumoKg, 0);
    const maiorConsumo = Math.max(...itens.map((item) => item.consumoKg));

    return { totalConsumo, totalLeituras: itens.length, maiorConsumo };
  };

  protected readonly relatorioConsumoPorCozinha = computed(() => {
    const itens = this.gasDashboard();
    if (itens.length === 0) return [] as Array<{ nome: string; leituras: number; totalKg: number; mediaKg: number }>;

    const mapa = new Map<string, { nome: string; leituras: number; totalKg: number }>();
    itens.forEach((item) => {
      const chave = item.tenantId || item.nomeInquilino || 'cozinha';
      const registro = mapa.get(chave) ?? { nome: item.nomeInquilino || 'Cozinha', leituras: 0, totalKg: 0 };
      registro.leituras += 1;
      registro.totalKg += item.consumoKg;
      mapa.set(chave, registro);
    });

    return [...mapa.values()]
      .map((item) => ({
        nome: item.nome,
        leituras: item.leituras,
        totalKg: item.totalKg,
        mediaKg: item.totalKg / Math.max(item.leituras, 1),
      }))
      .sort((a, b) => b.totalKg - a.totalKg);
  });

  protected readonly relatorioComparativo = computed(() => {
    const dashboard = this.dashboard() as (DashboardGlp & {
      totalAbastecimentosKg?: number;
      movimentos?: Array<{ tipo?: string; quantidadeKg?: number | string }>;
    }) | null;
    const consumoKg = this.gasResumo().totalConsumo;
    const abastecimentosKg = this.abastecimentos().reduce((total, item) => total + Number(item.quantidadeKg ?? 0), 0) || dashboard?.totalAbastecimentosKg || 0;
    const perdasKg = this.perdas().reduce((total, item) => total + Number(item.quantidadeKg ?? 0), 0) || (dashboard?.movimentos ?? [])
      .filter((item: { tipo?: string; quantidadeKg?: number | string }) => item.tipo === 'perda' || item.tipo === 'vazamento' || item.tipo === 'erro_medicao' || item.tipo === 'ajuste')
      .reduce((total: number, item: { quantidadeKg?: number | string }) => total + Number(item.quantidadeKg ?? 0), 0);
    const estoqueFinalKg = dashboard?.estoqueAtualKg ?? this.central()?.estoqueAtualKg ?? Math.max(0, abastecimentosKg - consumoKg - perdasKg);
    const diferenca = abastecimentosKg - consumoKg - perdasKg;

    return { abastecimentosKg, consumoKg, perdasKg, estoqueFinalKg, diferenca };
  });

  protected readonly relatorioAutonomia = computed(() => {
    const dashboard = this.dashboard() as (DashboardGlp & {
      previsaoAutonomiaDias?: number;
      alertaEstoque?: 'normal' | 'baixo' | 'critico';
    }) | null;
    const central = this.central();
    const itens = this.gasDashboard();
    const comparativo = this.relatorioComparativo();
    const estoqueAtualKg = dashboard?.estoqueAtualKg ?? central?.estoqueAtualKg ?? Math.max(0, comparativo.abastecimentosKg - comparativo.consumoKg - comparativo.perdasKg);
    const consumoMedioDiario = itens.length > 0 ? this.gasResumo().totalConsumo / Math.max(itens.length, 1) : 0;
    const autonomiaDias = dashboard?.previsaoAutonomiaDias ?? (estoqueAtualKg > 0 && this.gasResumo().totalConsumo > 0
      ? Math.max(1, Math.round((estoqueAtualKg / Math.max(this.gasResumo().totalConsumo, 1)) * 30))
      : 0);

    const maiorConsumo = itens.reduce(
      (maior: { nome: string; valor: number }, item: GasDashboardItem) => item.consumoKg > maior.valor ? { nome: item.nomeInquilino || 'Cozinha', valor: item.consumoKg } : maior,
      { nome: 'N/A', valor: 0 },
    );
    const picos = itens.filter((item: GasDashboardItem) => item.consumoKg > consumoMedioDiario * 1.75).length;

    return {
      autonomiaDias,
      alerta: dashboard?.alertaEstoque ?? (estoqueAtualKg <= (central?.estoqueCriticoKg || 0) ? 'Crítico' : 'Normal'),
      consumoMedioDiario,
      picos,
      maiorPico: maiorConsumo.valor > 0 ? maiorConsumo : null,
    };
  });

  protected readonly relatorioFinanceiro = computed(() => {
    const itens = this.gasDashboard();
    if (itens.length === 0) return [] as Array<{ nome: string; totalKg: number; valorUnitarioKg: number; valorCobrado: number }>;

    const mapa = new Map<string, { nome: string; totalKg: number; valorUnitarioKg: number }>();
    itens.forEach((item) => {
      const chave = item.tenantId || item.nomeInquilino || 'cozinha';
      const valorUnitarioKg = this.precosPorTenant()[chave] ?? this.central()?.valorUnitarioKgInquilino ?? 0;
      const registro = mapa.get(chave) ?? { nome: item.nomeInquilino || 'Cozinha', totalKg: 0, valorUnitarioKg };
      registro.totalKg += item.consumoKg;
      registro.valorUnitarioKg = valorUnitarioKg;
      mapa.set(chave, registro);
    });

    return [...mapa.values()]
      .map((item) => ({
        nome: item.nome,
        totalKg: item.totalKg,
        valorUnitarioKg: item.valorUnitarioKg,
        valorCobrado: item.totalKg * item.valorUnitarioKg,
      }))
      .sort((a, b) => b.valorCobrado - a.valorCobrado);
  });

  protected calcularPercentual(valor: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.max(0, (valor / total) * 100));
  }

  protected readonly cards = () => {
    const dashboard = this.dashboard();
    if (!dashboard) return [] as SectionCard[];
    const resumoLeituras = this.gasResumo();
    const valorFaturado = resumoLeituras.totalConsumo * dashboard.custoMedioKg;
    return [
      { label: 'ESTOQUE', value: `${dashboard.estoqueAtualKg.toFixed(1)} kg`, meta: `${dashboard.percentualCapacidade.toFixed(1)}% da capacidade` },
      { label: 'CONSUMO', value: `${resumoLeituras.totalConsumo.toFixed(1)} kg`, meta: 'Consumo no período filtrado' },
      { label: 'CUSTO MÉDIO', value: `R$ ${dashboard.custoMedioKg.toFixed(2)}`, meta: 'Custo por kg do GLP' },
      { label: 'VALOR FATURADO', value: `R$ ${valorFaturado.toFixed(2)}`, meta: 'Cobrança do período filtrado' },
    ];
  };

  protected readonly titulo = () => {
    const value = this.section();
    const labels: Record<string, string> = {
      dashboard: 'Dashboard',
      cadastro: 'Cadastro da Central',
      abastecimentos: 'Abastecimentos',
      leituras: 'Leituras',
      fechamento: 'Fechamento',
      relatorios: 'Relatórios',
    };
    return labels[value] ?? 'Central de GLP';
  };
}
