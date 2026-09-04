export class CriarMaterialDto {
  nome: string;
}

export class RegistrarMovimentoDto {
  materialId: string;
  tipo: 'entrada' | 'consumo';
  quantidade: number;
  valorUnitario?: number;
  tenantId?: string;
}
