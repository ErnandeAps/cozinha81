import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Bloqueia rotas do portal sem sessão, redirecionando ao login. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const url = router.url || '/';

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login']);
  }

  if (!auth.temRestauranteSelecionado() && !url.startsWith('/selecionar-restaurante')) {
    return router.createUrlTree(['/selecionar-restaurante']);
  }

  return true;
};
