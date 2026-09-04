import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { DUMMY_BCRYPT_HASH, verifyPassword } from './password';
import type { JwtPayload, PapelInquilino } from './jwt-payload';

interface UsuarioRow {
  id: string;
  tenant_id: string;
  papel: PapelInquilino;
  status: string;
  senha_hash: string | null;
}

export interface InquilinoLoginResult {
  accessToken: string;
  usuario: { id: string; papel: PapelInquilino; tenantId: string };
}

export interface MeuContextoResponse {
  restauranteId: string;
  nomeRestaurante: string;
  cozinhaId: string;
  nomeCozinha: string;
  permissoes: string[];
}

/**
 * Autenticação do realm de Inquilino (AD-11). Emite token com
 * `(tenant_id, role)`.
 *
 * O tenant não é conhecido no login, então a busca do usuário por email é uma
 * leitura **cross-tenant controlada** no nível de auth (scope=platform, que a
 * RLS concede apenas para leitura). Mensagens de erro são neutras (AC-5): nunca
 * revelam se o email existe.
 */
@Injectable()
export class InquilinoAuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<InquilinoLoginResult> {
    const { rows } = await this.db.withPlatform((c) =>
      c.query<UsuarioRow>(
        // ORDER BY determinístico: email não é único entre tenants; em colisão,
        // a seleção do candidato é estável (o mais antigo).
        'SELECT id, tenant_id, papel, status, senha_hash FROM usuario WHERE email = $1 ORDER BY criado_em, id',
        [email],
      ),
    );

    let autenticado: UsuarioRow | undefined;
    for (const u of rows) {
      const ok = await verifyPassword(senha, u.senha_hash ?? DUMMY_BCRYPT_HASH);
      if (ok && u.status === 'ativo' && u.senha_hash) {
        autenticado = u;
        break;
      }
    }

    if (!autenticado) {
      // Iguala timing quando não há candidato (anti-enumeração).
      if (rows.length === 0) await verifyPassword(senha, DUMMY_BCRYPT_HASH);
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload: JwtPayload = {
      sub: autenticado.id,
      scope: 'tenant',
      tenantId: autenticado.tenant_id,
      papel: autenticado.papel,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      usuario: { id: autenticado.id, papel: autenticado.papel, tenantId: autenticado.tenant_id },
    };
  }

  async me(tenantId: string, papel: PapelInquilino): Promise<MeuContextoResponse> {
    const [tenantRows, cozinhaRows, modulosRows] = await Promise.all([
      this.db.withTenant(tenantId, (c) =>
        c.query<{ id: string; nome: string }>('SELECT id, nome FROM inquilino WHERE tenant_id = $1 LIMIT 1', [tenantId]),
      ),
      this.db.withPlatform((c) =>
        c.query<{ id: string; nome: string }>('SELECT id, nome FROM cozinha ORDER BY criado_em LIMIT 1'),
      ),
      this.db.withTenant(tenantId, (c) =>
        c.query<{ modulo: string; habilitado: boolean }>('SELECT modulo, habilitado FROM modulo_flag ORDER BY modulo'),
      ),
    ]);

    const inquilino = tenantRows.rows[0];
    const cozinha = cozinhaRows.rows[0];
    const flags = new Map(modulosRows.rows.map((row) => [row.modulo, row.habilitado]));

    const basePermissoes = new Set<string>(['inicio']);
    if (flags.get('gestao_cozinha') || papel === 'dono_admin') {
      basePermissoes.add('estoque');
      basePermissoes.add('fichas');
      basePermissoes.add('producao');
      basePermissoes.add('custeio');
      basePermissoes.add('dashboard_operacional');
      basePermissoes.add('dashboard_gerencial');
      basePermissoes.add('cmv');
    }
    if (papel === 'dono_admin' || flags.get('pedidos_kds')) {
      basePermissoes.add('pedidos');
      basePermissoes.add('entregadores');
      basePermissoes.add('integracoes');
    }

    if (papel === 'operador') {
      basePermissoes.clear();
      basePermissoes.add('inicio');
      basePermissoes.add('pedidos');
      basePermissoes.add('dashboard_operacional');
      if (flags.get('gestao_cozinha')) {
        basePermissoes.add('estoque');
      }
    }

    return {
      restauranteId: inquilino?.id ?? tenantId,
      nomeRestaurante: inquilino?.nome ?? 'Restaurante',
      cozinhaId: cozinha?.id ?? `${tenantId}-cozinha-principal`,
      nomeCozinha: cozinha?.nome ?? 'Cozinha principal',
      permissoes: [...basePermissoes].sort(),
    };
  }
}
