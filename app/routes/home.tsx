import { useState } from 'react';
import { drizzle } from 'drizzle-orm/d1';
import { sql, desc, eq } from 'drizzle-orm';
import type { Route } from "./+types/home";
import Navbar from '~/components/Navbar';
import AlbumCard from '~/components/AlbumCard';
import { albums, images } from '../../db/schemas';
import type { AlbumResponse } from '../../types/albums';

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Семеен архив" },
    { name: "description", content: "Семеен фотоалбум" },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
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
    .groupBy(albums.id)
    .orderBy(desc(albums.createdAt));

  const albumsData: AlbumResponse[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    imageCount: Number(r.imageCount),
    coverKey: r.coverKey ?? null,
  }));

  return { albums: albumsData };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const [albums, setAlbums] = useState<AlbumResponse[]>(loaderData.albums);

  const handleAlbumCreated = async () => {
    const res = await fetch('/api/v1/albums');
    if (res.ok) {
      const data: AlbumResponse[] = await res.json();
      setAlbums(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onAlbumCreated={handleAlbumCreated} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {albums.length === 0 ? (
          <div className="flex flex-col items-center py-24 text-muted-foreground">
            <p className="text-xl font-medium">Нямате албуми все още</p>
            <p className="text-sm mt-2">Натиснете „Нов албум", за да започнете</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
