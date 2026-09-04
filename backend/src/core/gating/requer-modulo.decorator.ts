import { SetMetadata } from '@nestjs/common';
import type { Modulo } from './modulos';

export const REQUER_MODULO_KEY = 'requer_modulo';

/** Marca um handler/controller como pertencente a um Módulo (gating — AD-4). */
export const RequerModulo = (modulo: Modulo) => SetMetadata(REQUER_MODULO_KEY, modulo);
