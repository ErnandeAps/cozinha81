import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtSecret } from './auth.config';
import type { AuthPrincipal, JwtPayload } from './jwt-payload';

/**
 * Estratégia JWT única para os dois realms. Valida assinatura/expiração e
 * devolve o payload como principal (`req.user`). A distinção de realm é feita
 * pelos guards de escopo (ex.: {@link PlatformScopeGuard}) — esta estratégia
 * apenas autentica.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
    });
  }

  validate(payload: JwtPayload): AuthPrincipal {
    return payload;
  }
}
