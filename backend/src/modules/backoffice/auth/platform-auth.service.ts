import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../../core/database/database.service';
import { DUMMY_BCRYPT_HASH, verifyPassword } from '../../../core/auth/password';
import type { JwtPayload } from '../../../core/auth/jwt-payload';

interface StaffRow {
  id: string;
  nome: string;
  papel: string;
  senha_hash: string;
}

export interface LoginResult {
  accessToken: string;
  staff: { id: string; nome: string; papel: string };
}


/**
 * Autenticação do realm de plataforma (AD-14). Emite token com
 * `scope=platform` + papel de staff e **sem `tenantId`**. Não há signup público
 * (AD-11): staff é provisionado fora deste fluxo.
 */
@Injectable()
export class PlatformAuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, senha: string): Promise<LoginResult> {
    // `staff` é tabela de plataforma (sem RLS); consulta direta no pool.
    const { rows } = await this.db.rawPool.query<StaffRow>(
      'SELECT id, nome, papel, senha_hash FROM staff WHERE email = $1',
      [email],
    );
    const staff = rows[0];
    // Compara sempre (mesmo sem staff) para não vazar existência do email por timing.
    const senhaOk = await verifyPassword(senha, staff?.senha_hash ?? DUMMY_BCRYPT_HASH);
    if (!staff || !senhaOk) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const payload: JwtPayload = { sub: staff.id, scope: 'platform', papel: 'staff' };
    return {
      accessToken: await this.jwt.signAsync(payload),
      staff: { id: staff.id, nome: staff.nome, papel: staff.papel },
    };
  }
}
