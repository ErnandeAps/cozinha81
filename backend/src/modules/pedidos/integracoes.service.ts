import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { EncryptionService } from '../../core/security/encryption.service';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';

export interface IntegrationDto {
  provider: string;
  storeId?: string;
  status: string;
  criadoEm: string;
}

/** Provedores de delivery suportados no v1 (uma marca por Cozinha — FR-23). */
const PROVIDERS_SUPORTADOS = ['ifood', '99food'];

@Injectable()
export class IntegracoesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly encryptionService: EncryptionService,
    private readonly providerFactory: DeliveryProviderFactory
  ) {}

  async listIntegrations(tenantId: string): Promise<IntegrationDto[]> {
    return this.db.withTenant(tenantId, async (client) => {
      // Nunca selecionar credentials_encrypted aqui (AC#5: segredo não trafega).
      const result = await client.query(
        `SELECT provider, store_id, status, criado_em
           FROM integracoes_delivery
          ORDER BY criado_em`
      );

      return result.rows.map((row) => ({
        provider: row.provider,
        storeId: row.store_id ?? undefined,
        status: row.status,
        criadoEm: row.criado_em.toISOString(),
      }));
    });
  }

  /**
   * Conecta (ou reconecta) a conta de loja de um provider para a Cozinha.
   * AC#1: valida via adapter (ACL). AC#3/FR-23: uma marca por Cozinha por vez.
   * AC#5: credenciais cifradas em repouso.
   */
  async saveIntegration(
    tenantId: string,
    provider: string,
    storeId: string,
    credentialsRaw: string
  ): Promise<void> {
    // Validação manual — o projeto não usa ValidationPipe global.
    if (!PROVIDERS_SUPORTADOS.includes(provider)) {
      throw new BadRequestException(`Provedor de delivery não suportado: ${provider}`);
    }
    if (!storeId?.trim() || !credentialsRaw?.trim()) {
      throw new BadRequestException('storeId e credenciais são obrigatórios.');
    }

    // AC#1: a conexão é validada via adapter antes de persistir.
    const adapter = this.providerFactory.getAdapter(provider);
    const isValid = await adapter.validateCredentials(storeId, credentialsRaw);
    if (!isValid) {
      throw new BadRequestException('Credenciais inválidas para o provedor informado.');
    }

    // AC#5: cifra antes de tocar o banco; o segredo bruto nunca é persistido/logado.
    const encrypted = this.encryptionService.encrypt(credentialsRaw);

    await this.db.withTenant(tenantId, async (client) => {
      // FR-23: uma marca/acesso por Cozinha por vez. Se já existe conexão de
      // OUTRO provider, barra (o Dono precisa desconectar a atual primeiro).
      const { rows } = await client.query<{ provider: string }>(
        `SELECT provider FROM integracoes_delivery WHERE tenant_id = $1`,
        [tenantId]
      );
      const existente = rows[0]?.provider;
      if (existente && existente !== provider) {
        throw new ConflictException({
          code: 'MARCA_DELIVERY_UNICA',
          message: `Esta Cozinha já tem uma conexão de delivery ativa (${existente}). Desconecte-a antes de conectar ${provider}.`,
          details: { conectado: existente, tentado: provider },
        });
      }

      // Mesmo provider => reconectar/atualizar credenciais. UNIQUE(tenant_id) é o
      // backstop de banco para a regra "uma marca por Cozinha".
      await client.query(
        `INSERT INTO integracoes_delivery (tenant_id, provider, store_id, credentials_encrypted)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (tenant_id) DO UPDATE
            SET provider = EXCLUDED.provider,
                store_id = EXCLUDED.store_id,
                credentials_encrypted = EXCLUDED.credentials_encrypted,
                status = 'ativo',
                atualizado_em = now()`,
        [tenantId, provider, storeId, encrypted]
      );
    });
  }

  async deleteIntegration(tenantId: string, provider: string): Promise<void> {
    await this.db.withTenant(tenantId, async (client) => {
      await client.query(`DELETE FROM integracoes_delivery WHERE provider = $1`, [provider]);
    });
  }

  /**
   * AC#2 (FR-19/FR-20): porta de ingestão. Sem conexão válida (status `ativo`)
   * para o provider, nenhum Pedido daquele app pode ser ingerido.
   */
  async isProviderConnected(tenantId: string, provider: string): Promise<boolean> {
    return this.db.withTenant(tenantId, async (client) => {
      const { rows } = await client.query(
        `SELECT 1 FROM integracoes_delivery
          WHERE provider = $1 AND status = 'ativo'
          LIMIT 1`,
        [provider]
      );
      return rows.length > 0;
    });
  }
}
