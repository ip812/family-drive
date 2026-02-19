import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import ImageGrid from '~/components/ImageGrid';
import UploadButton from '~/components/UploadButton';
import type { AlbumResponse } from '../../types/albums';

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const albumId = Number(id);
  const [album, setAlbum] = useState<AlbumResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetch(`/api/v1/albums/${albumId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setAlbum);
  }, [albumId]);

  if (!album) {
    return <p className="text-muted-foreground">Албумът не е намерен.</p>;
  }

  return (
    <div>
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
    </div>
  );
}
