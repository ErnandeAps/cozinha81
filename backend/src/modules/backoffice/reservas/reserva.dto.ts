export type ModalidadeReserva = 'turno' | 'cafe' | 'almoco' | 'jantar' | 'personalizado' | 'dia';

export interface CriarReservaDto {
  cozinhaId: string;
  inicio: string; // ISO-8601 date string
  fim: string;    // ISO-8601 date string
  modalidade: ModalidadeReserva;
  tenantId?: string; // Optional: only platform staff can specify a tenantId for reservations
}

export interface AtualizarReservaDto {
  cozinhaId: string;
  inicio: string;
  fim: string;
  modalidade: ModalidadeReserva;
  tenantId?: string;
}
