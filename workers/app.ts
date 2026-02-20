import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql, desc } from "drizzle-orm";
import { albums, images } from "../db/schemas";
import { ToastError } from "../toasts";
import { errorInternalServerError } from "../toasts/errors";
import { warningBadRequest, warningNotFound } from "../toasts/warnings";
import { successCreated, successOk } from "../toasts/success";
import type { AlbumRequest, AlbumResponse } from "../types/albums";
import type { ImageResponse, PaginatedImagesResponse, UploadImageMetadata } from "../types/images";

const app = new Hono<{ Bindings: Env }>();

// ─── Serve private R2 images ─────────────────────────────────────────────────

app.get("/api/v1/images/*", async (c) => {
  const key = c.req.path.replace("/api/v1/images/", "");
  if (!key) return c.json(warningNotFound("Не е намерено"), 404);

  const bucket = c.env.BUCKET;
  if (!bucket) return c.json(warningNotFound("Хранилището не е конфигурирано"), 500);
  const object = await bucket.get(key);
  if (!object) return c.json(warningNotFound("Снимката не е намерена"), 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
});

// ─── Albums ───────────────────────────────────────────────────────────────────

app.get("/api/v1/albums", async (c) => {
  try {
    const db = drizzle(c.env.DB!);

    const rows = await db
      .select({
        id: albums.id,
        name: albums.name,
        createdAt: albums.createdAt,
        imageCount: sql<number>`COUNT(${images.id})`,
        coverKey: sql<string | null>`(SELECT i2.r2_key FROM images i2 WHERE i2.album_id = ${albums.id} ORDER BY i2.taken_at DESC NULLS LAST, i2.id DESC LIMIT 1)`,
      })
      .from(albums)
      .leftJoin(images, eq(images.albumId, albums.id))
      .groupBy(albums.id)
      .orderBy(desc(albums.createdAt));

    const result: AlbumResponse[] = rows.map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      imageCount: Number(r.imageCount),
      coverKey: r.coverKey ?? null,
    }));

    return c.json(result);
  } catch (err) {
    throw new ToastError(errorInternalServerError("Грешка при зареждане на албумите"));
  }
});

app.post("/api/v1/albums", async (c) => {
  try {
    const db = drizzle(c.env.DB!);
    const body = await c.req.json<AlbumRequest>();

    if (!body.name?.trim()) {
      return c.json(warningBadRequest("Името на албума е задължително"), 400);
    }

    const [album] = await db
      .insert(albums)
      .values({ name: body.name.trim() })
      .returning();

    const result: AlbumResponse = {
      id: album.id,
      name: album.name,
      createdAt: album.createdAt,
      imageCount: 0,
      coverKey: null,
    };

    return c.json(result, 201);
  } catch (err) {
    throw new ToastError(errorInternalServerError("Грешка при създаване на албума"));
  }
});

app.get("/api/v1/albums/:id", async (c) => {
  try {
    const db = drizzle(c.env.DB!);
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json(warningBadRequest("Невалиден идентификатор"), 400);

    const rows = await db
      .select({
        id: albums.id,
        name: albums.name,
        createdAt: albums.createdAt,
        imageCount: sql<number>`COUNT(${images.id})`,
        coverKey: sql<string | null>`(SELECT i2.r2_key FROM images i2 WHERE i2.album_id = ${albums.id} ORDER BY i2.taken_at DESC NULLS LAST, i2.id DESC LIMIT 1)`,
      })
      .from(albums)
      .leftJoin(images, eq(images.albumId, albums.id))
      .where(eq(albums.id, id))
      .groupBy(albums.id);

    if (rows.length === 0) {
      return c.json(warningNotFound("Албумът не е намерен"), 404);
    }

    const r = rows[0];
    const result: AlbumResponse = {
      id: r.id,
      name: r.name,
      createdAt: r.createdAt,
      imageCount: Number(r.imageCount),
      coverKey: r.coverKey ?? null,
    };

    return c.json(result);
  } catch (err) {
    throw new ToastError(errorInternalServerError("Грешка при зареждане на албума"));
  }
});

// ─── Images ───────────────────────────────────────────────────────────────────

app.get("/api/v1/albums/:id/images", async (c) => {
  try {
    const db = drizzle(c.env.DB!);
    const albumId = Number(c.req.param("id"));
    if (isNaN(albumId)) return c.json(warningBadRequest("Невалиден идентификатор"), 400);

    const limit = Math.min(Number(c.req.query("limit") ?? "20"), 100);
    const offset = c.req.query("offset") ? Number(c.req.query("offset")) : 0;

    const rows = await db
      .select()
      .from(images)
      .where(eq(images.albumId, albumId))
      .orderBy(sql`${images.takenAt} DESC NULLS LAST`, desc(images.id))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const data = hasMore ? rows.slice(0, limit) : rows;

    const result: PaginatedImagesResponse = {
      data: data.map((row) => ({
        id: row.id,
        albumId: row.albumId,
        r2Key: row.r2Key,
        filename: row.filename,
        takenAt: row.takenAt ?? null,
        size: row.size,
        createdAt: row.createdAt,
      })),
      nextOffset: hasMore ? offset + limit : null,
      hasMore,
    };

    return c.json(result);
  } catch (err) {
    throw new ToastError(errorInternalServerError("Грешка при зареждане на снимките"));
  }
});

