import { MODULOS, type Modulo } from '../../../core/gating/modulos';

export { MODULOS, type Modulo };

/** Payload para provisionar um novo Inquilino (FR-1). */
export interface ProvisionarInquilinoDto {
  /** Nome do Inquilino (cliente). */
  nome: string;
  /** Cozinha do inquilino selecionada no cadastro. */
  cozinhaId?: string;
  /** Dados completos do restaurante. */
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
  /** Dono/Admin inicial do Inquilino. */
  dono: { email: string; nome: string };
  /** Módulos contratados a habilitar. */
  modulos: Modulo[];
}

export interface InquilinoProvisionado {
  tenantId: string;
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
  dono: { id: string; email: string; nome: string; papel: 'dono_admin'; status: 'pendente' };
  modulos: { modulo: Modulo; habilitado: boolean }[];
  /**
   * Convite de primeiro acesso do Dono/Admin (uso único, TTL padrão). O `token`
   * cru é retornado UMA vez para compor o link de definição de senha; não é
   * persistido (só o hash). O Dono ativa a credencial em
   * `POST /portal/usuarios/convites/aceitar` — mesmo fluxo dos demais usuários.
   */
  conviteDono: { token: string; expiraEm: string };
}
