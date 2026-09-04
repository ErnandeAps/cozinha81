import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, type Observable, tap } from 'rxjs';
import { API_BASE } from './api.config';

export interface Principal {
  sub: string;
  papel: string;
}

interface LoginResponse {
  accessToken: string;
  staff: { id: string; nome: string; papel: string };
}

const TOKEN_KEY = 'c81_backoffice_token';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _token = signal<string | null>(this.token());
  private readonly _user = signal<Principal | null>(this.resolveCurrentUser());

  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null);

  private readonly http = inject(HttpClient);

  token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  login(email: string, senha: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${API_BASE}/backoffice/auth/login`, { email, senha }).pipe(
      tap((res) => {
        if (!res?.accessToken) return;
        localStorage.setItem(TOKEN_KEY, res.accessToken);
        this._token.set(res.accessToken);
        this._user.set(this.decode(res.accessToken));
      }),
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._token.set(null);
    this._user.set(null);
  }

  private decode(token: string | null): Principal | null {
    if (!token) return null;

    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;

      if (parts[2] === 'demo' || parts[2]?.toLowerCase() === 'demo') {
        localStorage.removeItem(TOKEN_KEY);
        this._user.set(null);
        return null;
      }

      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const payload = JSON.parse(this.atobSafe(padded));

      if (payload?.scope !== 'platform') return null;
      if (!payload?.sub) return null;

      return { sub: payload.sub, papel: payload.papel ?? 'staff' };
    } catch {
      return null;
    }
  }

  private atobSafe(value: string): string {
    if (typeof window !== 'undefined' && typeof window.atob === 'function') {
      return window.atob(value);
    }

    const nodeBuffer = (globalThis as any).Buffer;
    if (typeof nodeBuffer?.from === 'function') {
      return nodeBuffer.from(value, 'base64').toString('binary');
    }

    throw new Error('Nenhum decoder base64 disponível no ambiente atual.');
  }

  private resolveCurrentUser(): Principal | null {
    const token = this.token();
    this._token.set(token);
    return this.decode(token);
  }

}
