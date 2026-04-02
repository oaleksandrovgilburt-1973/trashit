import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

const hash = '$2b$10$mjcH/0muIh3xux6g43jLr.PocjmvzPHoDmGD3excst/.EAZHwg8GK';

await conn.execute(
  'UPDATE admin_config SET passwordHash=? WHERE username=?',
  [hash, 'admin']
);

console.log('Updated!');
await conn.end();


