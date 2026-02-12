import { pool } from './database';

let hasReactionTypeCache: boolean | null = null;

/**
 * Initialize schema cache at startup. Avoids querying information_schema on every request.
 */
export async function initSchemaCache(): Promise<void> {
  try {
    const r = await pool.query(`
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'likes' AND column_name = 'reaction_type'
    `);
    hasReactionTypeCache = r.rows.length > 0;
  } catch (err) {
    console.warn('Schema cache init failed, assuming reaction_type exists:', (err as Error).message);
    hasReactionTypeCache = true;
  }
}

export function getHasReactionType(): boolean {
  return hasReactionTypeCache ?? true;
}
