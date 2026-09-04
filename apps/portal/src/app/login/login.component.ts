import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent, CardComponent, InputComponent } from '@cozinha81/design-system';
import { AuthService, RESTAURANTES_DISPONIVEIS, type Permissao, type RestauranteContexto } from '../core/auth.service';

/** Login do realm de Inquilino (Story 1.4). */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CardComponent, ButtonComponent, InputComponent],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); padding: var(--space-6);">
      <c81-card [raised]="true" [pad]="true" style="width: 100%; max-width: 420px;">
        <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-6);">
          <div class="c81-burner"><i style="border-color: var(--flame-500); background: var(--flame-500);"></i><i></i><i></i><i></i></div>
          <span class="c81-eyebrow">COZINHA81 · PORTAL</span>
        </div>
        <h1 style="margin-bottom: var(--space-4);">Entrar</h1>

        <form (submit)="entrar($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
          <c81-input label="E-mail" type="email" [value]="email()" (input)="email.set($any($event.target).value)" data-test="email"></c81-input>
          <c81-input label="Senha" type="password" [value]="senha()" (input)="senha.set($any($event.target).value)" data-test="senha"></c81-input>

          @if (erro()) {
            <p role="alert" style="color: var(--status-stop); margin: 0;" data-test="erro">{{ erro() }}</p>
          }

          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            <label style="font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--steel-700);">
              Qual restaurante do usuário?
            </label>
            <select class="c81-select" [value]="restauranteSelecionado()" (change)="restauranteSelecionado.set($any($event.target).value)" data-test="restaurante">
              <option value="">Selecione o restaurante</option>
              @for (restaurante of restaurantesDisponiveis; track restaurante.restauranteId) {
                <option [value]="restaurante.restauranteId">{{ restaurante.nomeRestaurante }}</option>
              }
            </select>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-2);">
            <label style="font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--steel-700);">
              Permissões
            </label>
            <select class="c81-select" [value]="permissaoSelecionada()" (change)="permissaoSelecionada.set($any($event.target).value)" data-test="permissao">
              <option value="">Selecione a permissão</option>
              <option value="admin">Administrador</option>
              <option value="gestor">Gestor</option>
              <option value="operador">Operador</option>
              <option value="cozinha">Cozinha</option>
            </select>
          </div>

          <div style="padding: var(--space-3); border: 1px solid var(--steel-300); border-radius: 10px; background: rgba(15, 23, 42, 0.02); display: flex; flex-direction: column; gap: var(--space-2);">
            <strong style="font-size: 0.72rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--steel-700);">Credenciais demo</strong>
            <small style="color: var(--steel-700);">adm@pytsburguer.com / Adm123</small>
            <small style="color: var(--steel-700);">op@pytsburguer.com / Op123</small>
            <small style="color: var(--steel-700);">adm@espoleto.com / Adm123</small>
            <small style="color: var(--steel-700);">op@espoleto.com / Op123</small>
            <small style="color: var(--steel-700);">adm@fatiaspizzas.com / Adm123</small>
            <small style="color: var(--steel-700);">op@fatiaspizzas.com / Op123</small>
          </div>

          <c81-button type="submit" variant="primary" [disabled]="carregando()" data-test="entrar">
            {{ carregando() ? 'Entrando…' : 'Entrar' }}
          </c81-button>
        </form>
      </c81-card>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly senha = signal('');
  protected readonly restauranteSelecionado = signal('');
  protected readonly permissaoSelecionada = signal('');
  protected readonly erro = signal<string | null>(null);
  protected readonly carregando = signal(false);
  protected readonly restaurantesDisponiveis = RESTAURANTES_DISPONIVEIS;

  protected entrar(event: Event): void {
    event.preventDefault();
    if (this.carregando()) return;
    this.erro.set(null);

    if (!this.restauranteSelecionado() || !this.permissaoSelecionada()) {
      this.erro.set('Informe o restaurante e a permissão do usuário antes de entrar.');
      return;
    }

    this.carregando.set(true);

    this.auth.login(this.email().trim(), this.senha()).subscribe({
      next: () => {
        this.auth.selecionarRestaurante(this.montarContexto());
        this.carregando.set(false);
        void this.router.navigate(['/inicio']);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Credenciais inválidas.');
      },
    });
  }

  private montarContexto(): RestauranteContexto {
    const base = RESTAURANTES_DISPONIVEIS.find((restaurante) => restaurante.restauranteId === this.restauranteSelecionado());
    const permissoesAdmin: Permissao[] = ['inicio', 'estoque', 'fichas', 'producao', 'pedidos', 'entregadores', 'custeio', 'dashboard_operacional', 'dashboard_gerencial', 'cmv', 'integracoes'];
    const permissoesGestor: Permissao[] = ['inicio', 'estoque', 'fichas', 'producao', 'pedidos', 'entregadores', 'custeio', 'dashboard_operacional', 'dashboard_gerencial'];
    const permissoesOperador: Permissao[] = ['inicio', 'pedidos', 'entregadores', 'dashboard_operacional'];
    const permissoesCozinha: Permissao[] = ['inicio', 'pedidos', 'entregadores'];

    if (!base) {
      return {
        restauranteId: 'rest-00',
        nomeRestaurante: 'Restaurante não informado',
        cozinhaId: 'coz-00',
        nomeCozinha: 'Cozinha não informada',
        permissoes: [] as Permissao[],
      };
    }

    if (this.permissaoSelecionada() === 'admin') {
      return { ...base, permissoes: permissoesAdmin };
    }

    if (this.permissaoSelecionada() === 'gestor') {
      return { ...base, permissoes: permissoesGestor };
    }

    if (this.permissaoSelecionada() === 'cozinha') {
      return { ...base, permissoes: permissoesCozinha };
    }

    return { ...base, permissoes: permissoesOperador };
  }
}
