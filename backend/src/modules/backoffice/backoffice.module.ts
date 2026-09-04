import { Module } from '@nestjs/common';
import { PlatformAuthController } from './auth/platform-auth.controller';
import { PlatformAuthService } from './auth/platform-auth.service';
import { ProvisioningController } from './provisioning/provisioning.controller';
import { ProvisioningService } from './provisioning/provisioning.service';
import { ModuloFlagController } from './modulos/modulo-flag.controller';
import { ModuloFlagService } from './modulos/modulo-flag.service';
import { CozinhaController } from './cozinhas/cozinha.controller';
import { CozinhaService } from './cozinhas/cozinha.service';
import { CentroCustoController } from './centro-custo/centro-custo.controller';
import { CentroCustoService } from './centro-custo/centro-custo.service';
import { ReservaController } from './reservas/reserva.controller';
import { ReservaService } from './reservas/reserva.service';
import { DocumentoController } from './documentos/documento.controller';
import { DocumentoService } from './documentos/documento.service';
import { AlertaController } from './alertas/alerta.controller';
import { AlertaService } from './alertas/alerta.service';
import { PresencaController } from './presenca/presenca.controller';
import { PresencaService } from './presenca/presenca.service';
import { MaterialController } from './materiais/material.controller';
import { MaterialService } from './materiais/material.service';
import { BillingController } from './billing/billing.controller';
import { BillingService } from './billing/billing.service';
import { UsuarioController } from './usuarios/usuario.controller';
import { UsuarioService } from './usuarios/usuario.service';
import { GasController } from './gas/gas.controller';
import { GasLeituraService } from './gas/gas.service';

/**
 * Módulo `backoffice` — realm de plataforma (AD-14). Dono de Inquilino, flags
 * de Módulo, etc. (AD-3). Depende apenas do `core` (AD-2).
 */
@Module({
  controllers: [
    PlatformAuthController,
    ProvisioningController,
    ModuloFlagController,
    CozinhaController,
    CentroCustoController,
    ReservaController,
    DocumentoController,
    AlertaController,
    PresencaController,
    MaterialController,
    BillingController,
    UsuarioController,
    GasController,
  ],
  providers: [
    PlatformAuthService,
    ProvisioningService,
    ModuloFlagService,
    CozinhaService,
    CentroCustoService,
    ReservaService,
    DocumentoService,
    AlertaService,
    PresencaService,
    MaterialService,
    BillingService,
    UsuarioService,
    GasLeituraService,
  ],
})
export class BackofficeModule {}
