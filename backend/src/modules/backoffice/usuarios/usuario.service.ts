import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { hashPassword } from '../../../core/auth/password';
import type { CriarUsuarioDto, PapelUsuario, UsuarioExibicao } from './usuario.dto';

const PAPEL_VALIDO: PapelUsuario[] = ['admin', 'gestor', 'operador', 'cozinha'];
const APP_VALIDO = ['portal', 'backoffice'];

@Injectable()
export class UsuarioService {
  constructor(private readonly db: DatabaseService) {}

  async listar(): Promise<UsuarioExibicao[]> {
    return this.db.withPlatform(async (client) => {
      const { rows } = await client.query<UsuarioExibicao>(`
        SELECT id, nome, email, app, papel, ativo, permissoes, criado_em
        FROM usuario_acesso
        ORDER BY criado_em DESC
      `);
      return rows;
    });
  }

  async criar(dto: CriarUsuarioDto): Promise<UsuarioExibicao> {
    this.validar(dto);

    const senhaHash = await hashPassword(dto.senha);

    return this.db.withPlatform(async (client) => {
      const { rows } = await client.query<UsuarioExibicao>(`
        INSERT INTO usuario_acesso (
          nome,
          email,
          senha_hash,
          app,
          papel,
          ativo,
          permissoes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, nome, email, app, papel, ativo, permissoes, criado_em
      `, [
        dto.nome.trim(),
        dto.email.trim().toLowerCase(),
        senhaHash,
        dto.app ?? 'portal',
        dto.papel ?? 'operador',
        dto.ativo ?? true,
        JSON.stringify(dto.permissoes ?? []),
      ]);

      return rows[0];
    });
  }

  async atualizar(id: string, dto: Partial<CriarUsuarioDto>): Promise<UsuarioExibicao> {
    if (!id) throw new BadRequestException('id do usuário é obrigatório.');

    const atual = await this.obter(id);
    const payload = {
      nome: dto.nome?.trim() ?? atual.nome,
      email: dto.email?.trim().toLowerCase() ?? atual.email,
      app: dto.app ?? atual.app,
      papel: dto.papel ?? atual.papel,
      ativo: dto.ativo ?? atual.ativo,
      permissoes: dto.permissoes ?? atual.permissoes,
    };

    this.validar(payload as CriarUsuarioDto);

    const senhaHash = dto.senha ? await hashPassword(dto.senha) : undefined;

    return this.db.withPlatform(async (client) => {
      const { rows } = await client.query<UsuarioExibicao>(`
        UPDATE usuario_acesso
        SET nome = $1,
            email = $2,
            app = $3,
            papel = $4,
            ativo = $5,
            permissoes = $6,
            senha_hash = COALESCE($7, senha_hash)
        WHERE id = $8
        RETURNING id, nome, email, app, papel, ativo, permissoes, criado_em
      `, [
        payload.nome,
        payload.email,
        payload.app,
        payload.papel,
        payload.ativo,
        JSON.stringify(payload.permissoes),
        senhaHash ?? null,
        id,
      ]);

      if (rows.length === 0) throw new NotFoundException(`Usuário não encontrado: ${id}`);
      return rows[0];
    });
  }

  async remover(id: string): Promise<void> {
    await this.db.withPlatform(async (client) => {
      const { rowCount } = await client.query('DELETE FROM usuario_acesso WHERE id = $1', [id]);
      if (rowCount === 0) throw new NotFoundException(`Usuário não encontrado: ${id}`);
    });
  }

  async obter(id: string): Promise<UsuarioExibicao> {
    return this.db.withPlatform(async (client) => {
      const { rows } = await client.query<UsuarioExibicao>(`
        SELECT id, nome, email, app, papel, ativo, permissoes, criado_em
        FROM usuario_acesso
        WHERE id = $1
      `, [id]);

      if (rows.length === 0) throw new NotFoundException(`Usuário não encontrado: ${id}`);
      return rows[0];
    });
  }

  private validar(dto: Partial<CriarUsuarioDto>): void {
    if (!dto?.nome?.trim()) throw new BadRequestException('nome é obrigatório.');
    if (!dto?.email?.trim()) throw new BadRequestException('email é obrigatório.');
    if (dto?.app && !APP_VALIDO.includes(dto.app)) throw new BadRequestException('app inválido.');
    if (dto?.papel && !PAPEL_VALIDO.includes(dto.papel)) throw new BadRequestException('papel inválido.');
    if (dto?.senha !== undefined && !dto.senha.trim()) throw new BadRequestException('senha é obrigatória.');
  }
}
