import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ButtonComponent, StatusPillComponent } from '@cozinha81/design-system';
import { AuthService } from './core/auth.service';

@Component({
  imports: [CommonModule, RouterModule, ButtonComponent, StatusPillComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly restauranteAtivo = this.auth.restauranteAtivo;
  protected readonly isDonoAdmin = this.auth.isDonoAdmin;

  protected sair(): void {
    this.auth.logout();
    void this.router.navigate(['/login']);
  }
}
