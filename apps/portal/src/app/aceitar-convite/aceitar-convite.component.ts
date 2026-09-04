import { Component, inject, type OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent, CardComponent, InputComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

/**
 * Aceite de convite (Story 1.5) — também é o primeiro acesso do Dono/Admin
 * provisionado. Lê o `token` da query string, define a senha e ativa a
 * credencial via `POST /portal/usuarios/convites/aceitar` (endpoint público).
 */
@Component({
  selector: 'app-aceitar-convite',
  standalone: true,
  imports: [FormsModule, CardComponent, ButtonComponent, InputComponent],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); padding: var(--space-6);">
      <c81-card [raised]="true" [pad]="true" style="width: 100%; max-width: 380px;">
        <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-6);">
          <div class="c81-burner"><i style="border-color: var(--flame-500); background: var(--flame-500);"></i><i></i><i></i><i></i></div>
          <span class="c81-eyebrow">COZINHA81 · PRIMEIRO ACESSO</span>
        </div>
        <h1 style="margin-bottom: var(--space-4);">Definir senha</h1>

        @if (!token()) {
          <p role="alert" style="color: var(--status-stop);" data-test="sem-token">
            Link de convite inválido — falta o token.
          </p>
        } @else if (sucesso()) {
          <p style="color: var(--status-ready);" data-test="sucesso">
            Senha definida! Você já pode entrar.
          </p>
          <c81-button variant="primary" (click)="irParaLogin()" data-test="ir-login">Ir para o login</c81-button>
        } @else {
          <form (submit)="enviar($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <c81-input label="Nova senha" type="password" [value]="senha()" (input)="senha.set($any($event.target).value)" data-test="senha"></c81-input>
            <c81-input label="Confirmar senha" type="password" [value]="confirmacao()" (input)="confirmacao.set($any($event.target).value)" data-test="confirmacao"></c81-input>

            @if (erro()) {
              <p role="alert" style="color: var(--status-stop); margin: 0;" data-test="erro">{{ erro() }}</p>
            }

            <c81-button type="submit" variant="primary" [disabled]="carregando()" data-test="definir">
              {{ carregando() ? 'Salvando…' : 'Definir senha' }}
            </c81-button>
          </form>
        }
      </c81-card>
    </div>
  `,
})
export class AceitarConviteComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly token = signal<string | null>(null);
  protected readonly senha = signal('');
  protected readonly confirmacao = signal('');
  protected readonly erro = signal<string | null>(null);
  protected readonly carregando = signal(false);
  protected readonly sucesso = signal(false);

  ngOnInit(): void {
    this.token.set(this.route.snapshot.queryParamMap.get('token'));
  }

  protected enviar(event: Event): void {
    event.preventDefault();
    if (this.carregando()) return;
    this.erro.set(null);

    const token = this.token();
    if (!token) return;
    if (this.senha().length < 8) {
      this.erro.set('A senha deve ter ao menos 8 caracteres.');
      return;
    }
    if (this.senha() !== this.confirmacao()) {
      this.erro.set('As senhas não conferem.');
      return;
    }

    this.carregando.set(true);
    this.http.post(`${API_BASE}/portal/usuarios/convites/aceitar`, { token, senha: this.senha() }).subscribe({
      next: () => {
        this.carregando.set(false);
        this.sucesso.set(true);
      },
      error: (e) => {
        this.carregando.set(false);
        this.erro.set(e?.error?.message ?? 'Não foi possível definir a senha.');
      },
    });
  }

  protected irParaLogin(): void {
    void this.router.navigate(['/login']);
  }
}
