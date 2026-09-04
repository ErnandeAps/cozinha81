export class RegistrarPresencaDto {
  cozinhaId: string;
  tenantId?: string;
  tipo: 'in' | 'out';
  checklist?: {
    limpeza: boolean;
    equipamento: boolean;
    observacoes?: string;
  };
}
