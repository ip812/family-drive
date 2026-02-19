import { useState, useEffect } from 'react';
import AlbumCard from '~/components/AlbumCard';
import type { AlbumResponse } from '../../types/albums';

export default function Home() {
  const [albums, setAlbums] = useState<AlbumResponse[]>([]);

  useEffect(() => {
    fetch('/api/v1/albums')
      .then((r) => (r.ok ? r.json() : []))
      .then(setAlbums);
  }, []);

  return albums.length === 0 ? (
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
  );
}
