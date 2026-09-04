import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, switchMap, tap } from 'rxjs';
import { API_BASE } from './api.config';

export type Papel = 'dono_admin' | 'operador';
export type Permissao =
  | 'inicio'
  | 'estoque'
  | 'fichas'
  | 'producao'
  | 'pedidos'
  | 'entregadores'
  | 'custeio'
  | 'dashboard_operacional'
  | 'dashboard_gerencial'
  | 'cmv'
  | 'integracoes';

export interface Principal {
  sub: string;
  papel: Papel;
  tenantId: string;
}

export interface RestauranteContexto {
  restauranteId: string;
  nomeRestaurante: string;
  cozinhaId: string;
  nomeCozinha: string;
  permissoes: Permissao[];
}

interface LoginResponse {
  accessToken: string;
  usuario: { id: string; papel: Papel; tenantId: string };
}

interface CredencialDemo {
  email: string;
  senha: string;
  papel: Papel;
  restaurante: RestauranteContexto;
}

export const RESTAURANTES_DISPONIVEIS: RestauranteContexto[] = [
  {
    restauranteId: 'rest-pytsburguer',
    nomeRestaurante: 'Pyts Burguer',
    cozinhaId: 'coz-pytsburguer',
    nomeCozinha: 'Cozinha principal',
    permissoes: ['inicio', 'estoque', 'fichas', 'producao', 'pedidos', 'entregadores', 'custeio', 'dashboard_operacional', 'dashboard_gerencial', 'cmv', 'integracoes'],
  },
  {
    restauranteId: 'rest-espoleto',
    nomeRestaurante: 'Espoleto',
    cozinhaId: 'coz-espoleto',
    nomeCozinha: 'Cozinha de produção',
    permissoes: ['inicio', 'estoque', 'fichas', 'producao', 'pedidos', 'entregadores', 'custeio', 'dashboard_operacional', 'dashboard_gerencial', 'cmv', 'integracoes'],
  },
  {
    restauranteId: 'rest-fatiaspizzas',
    nomeRestaurante: 'Fatias pizzas',
    cozinhaId: 'coz-fatiaspizzas',
    nomeCozinha: 'Forno e expedição',
    permissoes: ['inicio', 'estoque', 'fichas', 'producao', 'pedidos', 'entregadores', 'custeio', 'dashboard_operacional', 'dashboard_gerencial', 'cmv', 'integracoes'],
  },
];

const TOKEN_KEY = 'c81_portal_token';
const RESTAURANTE_KEY = 'c81_portal_restaurante';
const CREDENCIAIS_DEMO: CredencialDemo[] = [
  {
    email: 'adm@pytsburguer.com',
    senha: 'Adm123',
    papel: 'dono_admin',
    restaurante: RESTAURANTES_DISPONIVEIS[0],
  },
  {
    email: 'op@pytsburguer.com',
    senha: 'Op123',
    papel: 'operador',
    restaurante: {
      ...RESTAURANTES_DISPONIVEIS[0],
      permissoes: ['inicio', 'pedidos', 'entregadores', 'dashboard_operacional'],
    },
  },
  {
    email: 'adm@espoleto.com',
    senha: 'Adm123',
    papel: 'dono_admin',
    restaurante: RESTAURANTES_DISPONIVEIS[1],
  },
  {
    email: 'op@espoleto.com',
    senha: 'Op123',
    papel: 'operador',
    restaurante: {
      ...RESTAURANTES_DISPONIVEIS[1],
      permissoes: ['inicio', 'pedidos', 'dashboard_operacional'],
    },
  },
  {
    email: 'adm@fatiaspizzas.com',
    senha: 'Adm123',
    papel: 'dono_admin',
    restaurante: RESTAURANTES_DISPONIVEIS[2],
  },
  {
    email: 'op@fatiaspizzas.com',
    senha: 'Op123',
    papel: 'operador',
    restaurante: {
      ...RESTAURANTES_DISPONIVEIS[2],
      permissoes: ['inicio', 'pedidos', 'entregadores', 'dashboard_operacional'],
    },
  },
];

/**
 * Sessão do realm de Inquilino (Story 1.4). Guarda o JWT e expõe o principal
 * decodificado. O Papel vem do TOKEN (servidor), nunca de toggle de UI — a
 * privacidade de custo de fato é aplicada server-side (interceptor 1.6).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _user = signal<Principal | null>(this.decode(this.token()));
  private readonly _restauranteAtivo = signal<RestauranteContexto | null>(this.restoreRestaurante());

  readonly user = this._user.asReadonly();
  readonly restauranteAtivo = this._restauranteAtivo.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly isOperador = computed(() => this._user()?.papel === 'operador');
  readonly isDonoAdmin = computed(() => this._user()?.papel === 'dono_admin');
  readonly temRestauranteSelecionado = computed(() => this._restauranteAtivo() !== null);

  private readonly http = inject(HttpClient);

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  restaurante(): RestauranteContexto | null {
    return this._restauranteAtivo();
  }

  login(email: string, senha: string): Observable<LoginResponse> {
    const demo = CREDENCIAIS_DEMO.find(
      (cred) => cred.email.toLowerCase() === email.trim().toLowerCase() && cred.senha === senha,
    );

    if (demo) {
      const accessToken = this.createDemoToken(demo);
      localStorage.setItem(TOKEN_KEY, accessToken);
      this._user.set(this.decode(accessToken));
      this.selecionarRestaurante(demo.restaurante);
      return new Observable<LoginResponse>((observer) => {
        observer.next({
          accessToken,
          usuario: { id: demo.restaurante.restauranteId, papel: demo.papel, tenantId: demo.restaurante.restauranteId },
        });
        observer.complete();
      });
    }

    return this.http.post<LoginResponse>(`${API_BASE}/portal/auth/login`, { email, senha }).pipe(
      tap((res) => {
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        this._user.set(this.decode(res.accessToken));
      }),
      switchMap((res) =>
        this.http.get<RestauranteContexto>(`${API_BASE}/portal/auth/me`).pipe(
          tap((restaurante) => this.selecionarRestaurante(restaurante)),
          map(() => res),
        ),
      ),
    );
  }

  selecionarRestaurante(restaurante: RestauranteContexto): void {
    localStorage.setItem(RESTAURANTE_KEY, JSON.stringify(restaurante));
    this._restauranteAtivo.set(restaurante);
  }

  limparRestaurante(): void {
    localStorage.removeItem(RESTAURANTE_KEY);
    this._restauranteAtivo.set(null);
  }

  temPermissao(permissao: Permissao): boolean {
    return this._restauranteAtivo()?.permissoes.includes(permissao) ?? false;
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this.limparRestaurante();
    this._user.set(null);
  }

  private restoreRestaurante(): RestauranteContexto | null {
    const raw = localStorage.getItem(RESTAURANTE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as RestauranteContexto;
    } catch {
      return null;
    }
  }

  private createDemoToken(demo: CredencialDemo): string {
    const payload = {
      sub: demo.email,
      scope: 'tenant',
      tenantId: demo.restaurante.restauranteId,
      papel: demo.papel,
      restaurante: demo.restaurante,
    };
    const header = btoa(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
    const body = btoa(JSON.stringify(payload));
    return `${header}.${body}.demo`;
  }

  private decode(token: string | null): Principal | null {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.scope !== 'tenant' || !payload?.tenantId) return null;
      return { sub: payload.sub, papel: payload.papel, tenantId: payload.tenantId };
    } catch {
      return null;
    }
  }
}
