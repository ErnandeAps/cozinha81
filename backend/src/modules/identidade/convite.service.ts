import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { hashPassword } from '../../core/auth/password';
import { CONVITE_TTL_DIAS, gerarTokenConvite, hashToken } from '../../core/auth/invite-token';
import type { PapelInquilino } from '../../core/auth/jwt-payload';
import type { AceitarConviteDto, ConvidarDto, ConviteCriado } from './convite.dto';

const PAPEIS_VALIDOS: PapelInquilino[] = ['dono_admin', 'operador'];

interface ConviteRow {
  id: string;
  tenant_id: string;
  usuario_id: string;
  expira_em: string;
  usado_em: string | null;
}

/**
 * Convite de usuários (FR-2). Dono/Admin convida → Usuário pendente vinculado ao
 * tenant + token de uso único e expirável. O aceite (público) define a senha e
 * ativa a credencial, sempre **no tenant do convite** (vínculo imutável).
 */
@Injectable()
export class ConviteService {
  constructor(private readonly db: DatabaseService) {}

  /** Roda no tenant context do Dono/Admin (resolvido pelo interceptor). */
  async convidar(tenantId: string, criadoPor: string, dto: ConvidarDto): Promise<ConviteCriado> {
    if (!dto?.email?.trim() || !dto?.nome?.trim()) {
      throw new BadRequestException('email e nome são obrigatórios.');
    }
    if (!PAPEIS_VALIDOS.includes(dto.papel)) {
      throw new BadRequestException('papel inválido.');
    }

    const { token, tokenHash } = gerarTokenConvite();

    try {
      // tenantId vem do principal autenticado (Dono/Admin); escrita no próprio tenant.
      return await this.db.withTenant(tenantId, async (c): Promise<ConviteCriado> => {
        const { rows: usuarioRows } = await c.query<{ id: string }>(
          `INSERT INTO usuario (tenant_id, email, nome, papel, status)
           VALUES ($1, $2, $3, $4, 'pendente') RETURNING id`,
          [tenantId, dto.email, dto.nome, dto.papel],
        );
        const usuarioId = usuarioRows[0].id;

        const { rows: conviteRows } = await c.query<{ id: string; expira_em: string }>(
          `INSERT INTO convite (tenant_id, usuario_id, token_hash, expira_em, criado_por)
           VALUES ($1, $2, $3, now() + ($4 || ' days')::interval, $5)
           RETURNING id, expira_em`,
          [tenantId, usuarioId, tokenHash, String(CONVITE_TTL_DIAS), criadoPor],
        );

        return {
          conviteId: conviteRows[0].id,
          token,
          expiraEm: conviteRows[0].expira_em,
          usuario: { id: usuarioId, email: dto.email, papel: dto.papel, status: 'pendente' },
        };
      });
    } catch (err) {
      // 23505 = unique_violation em (tenant_id, email): já existe usuário com esse email.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('Já existe um usuário com esse email neste Inquilino.');
      }
      throw err;
    }
  }

  /**
   * Aceite público: resolve o convite pelo token (leitura cross-tenant
   * controlada), valida uso único/expiração e ativa a credencial no tenant do
   * convite — escrita com tenant context explícito.
   */
  async aceitar(dto: AceitarConviteDto): Promise<{ tenantId: string }> {
    if (!dto?.token || !dto?.senha) {
      throw new BadRequestException('token e senha são obrigatórios.');
    }
    const tokenHash = hashToken(dto.token);

    const { rows } = await this.db.withPlatform((c) =>
      c.query<ConviteRow>(
        'SELECT id, tenant_id, usuario_id, expira_em, usado_em FROM convite WHERE token_hash = $1',
        [tokenHash],
      ),
    );
    const convite = rows[0];
    if (!convite) throw new BadRequestException('Convite inválido.');
    if (convite.usado_em) throw new BadRequestException('Convite já utilizado.');
    if (new Date(convite.expira_em).getTime() < Date.now()) {
      throw new BadRequestException('Convite expirado.');
    }

    const senhaHash = await hashPassword(dto.senha);

    await this.db.withTenant(convite.tenant_id, async (c) => {
      // Marca uso de forma ATÔMICA (uso único, à prova de corrida).
      const consumo = await c.query(
        `UPDATE convite SET usado_em = now()
         WHERE id = $1 AND usado_em IS NULL AND expira_em > now()`,
        [convite.id],
      );
      if (consumo.rowCount === 0) {
        throw new BadRequestException('Convite já utilizado ou expirado.');
      }
      await c.query(`UPDATE usuario SET senha_hash = $1, status = 'ativo' WHERE id = $2`, [
        senhaHash,
        convite.usuario_id,
      ]);
    });

    return { tenantId: convite.tenant_id };
  }
}
