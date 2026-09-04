import { buildPoolConfig } from './database.config';

describe('buildPoolConfig', () => {
  it('não inclui password quando a variável não está definida', () => {
    const config = buildPoolConfig({
      PGHOST: 'localhost',
      PGPORT: '5432',
      PGUSER: 'cozinha_app',
      PGDATABASE: 'cozinha81',
    });

    expect(Object.prototype.hasOwnProperty.call(config, 'password')).toBe(false);
    expect(config).toMatchObject({
      host: 'localhost',
      port: 5432,
      user: 'cozinha_app',
      database: 'cozinha81',
    });
  });
});
