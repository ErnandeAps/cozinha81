import type { PapelInquilino } from '../../core/auth/jwt-payload';

/** Dados para convidar um usuário (Dono/Admin → equipe). */
export interface ConvidarDto {
  email: string;
  nome: string;
  papel: PapelInquilino;
}

/** Aceite do convite: define a senha e ativa a credencial. */
export interface AceitarConviteDto {
  token: string;
  senha: string;
}

export interface ConviteCriado {
  conviteId: string;
  /** Token cru — retornado UMA vez para compor o link; não é persistido. */
  token: string;
  expiraEm: string;
  usuario: { id: string; email: string; papel: PapelInquilino; status: 'pendente' };
}
