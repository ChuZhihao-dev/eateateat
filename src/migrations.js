export const MIGRATIONS = [
  {
    id: '001_initial_schema',
    sql: `
      CREATE TABLE IF NOT EXISTS dishes (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        cuisine     TEXT NOT NULL DEFAULT '家常',
        meals       TEXT NOT NULL DEFAULT '["lunch","dinner"]',
        tags        TEXT NOT NULL DEFAULT '[]',
        spice       INTEGER NOT NULL DEFAULT 0,
        cook        INTEGER NOT NULL DEFAULT 20,
        price       INTEGER NOT NULL DEFAULT 20,
        ingredients TEXT NOT NULL DEFAULT '[]',
        created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
      );

      CREATE TABLE IF NOT EXISTS meals (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        dish_id   INTEGER NOT NULL,
        meal_type TEXT NOT NULL DEFAULT 'lunch',
        rating    INTEGER,
        eaten_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_meals_eaten_at ON meals(eaten_at);
      CREATE INDEX IF NOT EXISTS idx_meals_dish_id ON meals(dish_id);
    `
  }
];

export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  const applied = new Set(
    db
      .prepare('SELECT id FROM schema_migrations')
      .all()
      .map((row) => row.id)
  );
  const markApplied = db.prepare('INSERT INTO schema_migrations (id) VALUES (?)');

  for (const migration of MIGRATIONS) {
    if (applied.has(migration.id)) continue;
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      markApplied.run(migration.id);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}
