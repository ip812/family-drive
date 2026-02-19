import { Hono } from "hono";
import { createRequestHandler } from "react-router";
import { drizzle } from "drizzle-orm/d1";
import { eq, sql, desc, lt } from "drizzle-orm";
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

    // Get albums with image count and the r2_key of the first (oldest) image as cover
    const rows = await db
      .select({
        id: albums.id,
        name: albums.name,
        createdAt: albums.createdAt,
        imageCount: sql<number>`COUNT(${images.id})`,
        coverKey: sql<string | null>`MIN(CASE WHEN ${images.id} IS NOT NULL THEN ${images.r2Key} END)`,
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
        coverKey: sql<string | null>`MIN(CASE WHEN ${images.id} IS NOT NULL THEN ${images.r2Key} END)`,
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
    const cursor = c.req.query("cursor") ? Number(c.req.query("cursor")) : null;

    const conditions = [eq(images.albumId, albumId)];
    if (cursor !== null && !isNaN(cursor)) {
      conditions.push(lt(images.id, cursor));
    }

    const rows = await db
      .select()
      .from(images)
      .where(sql`${eq(images.albumId, albumId)}${cursor !== null ? sql` AND ${lt(images.id, cursor)}` : sql``}`)
      .orderBy(desc(images.id))
      .limit(limit + 1);

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
      nextCursor: hasMore ? data[data.length - 1].id : null,
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

    const created: ImageResponse[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const meta = metadataList[i] ?? null;

      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const contentType = contentTypeMap[ext] ?? "image/jpeg";
      const uuid = crypto.randomUUID();
      const r2Key = `albums/${albumId}/${uuid}.${ext}`;

      const arrayBuffer = await file.arrayBuffer();

      await bucket.put(r2Key, arrayBuffer, {
        httpMetadata: { contentType },
        customMetadata: { albumId: String(albumId), filename: file.name },
      });

      const [image] = await db
        .insert(images)
        .values({
          albumId,
          r2Key,
          filename: file.name,
          takenAt: meta?.takenAt ?? null,
          size: file.size,
        })
        .returning();

      created.push({
        id: image.id,
        albumId: image.albumId,
        r2Key: image.r2Key,
        filename: image.filename,
        takenAt: image.takenAt ?? null,
        size: image.size,
        createdAt: image.createdAt,
      });
    }

    return c.json(created, 201);
  } catch (err) {
    if (err instanceof ToastError) throw err;
    throw new ToastError(errorInternalServerError("Грешка при качване на снимките"));
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

// ─── React Router SSR catch-all ───────────────────────────────────────────────

app.get("*", (c) => {
  const requestHandler = createRequestHandler(
    () => import("virtual:react-router/server-build"),
    import.meta.env.MODE,
  );

  return requestHandler(c.req.raw, {
    cloudflare: { env: c.env, ctx: c.executionCtx },
  });
});

export default app;
