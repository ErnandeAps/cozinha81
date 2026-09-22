import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

type PapelUsuario = 'admin' | 'gestor' | 'operador' | 'cozinha';

interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  app: 'portal' | 'backoffice';
  papel: PapelUsuario;
  ativo: boolean;
  permissoes: string[];
}

interface FormularioUsuario {
  id: string | null;
  nome: string;
  email: string;
  senha: string;
  app: 'portal' | 'backoffice';
  papel: PapelUsuario;
  ativo: boolean;
  permissoes: string[];
}

export const PERMISSOES_POR_PAPEL: Record<PapelUsuario, string[]> = {
  admin: [
    'dashboard',
    'cozinhas',
    'agenda',
    'presencas',
    'materiais',
    'billing',
    'chamados',
    'manutencao',
    'recursos',
    'documentos',
    'comunicacao',
    'acessos',
    'integracoes',
    'estoque',
    'fichas',
    'producao',
    'pedidos',
    'entregadores',
    'custeio',
    'dashboard_operacional',
    'dashboard_gerencial',
    'cmv',
    'inicio',
  ],
  gestor: [
    'dashboard',
    'inicio',
    'dashboard_operacional',
    'dashboard_gerencial',
    'cozinhas',
    'agenda',
    'presencas',
    'materiais',
    'recursos',
    'documentos',
    'chamados',
    'pedidos',
    'entregadores',
    'estoque',
    'custeio',
  ],
  operador: [
    'inicio',
    'pedidos',
    'entregadores',
    'dashboard_operacional',
    'presencas',
    'cozinhas',
  ],
  cozinha: [
    'inicio',
    'cozinhas',
    'pedidos',
    'entregadores',
    'chamados',
  ],
};

const PORTAL_PERMISSOES = [
  'inicio',
  'estoque',
  'fichas',
  'producao',
  'pedidos',
  'entregadores',
  'custeio',
  'dashboard_operacional',
  'dashboard_gerencial',
  'cmv',
  'integracoes',
];

