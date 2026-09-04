/**
 * Claims dos dois realms de identidade (AD-11 / AD-14).
 *
 * - Realm de Inquilino (`portal`/`kds`): `scope='tenant'` + `tenantId` + `papel`.
 * - Realm de plataforma (`backoffice`): `scope='platform'` + `papel` de staff,
 *   **sem** `tenantId`.
 */
export type AuthScope = 'tenant' | 'platform';

export type PapelInquilino = 'dono_admin' | 'operador';

export interface JwtPayload {
  /** subject = id do usuário (Inquilino) ou do staff (plataforma). */
  sub: string;
  scope: AuthScope;
  papel: PapelInquilino | 'staff';
  /** presente apenas quando scope === 'tenant'. */
  tenantId?: string;
}

/** Principal autenticado anexado ao request (`req.user`). */
export type AuthPrincipal = JwtPayload;
