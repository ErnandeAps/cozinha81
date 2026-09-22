import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { CONVITE_TTL_DIAS, gerarTokenConvite } from '../../../core/auth/invite-token';
import {
  type InquilinoProvisionado,
  type Modulo,
  MODULOS,
  type ProvisionarInquilinoDto,
} from './provisioning.dto';

/**
 * Provisionamento de Inquilino pela equipe Cozinha81 (FR-1, AD-14).
 *
 * É a **única** escrita cross-tenant do sistema e, por isso:
 * - acontece com **tenant context explícito** no tenant alvo recém-criado
 *   (`db.withTenant`), nunca implícito;
 * - cria tenant + Dono/Admin + flags de Módulo numa **única transação** (atômico);
 * - grava **trilha de auditoria** (quem provisionou, quando, qual tenant) — AC-3.
 */
@Injectable()
export class ProvisioningService {
  constructor(private readonly db: DatabaseService) {}

  async listar(): Promise<Array<{
    id: string;
    cozinhaId?: string;
    nome: string;
    razaoSocial?: string;
    nomeFantasia?: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    segmento?: string;
    cep?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    observacoes?: string;
    dono?: { id?: string; email?: string; nome?: string; papel?: 'dono_admin'; status?: 'pendente' };
    modulos?: Array<{ modulo: Modulo; habilitado: boolean }>;
  }>> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<{
        id: string;
        nome: string;
        razao_social: string | null;
        nome_fantasia: string | null;
        cnpj: string | null;
        telefone: string | null;
        email: string | null;
        segmento: string | null;
        cep: string | null;
        logradouro: string | null;
        numero: string | null;
        bairro: string | null;
        cidade: string | null;
        estado: string | null;
        observacoes: string | null;
        valor_contrato: string | null;
        cozinha_id: string | null;
        dono_id: string | null;
        dono_nome: string | null;
        dono_email: string | null;
        dono_papel: string | null;
        dono_status: string | null;
        modulos: string | null;
      }>(`
        SELECT
          i.id,
          i.cozinha_id,
          i.nome,
          i.razao_social,
          i.nome_fantasia,
          i.cnpj,
          i.telefone,
          i.email,
          i.segmento,
          i.cep,
          i.logradouro,
          i.numero,
          i.bairro,
          i.cidade,
          i.estado,
          i.observacoes,
          i.valor_contrato,
          d.id AS dono_id,
          d.nome AS dono_nome,
          d.email AS dono_email,
          d.papel AS dono_papel,
          d.status AS dono_status,
          COALESCE(
            json_agg(
              json_build_object(
                'modulo', mf.modulo,
                'habilitado', mf.habilitado
              ) ORDER BY mf.modulo
            ) FILTER (WHERE mf.modulo IS NOT NULL),
            '[]'::json
          ) AS modulos
        FROM inquilino i
        LEFT JOIN usuario d
          ON d.tenant_id = i.id AND d.papel = 'dono_admin'
        LEFT JOIN modulo_flag mf
          ON mf.tenant_id = i.id
        GROUP BY
          i.id, i.nome, i.razao_social, i.nome_fantasia, i.cnpj, i.telefone, i.email,
          i.segmento, i.cep, i.logradouro, i.numero, i.bairro, i.cidade, i.estado,
          i.observacoes, d.id, d.nome, d.email, d.papel, d.status
        ORDER BY i.nome
      `);