app.post("/api/v1/albums/:id/images", async (c) => {
  try {
    const db = drizzle(c.env.DB!);
    const albumId = Number(c.req.param("id"));
    if (isNaN(albumId)) return c.json(warningBadRequest("Невалиден идентификатор"), 400);

    // Verify album exists
    const albumRows = await db.select().from(albums).where(eq(albums.id, albumId)).limit(1);
    if (albumRows.length === 0) return c.json(warningNotFound("Албумът не е намерен"), 404);

    const formData = await c.req.formData();
    const files = formData.getAll("files") as File[];
    const metadataRaw = formData.get("metadata");

    if (!files || files.length === 0) {
      return c.json(warningBadRequest("Не са избрани файлове"), 400);
    }

    let metadataList: UploadImageMetadata[] = [];
    if (metadataRaw && typeof metadataRaw === "string") {
      try {
        metadataList = JSON.parse(metadataRaw);
      } catch {
        // metadata parsing failed — proceed without EXIF dates
      }
    }

    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      heic: "image/heic",
      heif: "image/heif",
    };

    const bucket = c.env.BUCKET;
    if (!bucket) {
      return c.json(errorInternalServerError("Хранилището не е конфигурирано"), 500);
    }

    // Prepare per-file metadata synchronously
    const fileEntries = files.map((file, i) => {
      const meta = metadataList[i] ?? null;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const contentType = contentTypeMap[ext] ?? "image/jpeg";
      const r2Key = `albums/${albumId}/${crypto.randomUUID()}.${ext}`;
      return { file, meta, contentType, r2Key };
    });

    // Upload all files to R2 in parallel (File extends Blob — no arrayBuffer() needed)
    await Promise.all(
      fileEntries.map(({ file, contentType, r2Key }) =>
        bucket.put(r2Key, file, {
          httpMetadata: { contentType },
          customMetadata: { albumId: String(albumId), filename: file.name },
        })
      )
    );

    // Single batch insert into D1
    const insertedImages = await db
      .insert(images)
      .values(
        fileEntries.map(({ file, meta, r2Key }) => ({
          albumId,
          r2Key,
          filename: file.name,
          takenAt: meta?.takenAt ?? null,
          size: file.size,
        }))
      )
      .returning();

    const created: ImageResponse[] = insertedImages.map((image) => ({
      id: image.id,
      albumId: image.albumId,
      r2Key: image.r2Key,
      filename: image.filename,
      takenAt: image.takenAt ?? null,
      size: image.size,
      createdAt: image.createdAt,
    }));

    return c.json(created, 201);
  } catch (err) {
    if (err instanceof ToastError) throw err;
    throw new ToastError(errorInternalServerError("Грешка при качване на снимките"));
  }
});

app.delete("/api/v1/albums/:id", async (c) => {
  try {
    const db = drizzle(c.env.DB!);
    const id = Number(c.req.param("id"));
    if (isNaN(id)) return c.json(warningBadRequest("Невалиден идентификатор"), 400);

    const albumRows = await db.select().from(albums).where(eq(albums.id, id)).limit(1);
    if (albumRows.length === 0) return c.json(warningNotFound("Албумът не е намерен"), 404);

    const albumImages = await db.select().from(images).where(eq(images.albumId, id));

    if (albumImages.length > 0)
      return c.json(warningBadRequest("Албумът съдържа снимки и не може да бъде изтрит"), 400);

    await db.delete(albums).where(eq(albums.id, id));

    return c.json(successOk("Албумът е изтрит"));
  } catch (err) {
    throw new ToastError(errorInternalServerError("Грешка при изтриване на албума"));
  }
});

app.delete("/api/v1/albums/:albumId/images/:imageId", async (c) => {
  try {
    const db = drizzle(c.env.DB!);
    const albumId = Number(c.req.param("albumId"));
    const imageId = Number(c.req.param("imageId"));
    if (isNaN(albumId) || isNaN(imageId)) return c.json(warningBadRequest("Невалиден идентификатор"), 400);

    const [image] = await db.select().from(images).where(eq(images.id, imageId)).limit(1);
    if (!image) return c.json(warningNotFound("Снимката не е намерена"), 404);

    const bucket = c.env.BUCKET;
    if (bucket) {
      await bucket.delete(image.r2Key);
    }

    await db.delete(images).where(eq(images.id, imageId));

    return c.json(successOk("Снимката е изтрита"));
  } catch (err) {
    throw new ToastError(errorInternalServerError("Грешка при изтриване на снимката"));
  }
});

// ─── Error handler ────────────────────────────────────────────────────────────

app.onError((err, c) => {
  if (err instanceof ToastError) {
    const toast = err.getError();
    return c.json(toast, toast.code as 400 | 404 | 500);
  }
  return c.json(errorInternalServerError("Вътрешна грешка"), 500);
});

// ─── SPA catch-all ───────────────────────────────────────────────────────────

app.get("*", async (c) => {
  const url = new URL(c.req.url);
  url.pathname = "/index.html";
  return c.env.ASSETS!.fetch(url.toString());
});

export default app;
