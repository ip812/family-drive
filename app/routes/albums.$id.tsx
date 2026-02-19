import { useState } from 'react';
import { useNavigate } from 'react-router';
import { drizzle } from 'drizzle-orm/d1';
import { sql, eq } from 'drizzle-orm';
import type { Route } from "./+types/albums.$id";
import Navbar from '~/components/Navbar';
import ImageGrid from '~/components/ImageGrid';
import UploadButton from '~/components/UploadButton';
import { albums, images } from '../../db/schemas';
import type { AlbumResponse } from '../../types/albums';

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: data?.album?.name ? `${data.album.name} – Семеен архив` : 'Семеен архив' },
  ];
}

export async function loader({ params, context }: Route.LoaderArgs) {
  const id = Number(params.id);
  if (isNaN(id)) return { album: null as AlbumResponse | null };

  const db = drizzle(context.cloudflare.env.DB!);

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

  if (rows.length === 0) return { album: null as AlbumResponse | null };

  const r = rows[0];
  const album: AlbumResponse = {
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    imageCount: Number(r.imageCount),
    coverKey: r.coverKey ?? null,
  };

  return { album };
}

export default function AlbumDetail({ loaderData, params }: Route.ComponentProps) {
  const navigate = useNavigate();
  const { album } = loaderData;
  const albumId = Number(params.id);
  const [refreshKey, setRefreshKey] = useState(0);

  if (!album) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-muted-foreground">Албумът не е намерен.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground hover:text-foreground mb-1 transition-colors"
            >
              ← Всички албуми
            </button>
            <h1 className="text-2xl font-bold">{album.name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {album.imageCount} {album.imageCount === 1 ? 'снимка' : 'снимки'}
            </p>
          </div>
          <UploadButton albumId={albumId} onUploaded={() => setRefreshKey((k) => k + 1)} />
        </div>
        <ImageGrid albumId={albumId} refreshKey={refreshKey} />
      </main>
    </div>
  );
}
