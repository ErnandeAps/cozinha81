import { SetMetadata } from '@nestjs/common';
import type { PapelInquilino } from './jwt-payload';

export const PAPEIS_KEY = 'papeis';

/** Restringe um handler aos papéis informados (consumido por {@link RolesGuard}). */
export const Papeis = (...papeis: (PapelInquilino | 'staff')[]) => SetMetadata(PAPEIS_KEY, papeis);