      return rows.map((row) => ({
        id: row.id,
        cozinhaId: row.cozinha_id ?? undefined,
        nome: row.nome,
        razaoSocial: row.razao_social ?? undefined,
        nomeFantasia: row.nome_fantasia ?? undefined,
        cnpj: row.cnpj ?? undefined,
        telefone: row.telefone ?? undefined,
        email: row.email ?? undefined,
        segmento: row.segmento ?? undefined,
        cep: row.cep ?? undefined,
        logradouro: row.logradouro ?? undefined,
        numero: row.numero ?? undefined,
        bairro: row.bairro ?? undefined,
        cidade: row.cidade ?? undefined,
        estado: row.estado ?? undefined,
        observacoes: row.observacoes ?? undefined,
        dono: row.dono_id
          ? {
              id: row.dono_id,
              email: row.dono_email ?? undefined,
              nome: row.dono_nome ?? undefined,
              papel: row.dono_papel === 'dono_admin' ? 'dono_admin' : undefined,
              status: row.dono_status === 'pendente' ? 'pendente' : undefined,
            }
          : undefined,
        modulos: Array.isArray(row.modulos) ? row.modulos : JSON.parse(row.modulos ?? '[]'),
      }));
    });
  }

  async atualizar(id: string, dto: Partial<ProvisionarInquilinoDto>): Promise<void> {
    if (!id?.trim()) {
      throw new BadRequestException('id do inquilino é obrigatório.');
    }

    const payload = dto ?? {};
    const nome = (payload.nome ?? '').trim();
    const razaoSocial = (payload.razaoSocial ?? '').trim();
    const donoNome = (payload.dono?.nome ?? '').trim();
    const donoEmail = (payload.dono?.email ?? '').trim();

    if (!nome) {
      throw new BadRequestException('nome do inquilino é obrigatório.');
    }

    await this.db.withTenant(id, async (client) => {
      const { rows } = await client.query<{ id: string }>('SELECT id FROM inquilino WHERE id = $1', [id]);
      if (rows.length === 0) {
        throw new NotFoundException(`Inquilino não encontrado: ${id}`);
      }

      await client.query(
        `UPDATE inquilino SET
          cozinha_id = $2,
          nome = $3,
          razao_social = $4,
          nome_fantasia = $5,
          cnpj = $6,
          telefone = $7,
          email = $8,
          segmento = $9,
          cep = $10,
          logradouro = $11,
          numero = $12,
          bairro = $13,
          cidade = $14,
          estado = $15,
          observacoes = $16
        WHERE id = $1`,
        [
          id,
          payload.cozinhaId ?? null,
          nome,
          razaoSocial || nome,
          payload.nomeFantasia ?? nome,
          payload.cnpj ?? '',
          payload.telefone ?? '',
          payload.email ?? '',
          payload.segmento ?? '',
          payload.cep ?? '',
          payload.logradouro ?? '',
          payload.numero ?? '',
          payload.bairro ?? '',
          payload.cidade ?? '',
          payload.estado ?? '',
          payload.observacoes ?? '',
        ],
      );

      if (donoEmail || donoNome) {
        await client.query(
          `UPDATE usuario
           SET nome = $2,
               email = $3
           WHERE tenant_id = $1 AND papel = 'dono_admin'`,
          [id, donoNome || null, donoEmail || null],
        );
      }
    });
  }

  async remover(id: string): Promise<void> {
    if (!id?.trim()) {
      throw new BadRequestException('id do inquilino é obrigatório.');
    }

    await this.db.withPlatform(async (client) => {
      const { rows } = await client.query<{ id: string }>(`SELECT id FROM inquilino WHERE id = $1`, [id]);
      if (rows.length === 0) {
        throw new NotFoundException(`Inquilino não encontrado: ${id}`);
      }

      await client.query('DELETE FROM convite WHERE tenant_id = $1', [id]);
      await client.query('DELETE FROM modulo_flag WHERE tenant_id = $1', [id]);
      await client.query('DELETE FROM usuario WHERE tenant_id = $1', [id]);
      await client.query('DELETE FROM inquilino WHERE id = $1', [id]);
    });
  }

  async provisionar(dto: ProvisionarInquilinoDto, staffId: string): Promise<InquilinoProvisionado> {
    this.validar(dto);

    const contratados = new Set<Modulo>(dto.modulos);
    // UUID v7 do tenant alvo, gerado pelo próprio Postgres 18 (uuidv7()).
    const { rows: idRows } = await this.db.rawPool.query<{ id: string }>('SELECT uuidv7() AS id');
    const tenantId = idRows[0].id;

    return this.db.withTenant(tenantId, async (client): Promise<InquilinoProvisionado> => {
      // 1) Inquilino: a linha É o tenant (id == tenant_id).
      await client.query(
        `INSERT INTO inquilino (
          id, tenant_id, nome, cozinha_id, razao_social, nome_fantasia, cnpj,
          telefone, email, segmento, cep, logradouro, numero, bairro,
          cidade, estado, observacoes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
        [
          tenantId,
          tenantId,
          dto.nome,
          dto.cozinhaId ?? null,
          dto.razaoSocial ?? dto.nome,
          dto.nomeFantasia ?? dto.nome,
          dto.cnpj ?? '',
          dto.telefone ?? '',
          dto.email ?? dto.dono.email,
          dto.segmento ?? '',
          dto.cep ?? '',
          dto.logradouro ?? '',
          dto.numero ?? '',
          dto.bairro ?? '',
          dto.cidade ?? '',
          dto.estado ?? '',
          dto.observacoes ?? '',
        ],
      );

      // 2) Dono/Admin inicial (status 'pendente' até definir senha — 1.4/1.5).
      const { rows: donoRows } = await client.query<{ id: string }>(
        `INSERT INTO usuario (tenant_id, email, nome, papel, status)
         VALUES ($1, $2, $3, 'dono_admin', 'pendente') RETURNING id`,
        [tenantId, dto.dono.email, dto.dono.nome],
      );

      // 2b) Convite de primeiro acesso do Dono (resolve o bootstrap do tenant):
      // mesmo mecanismo de convite (1.5) — uso único + TTL, só o hash é gravado.
      // O `criado_por` é o staff que provisionou. O token cru volta UMA vez.
      const { token, tokenHash } = gerarTokenConvite();
      const { rows: conviteRows } = await client.query<{ expira_em: string }>(
        `INSERT INTO convite (tenant_id, usuario_id, token_hash, expira_em, criado_por)
         VALUES ($1, $2, $3, now() + ($4 || ' days')::interval, $5)
         RETURNING expira_em`,
        [tenantId, donoRows[0].id, tokenHash, String(CONVITE_TTL_DIAS), staffId],
      );

      // 3) Flags de Módulo: uma linha por módulo conhecido, habilitada conforme contrato.
      const modulos: { modulo: Modulo; habilitado: boolean }[] = [];
      for (const modulo of MODULOS) {
        const habilitado = contratados.has(modulo);
        await client.query(
          'INSERT INTO modulo_flag (tenant_id, modulo, habilitado) VALUES ($1, $2, $3)',
          [tenantId, modulo, habilitado],
        );
        modulos.push({ modulo, habilitado });
      }

      // 4) Auditoria (tabela de plataforma; atômica com o provisionamento).
      await client.query(
        `INSERT INTO provisionamento_audit (tenant_id, staff_id, detalhes)
         VALUES ($1, $2, $3)`,
        [tenantId, staffId, JSON.stringify({ modulos: [...contratados], dono: dto.dono.email })],
      );

      return {
        tenantId,
        cozinhaId: dto.cozinhaId ?? undefined,
        nome: dto.nome,
        razaoSocial: dto.razaoSocial ?? dto.nome,
        nomeFantasia: dto.nomeFantasia ?? dto.nome,
        cnpj: dto.cnpj ?? '',
        telefone: dto.telefone ?? '',
        email: dto.email ?? dto.dono.email,
        segmento: dto.segmento ?? '',
        cep: dto.cep ?? '',
        logradouro: dto.logradouro ?? '',
        numero: dto.numero ?? '',
        bairro: dto.bairro ?? '',
        cidade: dto.cidade ?? '',
        estado: dto.estado ?? '',
        observacoes: dto.observacoes ?? '',
        dono: {
          id: donoRows[0].id,
          email: dto.dono.email,
          nome: dto.dono.nome,
          papel: 'dono_admin',
          status: 'pendente',
        },
        modulos,
        conviteDono: { token, expiraEm: conviteRows[0].expira_em },
      };
    });
  }

  private validar(dto: ProvisionarInquilinoDto): void {
    if (!dto?.nome?.trim()) throw new BadRequestException('nome do Inquilino é obrigatório.');
    if (dto?.cozinhaId !== undefined && dto?.cozinhaId !== null && !dto?.cozinhaId?.trim()) {
      throw new BadRequestException('cozinhaId informado é inválido.');
    }
    if (!dto?.dono?.email?.trim() || !dto?.dono?.nome?.trim()) {
      throw new BadRequestException('dono.email e dono.nome são obrigatórios.');
    }
    const invalidos = (dto.modulos ?? []).filter((m) => !MODULOS.includes(m));
    if (invalidos.length > 0) {
      throw new BadRequestException(`Módulo(s) inválido(s): ${invalidos.join(', ')}.`);
    }
  }
}
