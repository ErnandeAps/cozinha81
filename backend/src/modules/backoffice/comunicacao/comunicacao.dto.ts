export type DestinatarioComunicacao = 'todos' | 'inquilino';

export interface CriarComunicacaoDto {
  titulo: string;
  mensagem: string;
  tipo: 'Informativo' | 'Urgente';
  destinatario: DestinatarioComunicacao;
  tenantId?: string;
}

export interface ComunicacaoRow {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'Informativo' | 'Urgente';
  destinatario: DestinatarioComunicacao;
  tenant_id: string | null;
  criado_em: Date;
}