const BACKOFFICE_PERMISSOES = [
  'dashboard',
  'cozinhas',
  'agenda',
  'presencas',
  'materiais',
  'billing',
  'chamados',
  'manutencao',
  'recursos',
  'documentos',
  'comunicacao',
  'acessos',
  'integracoes',
  'estoque',
  'fichas',
  'producao',
  'pedidos',
  'entregadores',
  'custeio',
  'dashboard_operacional',
  'dashboard_gerencial',
  'cmv',
  'inicio',
];

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [FormsModule, CardComponent, ButtonComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">USUÁRIOS</span>
      <h1 style="margin: 0; font-size: 2rem;">Cadastro e permissões</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">{{ formulario.id ? 'Editar usuário' : 'Novo usuário' }}</h2>

        <form (submit)="salvar($event)" style="display: grid; gap: var(--space-4);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
            <label style="display:flex; flex-direction:column; gap:var(--space-1); font-weight:500;">
              Nome
              <input class="c81-input" [(ngModel)]="formulario.nome" name="nome" required />
            </label>

            <label style="display:flex; flex-direction:column; gap:var(--space-1); font-weight:500;">
              E-mail
              <input class="c81-input" type="email" [(ngModel)]="formulario.email" name="email" required />
            </label>

            <label style="display:flex; flex-direction:column; gap:var(--space-1); font-weight:500;">
              Senha
              <input class="c81-input" type="password" [(ngModel)]="formulario.senha" name="senha" required />
            </label>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: var(--space-4);">
            <label style="display:flex; flex-direction:column; gap:var(--space-1); font-weight:500;">
              Ambiente
              <select class="c81-input" [(ngModel)]="formulario.app" name="app">
                <option value="portal">Portal</option>
                <option value="backoffice">Backoffice</option>
              </select>
            </label>

            <label style="display:flex; flex-direction:column; gap:var(--space-1); font-weight:500;">
              Papel
              <select class="c81-input" [(ngModel)]="formulario.papel" name="papel" (change)="aplicarRegraPorPapel()">
                <option value="admin">Administrador</option>
                <option value="gestor">Gestor</option>
                <option value="operador">Operador</option>
                <option value="cozinha">Cozinha</option>
              </select>
            </label>

            <label style="display:flex; align-items:center; gap:var(--space-2); font-weight:500; padding-top: var(--space-5);">
              <input type="checkbox" [(ngModel)]="formulario.ativo" name="ativo" />
              Usuário ativo
            </label>
          </div>

          <div>
            <h3 style="margin-bottom: var(--space-3);">Permissões</h3>
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
              @for (permissao of permissoesDisponiveis(); track permissao) {
                <label style="display: inline-flex; align-items: center; gap: var(--space-2); padding: 0.5rem 0.75rem; border: var(--hairline); border-radius: 999px; background: rgba(255,255,255,0.02);">
                  <input type="checkbox" [checked]="formulario.permissoes.includes(permissao)" (change)="togglePermissao(permissao)" />
                  <span>{{ permissao }}</span>
                </label>
              }
            </div>
          </div>

          <div style="display: flex; gap: var(--space-3);">
            <c81-button type="submit" variant="primary">{{ formulario.id ? 'Salvar' : 'Adicionar' }}</c81-button>
            <c81-button type="button" variant="ghost" (click)="limparFormulario()">Limpar</c81-button>
          </div>
        </form>
      </c81-card>

      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Lista de usuários</h2>

        @if (usuarios().length === 0) {
          <p style="color: var(--text-secondary); margin: 0;">Nenhum usuário cadastrado ainda.</p>
        } @else {
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            @for (usuario of usuarios(); track usuario.id) {
              <div style="display: grid; grid-template-columns: 1.2fr 1fr 1fr 1fr auto auto; gap: var(--space-3); padding: var(--space-3); border: var(--hairline); border-radius: 8px; align-items: center;">
                <div>
                  <strong>{{ usuario.nome }}</strong>
                  <div style="color: var(--text-secondary); font-size: 0.85rem;">{{ usuario.email }}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Ambiente</div>
                  <div>{{ usuario.app }}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Papel</div>
                  <div>{{ usuario.papel }}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Status</div>
                  <span [style.color]="usuario.ativo ? 'var(--status-go)' : 'var(--status-stop)'">{{ usuario.ativo ? 'Ativo' : 'Inativo' }}</span>
                </div>
                <c81-button size="sm" variant="secondary" (click)="editar(usuario)">Editar</c81-button>
                <c81-button size="sm" variant="danger" (click)="excluir(usuario.id)">Excluir</c81-button>
              </div>
            }
          </div>
        }
      </c81-card>
    </div>
  `,
})
export class UsuariosComponent {
  private readonly http = inject(HttpClient);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected formulario: FormularioUsuario = {
    id: null,
    nome: '',
    email: '',
    senha: '',
    app: 'portal',
    papel: 'operador',
    ativo: true,
    permissoes: [],
  };

  protected readonly permissoesDisponiveis = computed(() => {
    const base = this.formulario.app === 'portal' ? PORTAL_PERMISSOES : BACKOFFICE_PERMISSOES;
    const regras = PERMISSOES_POR_PAPEL[this.formulario.papel] ?? [];

    if (!regras.length) {
      return base;
    }

    return Array.from(new Set([...regras, ...base.filter((permissao) => this.formulario.permissoes.includes(permissao))])).filter((permissao) => regras.includes(permissao) || base.includes(permissao));
  });

  protected salvar(event: Event): void {
    event.preventDefault();

    const form = this.formulario;
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim()) {
      return;
    }

    const regras = PERMISSOES_POR_PAPEL[form.papel] ?? [];
    const permissoes = Array.from(new Set([...regras, ...form.permissoes]));

    const payload = {
      id: form.id ?? undefined,
      nome: form.nome.trim(),
      email: form.email.trim(),
      senha: form.senha,
      app: form.app,
      papel: form.papel,
      ativo: form.ativo,
      permissoes,
    };

    const req = payload.id
      ? this.http.put<Usuario>(`${API_BASE}/backoffice/usuarios/${payload.id}`, payload)
      : this.http.post<Usuario>(`${API_BASE}/backoffice/usuarios`, payload);

    req.subscribe({
      next: () => {
        this.carregarUsuariosDoBackend();
        this.limparFormulario();
      },
      error: () => {
        this.usuarios.set([...this.usuarios()]);
        this.limparFormulario();
      },
    });
  }

  protected editar(usuario: Usuario): void {
    this.formulario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      senha: usuario.senha,
      app: usuario.app,
      papel: usuario.papel,
      ativo: usuario.ativo,
      permissoes: [...usuario.permissoes],
    };
  }

  protected excluir(id: string): void {
    this.http.delete(`${API_BASE}/backoffice/usuarios/${id}`).subscribe({
      next: () => this.carregarUsuariosDoBackend(),
      error: () => {
        this.usuarios.set([...this.usuarios()]);
      },
    });

    if (this.formulario.id === id) {
      this.limparFormulario();
    }
  }

  protected togglePermissao(permissao: string): void {
    const regras = PERMISSOES_POR_PAPEL[this.formulario.papel] ?? [];
    const base = this.formulario.app === 'portal' ? PORTAL_PERMISSOES : BACKOFFICE_PERMISSOES;
    const permitidas = new Set([...regras, ...base.filter((item) => this.formulario.permissoes.includes(item))]);

    if (!permitidas.has(permissao)) {
      return;
    }

    const form = this.formulario;
    const jaTem = form.permissoes.includes(permissao);
    this.formulario = {
      ...form,
      permissoes: jaTem ? form.permissoes.filter((item) => item !== permissao) : [...form.permissoes, permissao],
    };
  }

  protected limparFormulario(): void {
    this.formulario = {
      id: null,
      nome: '',
      email: '',
      senha: '',
      app: 'portal',
      papel: 'operador',
      ativo: true,
      permissoes: [],
    };
  }

  protected aplicarRegraPorPapel(): void {
    const regras = PERMISSOES_POR_PAPEL[this.formulario.papel] ?? [];
    const base = this.formulario.app === 'portal' ? PORTAL_PERMISSOES : BACKOFFICE_PERMISSOES;
    const mantidas = this.formulario.permissoes.filter((permissao) => base.includes(permissao));
    this.formulario = {
      ...this.formulario,
      permissoes: Array.from(new Set([...regras, ...mantidas])),
    };
  }

  ngOnInit(): void {
    this.carregarUsuariosDoBackend();
  }

  private carregarUsuariosDoBackend(): void {
    this.http.get<Usuario[]>(`${API_BASE}/backoffice/usuarios`).subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
      },
      error: () => {
        this.usuarios.set([]);
      },
    });
  }
}
