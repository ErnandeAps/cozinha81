import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonComponent, CardComponent, InputComponent } from '@cozinha81/design-system';
import { AuthService } from '../core/auth.service';

/** Login do realm de plataforma (Backoffice). */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CardComponent, ButtonComponent, InputComponent],
  template: `
    <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); padding: var(--space-6);">
      <c81-card [raised]="true" [pad]="true" style="width: 100%; max-width: 380px;">
        <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-6);">
          <div class="c81-burner"><i style="border-color: var(--flame-500); background: var(--flame-500);"></i><i></i><i></i><i></i></div>
          <span class="c81-eyebrow">COZINHA81 · BACKOFFICE</span>
        </div>
        <h1 style="margin-bottom: var(--space-4);">Entrar</h1>

        <form (submit)="entrar($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
          <c81-input label="E-mail" type="email" [value]="email()" (input)="email.set($any($event.target).value)" data-test="email"></c81-input>
          <c81-input label="Senha" type="password" [value]="senha()" (input)="senha.set($any($event.target).value)" data-test="senha"></c81-input>

          @if (erro()) {
            <p role="alert" style="color: var(--status-stop); margin: 0;" data-test="erro">{{ erro() }}</p>
          }

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
  protected readonly erro = signal<string | null>(null);
  protected readonly carregando = signal(false);

  protected entrar(event: Event): void {
    event.preventDefault();
    if (this.carregando()) return;
    this.erro.set(null);
    this.carregando.set(true);

    this.auth.login(this.email().trim(), this.senha()).subscribe({
      next: () => {
        this.carregando.set(false);
        void this.router.navigate(['/inicio']);
      },
      error: () => {
        this.carregando.set(false);
        this.erro.set('Credenciais inválidas. Use o e-mail e a senha do staff do backoffice.');
      },
    });
  }
}
