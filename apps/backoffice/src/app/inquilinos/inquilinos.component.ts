import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface InquilinoModulo {
  modulo: 'gestao_cozinha' | 'pedidos_kds';
  habilitado: boolean;
}

interface Documento {
  id: string;
  tipo: string;
  arquivo: string;
  validade: string;
}

interface Inquilino {
  id: string;
  cozinhaId?: string;
  nome: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  cnpj?: string;
  telefone?: string;
  email?: string;
  segmento?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  observacoes?: string;
  dono?: {
    id?: string;
    nome?: string;
    email?: string;
    papel?: 'dono_admin';
    status?: 'pendente';
  };
  modulos?: InquilinoModulo[];
  conviteDono?: {
    token?: string;
    expiraEm?: string;
  };
}

interface InquilinoForm {
  id: string | null;
  cozinhaId: string;
  nome: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  telefone: string;
  email: string;
  segmento: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  observacoes: string;
  donoNome: string;
  donoEmail: string;
  modulos: Array<'gestao_cozinha' | 'pedidos_kds'>;
}

const MODULOS_DISPONIVEIS: Array<'gestao_cozinha' | 'pedidos_kds'> = ['gestao_cozinha', 'pedidos_kds'];

@Component({
  selector: 'app-inquilinos',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">// INQUILINOS</span>
      <h1 style="margin: 0; font-size: 2rem;">Cadastro de inquilinos</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      @if (erro()) {
        <p role="alert" style="margin: 0; padding: var(--space-3) var(--space-4); border-radius: 8px; background: rgba(239,68,68,0.08); color: #fca5a5; border: 1px solid rgba(239,68,68,0.26);">
          {{ erro() }}
        </p>
      }

      @if (sucesso()) {
        <p role="status" style="margin: 0; padding: var(--space-3) var(--space-4); border-radius: 8px; background: rgba(34,197,94,0.08); color: #86efac; border: 1px solid rgba(34,197,94,0.26);">
          {{ sucesso() }}
        </p>
      }

      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">{{ formulario.id ? 'Editar inquilino' : 'Novo inquilino' }}</h2>

        <form (submit)="salvar($event)" style="display: grid; gap: var(--space-4);">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4);">
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Cozinha
              <select class="c81-input" [(ngModel)]="formulario.cozinhaId" name="cozinhaId" required>
                <option value="">Selecione uma cozinha</option>
                @for (cozinha of cozinhas(); track cozinha.id) {
                  <option [value]="cozinha.id">{{ cozinha.nome }}</option>
                }
              </select>
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Nome do restaurante
              <input class="c81-input" [(ngModel)]="formulario.nome" name="nome" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Razão social
              <input class="c81-input" [(ngModel)]="formulario.razaoSocial" name="razaoSocial" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Nome fantasia
              <input class="c81-input" [(ngModel)]="formulario.nomeFantasia" name="nomeFantasia" />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              CNPJ
              <input class="c81-input" [(ngModel)]="formulario.cnpj" name="cnpj" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Telefone
              <input class="c81-input" [(ngModel)]="formulario.telefone" name="telefone" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              E-mail comercial
              <input class="c81-input" type="email" [(ngModel)]="formulario.email" name="email" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Segmento
              <input class="c81-input" [(ngModel)]="formulario.segmento" name="segmento" placeholder="Café, pizzaria, delivery..." />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              CEP
              <div style="display: flex; gap: var(--space-2); align-items: center;">
                <input class="c81-input" style="flex: 1;" [(ngModel)]="formulario.cep" name="cep" maxlength="9" (blur)="procurarCep()" />
                <c81-button type="button" size="sm" variant="secondary" (click)="procurarCep()">
                  {{ cepBuscando() ? 'Buscando...' : 'Buscar' }}
                </c81-button>
              </div>
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Logradouro
              <input class="c81-input" [(ngModel)]="formulario.logradouro" name="logradouro" />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Número
              <input class="c81-input" [(ngModel)]="formulario.numero" name="numero" />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Bairro
              <input class="c81-input" [(ngModel)]="formulario.bairro" name="bairro" />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Cidade
              <input class="c81-input" [(ngModel)]="formulario.cidade" name="cidade" />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Estado
              <input class="c81-input" [(ngModel)]="formulario.estado" name="estado" />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; grid-column: 1 / -1;">
              Observações
              <textarea class="c81-input" rows="3" [(ngModel)]="formulario.observacoes" name="observacoes"></textarea>
            </label>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4);">
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Nome do dono/admin
              <input class="c81-input" [(ngModel)]="formulario.donoNome" name="donoNome" required />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              E-mail do dono/admin
              <input class="c81-input" type="email" [(ngModel)]="formulario.donoEmail" name="donoEmail" required />
            </label>
          </div>

          <div>
            <h3 style="margin: 0 0 var(--space-3);">Módulos contratados</h3>
            <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
              @for (modulo of MODULOS_DISPONIVEIS; track modulo) {
                <label style="display: inline-flex; align-items: center; gap: var(--space-2); padding: 0.5rem 0.75rem; border: var(--hairline); border-radius: 999px; background: rgba(255,255,255,0.02);">
                  <input type="checkbox" [checked]="formulario.modulos.includes(modulo)" (change)="toggleModulo(modulo)" />
                  <span>{{ modulo === 'gestao_cozinha' ? 'Gestão da cozinha' : 'Pedidos KDS' }}</span>
                </label>
              }
            </div>
          </div>

          <div style="display: flex; gap: var(--space-3);">
            <c81-button type="submit" variant="primary">
              {{ formulario.id ? 'Salvar' : 'Adicionar' }}
            </c81-button>
            <c81-button type="button" variant="ghost" (click)="limparFormulario()">
              Limpar
            </c81-button>
          </div>
        </form>
      </c81-card>

      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Inquilinos cadastrados</h2>

        @if (carregando()) {
          <p style="margin: 0; color: var(--text-secondary);">Carregando inquilinos...</p>
        } @else if (inquilinos().length === 0) {
          <p style="margin: 0; color: var(--text-secondary);">Nenhum inquilino cadastrado ainda.</p>
        } @else {
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            @for (inquilino of inquilinos(); track inquilino.id) {
              <div style="display: grid; grid-template-columns: 1.4fr 1fr 1.3fr auto auto; gap: var(--space-3); padding: var(--space-3); border: var(--hairline); border-radius: 8px; align-items: center;">
                <div>
                  <strong>{{ inquilino.nome }}</strong>
                  <div style="color: var(--text-secondary); font-size: 0.85rem;">
                    {{ inquilino.nomeFantasia || inquilino.nome }} · {{ inquilino.cidade || 'Cidade não informada' }}
                  </div>
                  <div style="color: var(--text-secondary); font-size: 0.75rem; margin-top: 2px;">
                    {{ inquilino.dono?.nome || 'Dono sem nome' }} · {{ inquilino.dono?.email || 'Sem e-mail' }}
                  </div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Contato</div>
                  <div>{{ inquilino.telefone || 'Sem telefone' }}</div>
                </div>
                <div>
                  <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Módulos</div>
                  <div>{{ listarModulos(inquilino.modulos ?? []) }}</div>
                </div>
                <c81-button size="sm" variant="secondary" (click)="editar(inquilino)">Editar</c81-button>
                <c81-button size="sm" variant="danger" (click)="excluir(inquilino.id)">Excluir</c81-button>
              </div>
            }
          </div>
        }
      </c81-card>

      <c81-card [pad]="true">
        <div style="display: flex; justify-content: space-between; align-items: end; gap: var(--space-4); flex-wrap: wrap; margin-bottom: var(--space-4);">
          <h2 style="margin: 0;">Repositório de Documentos</h2>
          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; min-width: min(280px, 100%);">
            Cozinha
            <select class="c81-input" [(ngModel)]="cozinhaDocumentosId" name="cozinhaDocumentos" (ngModelChange)="carregarDocumentosDaCozinha($event)">
              <option value="">Selecione uma cozinha</option>
              @for (cozinha of cozinhas(); track cozinha.id) {
                <option [value]="cozinha.id">{{ cozinha.nome }}</option>
              }
            </select>
          </label>
        </div>

        @if (!cozinhaDocumentosId) {
          <p style="margin: 0; color: var(--text-secondary);">Selecione uma cozinha para visualizar e anexar os documentos.</p>
        } @else {
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); align-items: start;">
            <div>
              @if (documentosCarregando()) {
                <p style="margin: 0; color: var(--text-secondary);">Carregando documentos...</p>
              } @else if (documentos().length === 0) {
                <p style="margin: 0; color: var(--text-secondary);">Nenhum documento arquivado para esta cozinha.</p>
              } @else {
                <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                  @for (doc of documentos(); track doc.id) {
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); padding: var(--space-3); border: var(--hairline); border-radius: 8px; background: rgba(255,255,255,0.03);">
                      <div>
                        <strong>{{ doc.tipo }}</strong>
                        <div style="color: var(--text-secondary); font-size: 0.85rem;">Arquivo: {{ doc.arquivo }}</div>
                      </div>
                      <div style="display: flex; align-items: center; gap: var(--space-3);">
                        <span style="font-size: 0.85rem; color: {{ estaVencido(doc.validade) ? 'var(--status-stop)' : 'var(--text-secondary)' }}">
                          Validade: {{ formatarData(doc.validade) }}
                        </span>
                        <c81-button size="sm" variant="danger" (click)="removerDocumento(doc.id)">Excluir</c81-button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <form (submit)="uploadDocumento($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
              <div>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Tipo de Documento
                  <input class="c81-input" [(ngModel)]="documentoForm.tipo" name="documentoTipo" placeholder="Ex: Alvará, Auto de Vistoria" required />
                </label>
              </div>

              <div>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Data de Validade
                  <input class="c81-input" type="date" [(ngModel)]="documentoForm.validade" name="documentoValidade" required />
                </label>
              </div>

              <div>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Arquivo (PDF, Imagem)
                  <input type="file" (change)="selecionarArquivoDocumento($event)" required style="margin-top: var(--space-1);" />
                </label>
              </div>

              @if (documentoUploadErro()) {
                <p role="alert" style="color: var(--status-stop); margin: 0;">{{ documentoUploadErro() }}</p>
              }

              <c81-button type="submit" variant="primary" [disabled]="documentoEnviando()">
                {{ documentoEnviando() ? 'Enviando...' : 'Anexar Documento' }}
              </c81-button>
            </form>
          </div>
        }
      </c81-card>
    </div>
  `,
})
export class InquilinosComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly MODULOS_DISPONIVEIS = MODULOS_DISPONIVEIS;
  protected readonly inquilinos = signal<Inquilino[]>([]);
  protected readonly cozinhas = signal<Array<{ id: string; nome: string }>>([]);
  protected readonly documentos = signal<Documento[]>([]);
  protected readonly documentosCarregando = signal(false);
  protected readonly documentoEnviando = signal(false);
  protected readonly documentoUploadErro = signal<string | null>(null);
  protected readonly carregando = signal(false);
  protected readonly cepBuscando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly sucesso = signal<string | null>(null);

  protected cozinhaDocumentosId = '';
  protected documentoForm = { tipo: '', validade: '' };
  private arquivoDocumentoSelecionado: File | null = null;

  protected formulario: InquilinoForm = {
    id: null,
    cozinhaId: '',
    nome: '',
    razaoSocial: '',
    nomeFantasia: '',
    cnpj: '',
    telefone: '',
    email: '',
    segmento: '',
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    observacoes: '',
    donoNome: '',
    donoEmail: '',
    modulos: [],
  };

  ngOnInit(): void {
    this.carregarCozinhas();
    this.carregarInquilinos();
  }

  protected salvar(event: Event): void {
    event.preventDefault();

    const form = this.formulario;
    if (!form.cozinhaId.trim() || !form.nome.trim() || !form.razaoSocial.trim() || !form.cnpj.trim() || !form.telefone.trim() || !form.donoNome.trim() || !form.donoEmail.trim()) {
      this.erro.set('Selecione a cozinha e preencha os dados principais do restaurante e do dono/admin.');
      this.sucesso.set(null);
      return;
    }

    const payload = {
      cozinhaId: form.cozinhaId.trim(),
      nome: form.nome.trim(),
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim(),
      cnpj: form.cnpj.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      segmento: form.segmento.trim(),
      cep: form.cep.trim(),
      logradouro: form.logradouro.trim(),
      numero: form.numero.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim(),
      observacoes: form.observacoes.trim(),
      dono: {
        nome: form.donoNome.trim(),
        email: form.donoEmail.trim(),
      },
      modulos: form.modulos,
    };

    this.erro.set(null);
    this.sucesso.set(form.id ? 'Salvando alterações...' : 'Cadastrando inquilino...');

    this.http.post(`${API_BASE}/backoffice/inquilinos`, payload).subscribe({
      next: () => {
        this.limparFormulario();
        this.carregarInquilinos();
        this.sucesso.set(form.id ? 'Inquilino atualizado com sucesso.' : 'Inquilino cadastrado com sucesso.');
      },
      error: (e) => {
        this.erro.set(e?.error?.message ?? 'Falha ao salvar o inquilino no banco.');
        this.sucesso.set(null);
      },
    });
  }

  protected editar(inquilino: Inquilino): void {
    this.formulario = {
      id: inquilino.id,
      cozinhaId: inquilino.cozinhaId ?? '',
      nome: inquilino.nome,
      razaoSocial: inquilino.razaoSocial ?? '',
      nomeFantasia: inquilino.nomeFantasia ?? inquilino.nome,
      cnpj: inquilino.cnpj ?? '',
      telefone: inquilino.telefone ?? '',
      email: inquilino.email ?? inquilino.dono?.email ?? '',
      segmento: inquilino.segmento ?? '',
      cep: inquilino.cep ?? '',
      logradouro: inquilino.logradouro ?? '',
      numero: inquilino.numero ?? '',
      bairro: inquilino.bairro ?? '',
      cidade: inquilino.cidade ?? '',
      estado: inquilino.estado ?? '',
      observacoes: inquilino.observacoes ?? '',
      donoNome: inquilino.dono?.nome ?? '',
      donoEmail: inquilino.dono?.email ?? '',
      modulos: (inquilino.modulos ?? []).filter((m) => m.habilitado).map((m) => m.modulo),
    };
    this.cozinhaDocumentosId = inquilino.cozinhaId ?? '';
    this.carregarDocumentosDaCozinha(this.cozinhaDocumentosId);
    this.erro.set(null);
    this.sucesso.set(null);
  }

  protected excluir(id: string): void {
    if (this.formulario.id === id) {
      this.limparFormulario();
    }
    this.sucesso.set('Removendo inquilino...');
    this.erro.set(null);

    this.http.delete(`${API_BASE}/backoffice/inquilinos/${id}`).subscribe({
      next: () => {
        this.carregarInquilinos();
        this.sucesso.set('Inquilino removido com sucesso.');
      },
      error: (e) => {
        this.erro.set(e?.error?.message ?? 'Falha ao remover o inquilino.');
        this.sucesso.set(null);
      },
    });
  }

  protected toggleModulo(modulo: 'gestao_cozinha' | 'pedidos_kds'): void {
    const atual = this.formulario.modulos.includes(modulo);
    this.formulario = {
      ...this.formulario,
      modulos: atual ? this.formulario.modulos.filter((item) => item !== modulo) : [...this.formulario.modulos, modulo],
    };
  }

  protected limparFormulario(): void {
    this.formulario = {
      id: null,
      cozinhaId: '',
      nome: '',
      razaoSocial: '',
      nomeFantasia: '',
      cnpj: '',
      telefone: '',
      email: '',
      segmento: '',
      cep: '',
      logradouro: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      observacoes: '',
      donoNome: '',
      donoEmail: '',
      modulos: [],
    };
  }

  protected listarModulos(modulos: InquilinoModulo[]): string {
    if (!modulos.length) {
      return 'Nenhum';
    }

    return modulos
      .filter((m) => m.habilitado)
      .map((m) => (m.modulo === 'gestao_cozinha' ? 'Gestão da cozinha' : 'Pedidos KDS'))
      .join(', ');
  }

  private carregarCozinhas(): void {
    this.http.get<Array<{ id: string; nome: string }>>(`${API_BASE}/backoffice/cozinhas`).subscribe({
      next: (lista) => {
        this.cozinhas.set(lista);
        if (!this.cozinhaDocumentosId && lista.length > 0) {
          this.cozinhaDocumentosId = lista[0].id;
          this.carregarDocumentosDaCozinha(this.cozinhaDocumentosId);
        }
      },
      error: () => this.cozinhas.set([]),
    });
  }

  protected carregarDocumentosDaCozinha(cozinhaId: string): void {
    if (!cozinhaId) {
      this.documentos.set([]);
      return;
    }

    this.documentosCarregando.set(true);
    this.documentoUploadErro.set(null);

    this.http.get<Documento[]>(`${API_BASE}/backoffice/documentos/cozinha/${cozinhaId}`).subscribe({
      next: (lista) => {
        this.documentos.set(lista);
        this.documentosCarregando.set(false);
      },
      error: () => {
        this.documentos.set([]);
        this.documentosCarregando.set(false);
      },
    });
  }

  protected selecionarArquivoDocumento(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.arquivoDocumentoSelecionado = input.files[0];
    }
  }

  protected uploadDocumento(event: Event): void {
    event.preventDefault();

    if (!this.cozinhaDocumentosId) {
      this.documentoUploadErro.set('Selecione uma cozinha antes de anexar um documento.');
      return;
    }

    if (!this.arquivoDocumentoSelecionado) {
      this.documentoUploadErro.set('Por favor, selecione um arquivo.');
      return;
    }

    const tipo = this.documentoForm.tipo.trim();
    const validade = this.documentoForm.validade.trim();
    if (!tipo || !validade) {
      this.documentoUploadErro.set('Preencha o tipo e a data de validade do documento.');
      return;
    }

    this.documentoUploadErro.set(null);
    this.documentoEnviando.set(true);

    const formData = new FormData();
    formData.append('tipo', tipo);
    formData.append('validade', new Date(validade).toISOString());
    formData.append('file', this.arquivoDocumentoSelecionado);

    this.http.post(`${API_BASE}/backoffice/documentos/cozinha/${this.cozinhaDocumentosId}`, formData).subscribe({
      next: () => {
        this.documentoForm = { tipo: '', validade: '' };
        this.arquivoDocumentoSelecionado = null;
        this.documentoEnviando.set(false);
        this.carregarDocumentosDaCozinha(this.cozinhaDocumentosId);
      },
      error: (e) => {
        this.documentoEnviando.set(false);
        this.documentoUploadErro.set(e?.error?.message ?? 'Falha ao anexar o documento.');
      },
    });
  }

  protected removerDocumento(docId: string): void {
    if (!confirm('Tem certeza que deseja remover este documento?')) {
      return;
    }

    this.http.delete(`${API_BASE}/backoffice/documentos/${docId}`).subscribe(() => {
      this.carregarDocumentosDaCozinha(this.cozinhaDocumentosId);
    });
  }

  protected estaVencido(validade: string): boolean {
    return new Date(validade).getTime() <= Date.now();
  }

  protected formatarData(iso: string): string {
    const data = new Date(iso);
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
  }

  protected procurarCep(): void {
    const cep = this.formulario.cep.replace(/\D/g, '');
    if (cep.length !== 8) {
      return;
    }

    this.cepBuscando.set(true);
    this.http.get<{ logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean }>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (response) => {
        if (response?.erro) {
          this.cepBuscando.set(false);
          return;
        }

        this.formulario = {
          ...this.formulario,
          logradouro: response.logradouro ?? this.formulario.logradouro,
          bairro: response.bairro ?? this.formulario.bairro,
          cidade: response.localidade ?? this.formulario.cidade,
          estado: response.uf ?? this.formulario.estado,
        };
        this.cepBuscando.set(false);
      },
      error: () => {
        this.cepBuscando.set(false);
      },
    });
  }

  private carregarInquilinos(): void {
    this.carregando.set(true);
    this.erro.set(null);

    this.http.get<Inquilino[]>(`${API_BASE}/backoffice/inquilinos`).subscribe({
      next: (response) => {
        this.inquilinos.set(response);
        this.carregando.set(false);
      },
      error: (e) => {
        this.carregando.set(false);
        this.erro.set(e?.error?.message ?? 'Falha ao carregar os inquilinos do banco.');
      },
    });
  }
}
