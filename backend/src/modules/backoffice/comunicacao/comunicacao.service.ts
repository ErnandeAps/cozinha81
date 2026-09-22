import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import type { ComunicacaoRow, CriarComunicacaoDto, DestinatarioComunicacao } from './comunicacao.dto';

const TIPOS_VALIDOS: Array<'Informativo' | 'Urgente'> = ['Informativo', 'Urgente'];
const DESTINATARIOS_VALIDOS: DestinatarioComunicacao[] = ['todos', 'inquilino'];

@Injectable()
export class ComunicacaoService {
  constructor(private readonly db: DatabaseService) {}

  async listar(): Promise<ComunicacaoRow[]> {
    return this.db.withPlatform(async (client) => {
      const { rows } = await client.query<ComunicacaoRow>(`
        SELECT id, titulo, mensagem, tipo, destinatario, tenant_id, criado_em
        FROM comunicacao
        ORDER BY criado_em DESC
      `);
      return rows;
    });
  }

  async criar(dto: CriarComunicacaoDto): Promise<ComunicacaoRow> {
    this.validar(dto);

    if (dto.destinatario === 'inquilino') {
      if (!dto.tenantId) {
        throw new BadRequestException('tenantId é obrigatório quando o destinatário for inquilino.');
      }

      const inquilino = await this.db.withPlatform(async (client) => {
        const { rows } = await client.query('SELECT id FROM inquilino WHERE id = $1', [dto.tenantId]);
        return rows[0];
      });

      if (!inquilino) {
        throw new NotFoundException(`Inquilino não encontrado: ${dto.tenantId}`);
      }
    }

    return this.db.withPlatform(async (client) => {
      const { rows } = await client.query<ComunicacaoRow>(`
        INSERT INTO comunicacao (titulo, mensagem, tipo, destinatario, tenant_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, titulo, mensagem, tipo, destinatario, tenant_id, criado_em
      `, [
        dto.titulo.trim(),
        dto.mensagem.trim(),
        dto.tipo,
        dto.destinatario,
        dto.destinatario === 'inquilino' ? dto.tenantId ?? null : null,
      ]);

      return rows[0];
    });
  }

  private validar(dto: Partial<CriarComunicacaoDto>): void {
    if (!dto.titulo?.trim()) {
      throw new BadRequestException('titulo é obrigatório.');
    }
    if (!dto.mensagem?.trim()) {
      throw new BadRequestException('mensagem é obrigatória.');
    }
    if (!dto.tipo || !TIPOS_VALIDOS.includes(dto.tipo)) {
      throw new BadRequestException('tipo inválido.');
    }
    if (!dto.destinatario || !DESTINATARIOS_VALIDOS.includes(dto.destinatario)) {
      throw new BadRequestException('destinatario inválido.');
    }
  }
}
