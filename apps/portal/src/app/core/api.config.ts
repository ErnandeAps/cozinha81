/**
 * Base da API do backend.
 * Por padrão usa localhost para desenvolvimento local.
 * Quando o app for servindo via ngrok, é possível sobrepor via:
 * window.__COZINHA81_API_BASE__ = 'https://<url-publica-do-backend>/api';
 */
const DEFAULT_API_BASE = 'http://localhost:3000/api';

export const API_BASE =
  typeof window !== 'undefined' && (window as Window & { __COZINHA81_API_BASE__?: string }).__COZINHA81_API_BASE__
    ? (window as Window & { __COZINHA81_API_BASE__?: string }).__COZINHA81_API_BASE__
    : DEFAULT_API_BASE;
