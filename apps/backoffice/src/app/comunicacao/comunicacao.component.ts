import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

type TipoDestinatario = 'todos' | 'inquilino';

interface ComunicacaoApi {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'Informativo' | 'Urgente';
  destinatario: TipoDestinatario;
  tenant_id: string | null;
  criado_em: string;
}

interface InquilinoOption {
  id: string;
  nome: string;
}

@Component({
  selector: 'app-comunicacao',
  standalone: true,
  imports: [CardComponent, FormsModule],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">COMUNICAÇÃO</span>
      <h1 style="margin: 0; font-size: 2rem;">Comunicação Hub × restaurantes</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Nova comunicação</h2>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
          <label style="display: flex; align-items: center; gap: var(--space-2);">
            <input type="radio" name="destinatario" value="todos" [(ngModel)]="destinatario" />
            <span>Enviar para todos</span>
          </label>

          <label style="display: flex; align-items: center; gap: var(--space-2);">
            <input type="radio" name="destinatario" value="inquilino" [(ngModel)]="destinatario" />
            <span>Enviar para um inquilino</span>
          </label>
        </div>

        @if (destinatario === 'inquilino') {
          <div style="margin-top: var(--space-4);">
            <label style="display: block; margin-bottom: var(--space-2); font-weight: 600;">Inquilino</label>
            <select [(ngModel)]="inquilinoSelecionado" style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.12); background: white; color: var(--text-primary);">
              <option value="">Selecione o inquilino</option>
              @for (inquilino of inquilinos; track inquilino.id) {
                <option [value]="inquilino.id">{{ inquilino.nome }}</option>
              }
            </select>
          </div>
        }

        <div style="margin-top: var(--space-4); display: grid; gap: var(--space-4);">
          <div>
            <label for="titulo" style="display: block; margin-bottom: var(--space-2); font-weight: 600;">Título</label>
            <input id="titulo" [(ngModel)]="titulo" type="text" placeholder="Ex.: Ajuste de agenda e manutenção" style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.12); background: white; color: var(--text-primary);" />
          </div>

          <div>
            <label for="tipo" style="display: block; margin-bottom: var(--space-2); font-weight: 600;">Tipo</label>
            <select id="tipo" [(ngModel)]="tipo" style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.12); background: white; color: var(--text-primary);">
              <option value="Informativo">Informativo</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>

          <div>
            <label for="mensagem" style="display: block; margin-bottom: var(--space-2); font-weight: 600;">Mensagem</label>
            <textarea id="mensagem" [(ngModel)]="mensagem" rows="4" placeholder="Descreva a comunicação para os destinatários" style="width: 100%; padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(0,0,0,0.12); background: white; color: var(--text-primary); resize: vertical;"></textarea>
          </div>

          <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
            <button type="button" (click)="gerarComunicacao()" style="width: fit-content; border: none; border-radius: 999px; padding: 0.75rem 1.25rem; background: var(--brand-500); color: white; font-weight: 700; cursor: pointer;">
              Gerar comunicação
            </button>

            <button type="button" (click)="salvarComunicacao()" style="width: fit-content; border: 1px solid rgba(0,0,0,0.12); border-radius: 999px; padding: 0.75rem 1.25rem; background: white; color: var(--text-primary); font-weight: 700; cursor: pointer;">
              Salvar comunicação
            </button>
          </div>
        </div>
      </c81-card>

      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Comunicados salvos</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          @for (salva of comunicacoesSalvas; track salva.id) {
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                <strong>{{ salva.titulo }}</strong>
                <span [style.color]="tipoCor(salva.tipo)">{{ salva.tipo }}</span>
              </div>
              <div style="color: var(--text-secondary); margin-bottom: var(--space-2);">{{ salva.descricao }}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">Enviado para: {{ salva.destino }} · Salvo em {{ salva.salvoEm }}</div>
            </div>
          }
        </div>
      </c81-card>

      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Avisos e comunicados</h2>
        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          @for (aviso of avisos; track aviso.id) {
            <div style="padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.02);">
              <div style="display: flex; justify-content: space-between; gap: var(--space-3); align-items: center; margin-bottom: var(--space-2);">
                <strong>{{ aviso.titulo }}</strong>
                <span [style.color]="tipoCor(aviso.tipo)">{{ aviso.tipo }}</span>
              </div>
              <div style="color: var(--text-secondary); margin-bottom: var(--space-2);">{{ aviso.descricao }}</div>
              <div style="font-size: 0.85rem; color: var(--text-secondary);">Enviado para: {{ aviso.destino }}</div>
            </div>
          }
        </div>
      </c81-card>
    </div>
  `,
})
export class ComunicacaoComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected destinatario: TipoDestinatario = 'todos';
  protected inquilinoSelecionado = '';
  protected titulo = '';
  protected tipo: 'Informativo' | 'Urgente' = 'Informativo';
  protected mensagem = '';

  protected inquilinos: Array<{ id: string; nome: string }> = [];
  protected avisos: Array<{ id: string; titulo: string; descricao: string; tipo: string; destino: string }> = [];
  protected comunicacoesSalvas: Array<{ id: string; titulo: string; descricao: string; tipo: string; destino: string; salvoEm: string }> = [];

  ngOnInit(): void {
    this.carregarInquilinos();
    this.carregarComunicacoes();
  }

  protected gerarComunicacao(): void {
    const aviso = this.criarAviso();
    if (!aviso) return;

    this.avisos.unshift(aviso);
    this.limparFormulario();
  }

  protected salvarComunicacao(): void {
    const payload = this.criarPayload();
    if (!payload) return;

    this.http.post<ComunicacaoApi>(`${API_BASE}/backoffice/comunicacao`, payload).subscribe({
      next: (salva) => {
        const item = this.mapComunicacao(salva, true);
        this.avisos.unshift(item);
        this.comunicacoesSalvas.unshift({ ...item, salvoEm: new Date(salva.criado_em).toLocaleString('pt-BR') });
        this.limparFormulario();
      },
      error: () => {
        // sem feedback visual neste escopo; a operação não deve quebrar a tela
      },
    });
  }

  private carregarInquilinos(): void {
    this.http.get<InquilinoOption[]>(`${API_BASE}/backoffice/inquilinos`).subscribe({
      next: (lista) => {
        this.inquilinos = lista.map((tenant) => ({ id: tenant.id, nome: tenant.nome || tenant.id }));
      },
    });
  }

  private carregarComunicacoes(): void {
    this.http.get<ComunicacaoApi[]>(`${API_BASE}/backoffice/comunicacao`).subscribe({
      next: (lista) => {
        this.avisos = lista.map((item) => this.mapComunicacao(item, false));
      },
    });
  }

  private mapComunicacao(item: ComunicacaoApi, incluirData: boolean): { id: string; titulo: string; descricao: string; tipo: string; destino: string; salvoEm?: string } {
    const destino = item.destinatario === 'todos' ? 'Todos os restaurantes' : (this.inquilinoSelecionado || item.tenant_id || 'Inquilino selecionado');
    const mapped = {
      id: item.id,
      titulo: item.titulo,
      descricao: item.mensagem,
      tipo: item.tipo,
      destino,
    };

    if (incluirData) {
      return { ...mapped, salvoEm: new Date(item.criado_em).toLocaleString('pt-BR') };
    }

    return mapped;
  }

  private criarAviso(): { id: string; titulo: string; descricao: string; tipo: string; destino: string } | null {
    const textoTitulo = this.titulo.trim();
    const textoMensagem = this.mensagem.trim();

    if (!textoTitulo || !textoMensagem) {
      return null;
    }

    const destino = this.destinatario === 'todos'
      ? 'Todos os restaurantes'
      : (this.inquilinoSelecionado || 'Inquilino selecionado');

    return {
      id: `novo-${Date.now()}`,
      titulo: textoTitulo,
      descricao: textoMensagem,
      tipo: this.tipo,
      destino,
    };
  }

  private criarPayload(): { titulo: string; mensagem: string; tipo: 'Informativo' | 'Urgente'; destinatario: TipoDestinatario; tenantId?: string } | null {
    const textoTitulo = this.titulo.trim();
    const textoMensagem = this.mensagem.trim();

    if (!textoTitulo || !textoMensagem) {
      return null;
    }

    const tenantId = this.destinatario === 'inquilino' ? this.inquilinoSelecionado : undefined;

    return {
      titulo: textoTitulo,
      mensagem: textoMensagem,
      tipo: this.tipo,
      destinatario: this.destinatario,
      ...(tenantId ? { tenantId } : {}),
    };
  }

  private limparFormulario(): void {
    this.titulo = '';
    this.mensagem = '';
    this.tipo = 'Informativo';
    this.destinatario = 'todos';
    this.inquilinoSelecionado = '';
  }

  protected tipoCor(tipo: string): string {
    return tipo === 'Urgente' ? 'var(--status-stop)' : 'var(--status-warn)';
  }
}
