#!/usr/bin/env node
// Applies supabase/schema.sql then supabase/seed.sql to your Supabase Postgres.
//
// Usage:
//   SUPABASE_DB_URL="postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres" \
//     node scripts/setup-supabase.mjs
//
// Get the URI from: Supabase dashboard -> Project Settings -> Database ->
// Connection string -> URI (the one that includes your DB password).
//
// Requires the `pg` package (already a devDependency: `npm install`).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('\n✗ Set SUPABASE_DB_URL (or DATABASE_URL) to your Supabase connection string.\n');
  console.error('  Project Settings -> Database -> Connection string -> URI\n');
  process.exit(1);
}

let pg;
try {
  pg = await import('pg');
} catch {
  console.error('\n✗ The `pg` package is missing. Run `npm install` first.\n');
  process.exit(1);
}

const { Client } = pg.default ?? pg;

const schema = readFileSync(join(root, 'supabase', 'schema.sql'), 'utf8');
const seed = readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8');

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function runForgiving(label, sql) {
  // schema.sql contains statements that may already exist (e.g. publication
  // membership). Run statement-by-statement and tolerate "already exists".
  console.log(`\n→ Applying ${label}…`);
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length && !s.startsWith('--'));
  for (const stmt of statements) {
    try {
      await client.query(stmt);
    } catch (e) {
      const msg = String(e.message || e);
      if (/already exists|already a member|duplicate/i.test(msg)) {
        // ignore idempotent re-runs
      } else {
        console.error(`  ! ${msg.split('\n')[0]}`);
      }
    }
  }
}

try {
  await client.connect();
  console.log('✓ Connected to Supabase Postgres');
  await runForgiving('schema.sql', schema);
  await runForgiving('seed.sql', seed);
  console.log('\n✅ Done. Schema + demo seed applied.\n');
} catch (e) {
  console.error('\n✗ Failed:', e.message);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
