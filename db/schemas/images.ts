import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { albums } from './albums';

export const images = sqliteTable('images', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  albumId: integer('album_id', { mode: 'number' })
    .notNull()
    .references(() => albums.id),
  r2Key: text('r2_key', { length: 1024 }).notNull(),
  filename: text('filename', { length: 1024 }).notNull(),
  takenAt: text('taken_at'),
  size: integer('size', { mode: 'number' }).notNull(),
  mediaType: text('media_type').notNull().default('image'),
  createdAt: text('created_at')
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});
