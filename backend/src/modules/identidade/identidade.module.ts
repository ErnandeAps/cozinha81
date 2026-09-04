import { Module } from '@nestjs/common';
import { ConviteController } from './convite.controller';
import { ConviteService } from './convite.service';

/**
 * Módulo `identidade` — gestão de usuários do Inquilino (convites). Realm de
 * Inquilino; depende apenas do `core` (AD-2).
 */
@Module({
  controllers: [ConviteController],
  providers: [ConviteService],
})
export class IdentidadeModule {}
