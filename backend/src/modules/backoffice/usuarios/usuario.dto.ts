export type AppUsuario = 'portal' | 'backoffice';
export type PapelUsuario = 'admin' | 'gestor' | 'operador' | 'cozinha';

export interface CriarUsuarioDto {
  nome: string;
  email: string;
  senha: string;
  app?: AppUsuario;
  papel?: PapelUsuario;
  ativo?: boolean;
  permissoes?: string[];
}

export interface AtualizarUsuarioDto extends Partial<CriarUsuarioDto> {}

export interface UsuarioExibicao {
  id: string;
  nome: string;
  email: string;
  app: AppUsuario;
  papel: PapelUsuario;
  ativo: boolean;
  permissoes: string[];
  criado_em: string;
}
