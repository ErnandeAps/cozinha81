/**
 * Base da API do backend.
 * Por padrão usa localhost para desenvolvimento local.
 * Quando o app for acessado por celular via ngrok, pode-se sobrepor via:
 * window.__COZINHA81_API_BASE__ = 'https://<url-publica-do-backend>/api';
 */
const DEFAULT_API_BASE = 'http://localhost:3000/api';

const runtimeApiBase =
  typeof window !== 'undefined' ? (window as Window & { __COZINHA81_API_BASE__?: string }).__COZINHA81_API_BASE__ : undefined;

export const API_BASE: string = runtimeApiBase ?? DEFAULT_API_BASE;
