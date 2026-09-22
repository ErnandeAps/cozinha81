import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';
import { AuthService } from '../core/auth.service';

interface Cozinha {
  id: string;
  nome: string;
  equipada: boolean;
  status?: 'liberada' | 'interditada';
  areaM2?: number | null;
  area_m2?: number | null;
  criado_em: string;
  inquilino_id?: string | null;
  inquilino_nome?: string | null;
}

type ModalidadeReserva = 'turno' | 'cafe' | 'almoco' | 'jantar' | 'personalizado' | 'dia';

interface Reserva {
  id: string;
  cozinha_id: string;
  modalidade: ModalidadeReserva;
  inicio?: string;
  fim?: string;
}

interface InquilinoOption {
  id: string;
  nome: string;
}

@Component({
  selector: 'app-cozinhas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardComponent, ButtonComponent],
  template: `
    <header class="c81-page-header" style="padding: var(--space-6); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span class="c81-eyebrow">UNIDADES</span>
        <h1 class="c81-page-title" style="margin: 0; font-size: 2rem;">Cozinhas</h1>
      </div>
      <c81-button variant="primary" (click)="abrirCadastro()" data-test="nova-cozinha">+ Nova cozinha</c81-button>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      @if (erro()) {
        <p role="alert" class="c81-alert-danger" data-test="erro">{{ erro() }}</p>
      }

      <!-- Form to Create/Edit -->
      @if (mostrandoForm()) {
        <c81-card [raised]="true" [pad]="true" style="max-width: 520px;">
          <h2 style="margin-bottom: var(--space-4);">{{ editandoId() ? 'Editar Cozinha' : 'Cadastrar Cozinha' }}</h2>
          <form (submit)="salvar($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Nome da Cozinha
                <input class="c81-input" [(ngModel)]="form.nome" name="nome" placeholder="Ex: Cozinha Industrial 1" required data-test="f-nome" />
              </label>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Tamanho em m²
                <input class="c81-input" type="number" min="0" step="1" [(ngModel)]="form.areaM2" name="areaM2" placeholder="Ex: 120" data-test="f-area-m2" />
              </label>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Equipamentos
                <select class="c81-input" [(ngModel)]="form.equipada" name="equipada" data-test="f-equipada">
                  <option [ngValue]="true">Equipada</option>
                  <option [ngValue]="false">Não equipada</option>
                </select>
              </label>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Status
                <select class="c81-input" [(ngModel)]="form.status" name="status" data-test="f-status-valor">
                  <option value="liberada">Liberada</option>
                  <option value="interditada">Interditada</option>
                </select>
              </label>
            </div>

            <div style="display: flex; gap: var(--space-3); margin-top: var(--space-2);">
              <c81-button type="submit" variant="primary" data-test="f-salvar">{{ editandoId() ? 'Atualizar' : 'Salvar' }}</c81-button>
              <c81-button type="button" variant="ghost" (click)="fecharForm()">Cancelar</c81-button>
            </div>
          </form>
        </c81-card>
      }

      <!-- Kitchens List -->
      <c81-card [pad]="true">
        @if (carregando()) {
          <p>Carregando cozinhas...</p>
        } @else if (cozinhas().length === 0) {
          <p>Nenhuma cozinha cadastrada no momento.</p>
        } @else {
          <table class="c81-table" data-test="tabela-cozinhas" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left;">
                <th style="padding: var(--space-3) 0;">Nome</th>
                <th style="padding: var(--space-3) 0;">Tamanho</th>
                <th style="padding: var(--space-3) 0;">Equipamentos</th>
                <th style="padding: var(--space-3) 0;">Status</th>
                <th style="padding: var(--space-3) 0; text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (c of cozinhas(); track c.id) {
                <tr style="border-bottom: var(--hairline);">
                  <td style="padding: var(--space-3) 0; font-weight: 500;">
                    {{ c.nome }}
                  </td>
                  <td style="padding: var(--space-3) 0;">
                    {{ obterTamanhoCozinha(c) }}
                  </td>
                  <td style="padding: var(--space-3) 0;">
                    {{ obterEquipamentosCozinha(c) }}
                  </td>
                  <td style="padding: var(--space-3) 0;">
                    @if (obterStatusCozinha(c) === 'liberada') {
                      <span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; background: rgba(34, 197, 94, 0.14); color: #4ade80; font-weight: 500;">Liberada</span>
                    } @else {
                      <span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; background: rgba(107, 114, 128, 0.2); color: #9ca3af; font-weight: 500;">Interditada</span>
                    }
                  </td>
                  <td style="padding: var(--space-3) 0; text-align: right; display: flex; justify-content: flex-end; gap: var(--space-2);">
                    <c81-button size="sm" variant="ghost" (click)="abrirEdicao(c)" data-test="editar-cozinha">Editar</c81-button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </c81-card>
    </div>
  `,
})
export class CozinhasComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly cozinhas = signal<Cozinha[]>([]);
  protected readonly inquilinos = signal<InquilinoOption[]>([]);
  protected readonly modalidadesReserva = signal<Record<string, ModalidadeReserva>>({});
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);
  protected readonly mostrandoForm = signal(false);
  protected readonly editandoId = signal<string | null>(null);

  protected form = { nome: '', equipada: false, areaM2: 0, status: 'liberada', inquilinoId: '' };

  ngOnInit(): void {
    this.carregarInquilinos();
    this.carregar();
  }

  protected carregarInquilinos(): void {
    this.http.get<InquilinoOption[]>(`${API_BASE}/backoffice/inquilinos`).subscribe({
      next: (lista) => this.inquilinos.set(lista),
      error: () => this.inquilinos.set([]),
    });
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.http.get<Cozinha[]>(`${API_BASE}/backoffice/cozinhas`).subscribe({
      next: (lista) => {
        const listaUnica = Array.from(new Map(lista.map((cozinha) => [cozinha.id, {
          ...cozinha,
          areaM2: cozinha.areaM2 ?? cozinha.area_m2 ?? 0,
          status: cozinha.status ?? (cozinha.equipada ? 'liberada' : 'interditada'),
        }])).values());
        this.cozinhas.set(listaUnica);
        this.carregarModalidadesReserva(listaUnica.map((cozinha) => cozinha.id));
        this.carregando.set(false);
      },
      error: (e) => {
        if (e?.status === 401 || e?.status === 403) {
          this.auth.logout();
          void this.router.navigate(['/login']);
          return;
        }

        this.erro.set('Não foi possível carregar as cozinhas.');
        this.carregando.set(false);
      },
    });
  }

  protected obterTamanhoCozinha(cozinha: Cozinha): string {
    const area = Number(cozinha.areaM2 ?? cozinha.area_m2 ?? 0);
    return area > 0 ? `${area} m²` : '—';
  }

  protected obterEquipamentosCozinha(cozinha: Cozinha): string {
    return cozinha.equipada ? 'Equipada' : 'Não equipada';
  }

  protected obterStatusCozinha(cozinha: Cozinha): 'liberada' | 'interditada' {
    return cozinha.status ?? (cozinha.equipada ? 'liberada' : 'interditada');
  }

  protected obterModalidadeReserva(cozinhaId: string): ModalidadeReserva | null {
    return this.modalidadesReserva()[cozinhaId] ?? null;
  }

  protected formatarModalidadeReserva(modalidade: ModalidadeReserva | null): string {
    if (!modalidade) {
      return '—';
    }

    const rotulos: Record<ModalidadeReserva, string> = {
      turno: 'Turno',
      cafe: 'Café',
      almoco: 'Almoço',
      jantar: 'Jantar',
      personalizado: 'Personalizado',
      dia: 'Dia inteiro',
    };

    return rotulos[modalidade];
  }

  protected abrirCadastro(): void {
    this.editandoId.set(null);
    this.form = { nome: '', equipada: false, areaM2: 0, status: 'liberada', inquilinoId: '' };
    this.mostrandoForm.set(true);
  }

  protected abrirEdicao(cozinha: Cozinha): void {
    this.editandoId.set(cozinha.id);
    this.form = {
      nome: cozinha.nome,
      equipada: cozinha.equipada,
      areaM2: Number(cozinha.areaM2 ?? cozinha.area_m2 ?? 0),
      status: this.obterStatusCozinha(cozinha),
      inquilinoId: cozinha.inquilino_id ?? '',
    };
    this.mostrandoForm.set(true);
  }

  protected fecharForm(): void {
    this.editandoId.set(null);
    this.mostrandoForm.set(false);
  }

  protected salvar(event: Event): void {
    event.preventDefault();
    this.erro.set(null);

    const nome = this.form.nome.trim();
    if (!nome) {
      this.erro.set('Informe o nome da cozinha.');
      return;
    }

    const payload = {
      nome,
      equipada: this.form.equipada,
      status: this.form.status,
      areaM2: Number(this.form.areaM2 ?? 0),
      inquilinoId: this.form.inquilinoId || undefined,
    };
    const id = this.editandoId();

    const request = id
      ? this.http.put(`${API_BASE}/backoffice/cozinhas/${id}`, payload)
      : this.http.post(`${API_BASE}/backoffice/cozinhas`, payload);

    request.subscribe({
      next: () => {
        this.mostrandoForm.set(false);
        this.editandoId.set(null);
        this.carregar();
      },
      error: (e) => {
        if (e?.status === 401 || e?.status === 403) {
          this.auth.logout();
          void this.router.navigate(['/login']);
          return;
        }

        this.erro.set(e?.error?.message ?? 'Não foi possível salvar a cozinha.');
      },
    });
  }

  private carregarModalidadesReserva(cozinhaIds: string[]): void {
    if (cozinhaIds.length === 0) {
      this.modalidadesReserva.set({});
      return;
    }

    const promessas = cozinhaIds.map((cozinhaId) =>
      this.http.get<Reserva[]>(`${API_BASE}/backoffice/reservas/cozinha/${cozinhaId}`).toPromise()
    );

    Promise.all(promessas).then((listas) => {
      const mapa: Record<string, ModalidadeReserva> = {};

      listas.forEach((reservas, index) => {
        const cozinhaId = cozinhaIds[index];
        if (!cozinhaId || !reservas?.length) return;

        const modalidade = this.escolherModalidadeReserva(reservas);
        if (modalidade) {
          mapa[cozinhaId] = modalidade;
        }
      });

      this.modalidadesReserva.set(mapa);
    }).catch(() => {
      this.modalidadesReserva.set({});
    });
  }

  private escolherModalidadeReserva(reservas: Reserva[]): ModalidadeReserva | null {
    const agora = Date.now();

    const emAndamento = [...reservas]
      .filter((reserva) => {
        const inicio = reserva.inicio ? new Date(reserva.inicio).getTime() : null;
        const fim = reserva.fim ? new Date(reserva.fim).getTime() : null;
        return inicio !== null && fim !== null && inicio <= agora && fim > agora;
      })
      .sort((a, b) => {
        const dataA = a.inicio ? new Date(a.inicio).getTime() : 0;
        const dataB = b.inicio ? new Date(b.inicio).getTime() : 0;
        return dataB - dataA;
      });

    if (emAndamento.length > 1) {
      return 'turno';
    }

    if (emAndamento.length > 0 && emAndamento[0]?.modalidade) {
      return emAndamento[0].modalidade;
    }

    const futuras = [...reservas]
      .filter((reserva) => reserva.inicio && new Date(reserva.inicio).getTime() > agora)
      .sort((a, b) => new Date(a.inicio ?? 0).getTime() - new Date(b.inicio ?? 0).getTime());

    if (futuras.length > 1) {
      return 'turno';
    }

    if (futuras.length > 0 && futuras[0]?.modalidade) {
      return futuras[0].modalidade;
    }

    const maisRecente = [...reservas].sort((a, b) => {
      const dataA = a.inicio ? new Date(a.inicio).getTime() : 0;
      const dataB = b.inicio ? new Date(b.inicio).getTime() : 0;
      return dataB - dataA;
    })[0];

    return maisRecente?.modalidade ?? null;
  }
}
