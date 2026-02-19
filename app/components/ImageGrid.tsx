import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { getV1 } from '../../http/client';
import { isToast } from '../../toasts';
import type { ImageResponse, PaginatedImagesResponse } from '../../types/images';

interface ImageGridProps {
  albumId: number;
  refreshKey?: number;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const ImageGrid = ({ albumId, refreshKey }: ImageGridProps) => {
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const fetchImages = useCallback(async (cursor: number | null, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const params = new URLSearchParams({ limit: '20' });
    if (cursor !== null) params.set('cursor', String(cursor));

    const result = await getV1<PaginatedImagesResponse>(
      `/albums/${albumId}/images?${params.toString()}`,
    );

    loadingRef.current = false;
    setLoading(false);
    setInitialLoad(false);

    if (isToast(result)) return;

    setImages((prev) => (reset ? result.data : [...prev, ...result.data]));
    setNextCursor(result.nextCursor);
    setHasMore(result.hasMore);
  }, [albumId]);

  // Reset and reload when albumId or refreshKey changes
  useEffect(() => {
    setImages([]);
    setNextCursor(null);
    setHasMore(true);
    setInitialLoad(true);
    fetchImages(null, true);
  }, [albumId, refreshKey, fetchImages]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchImages(nextCursor);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, nextCursor, fetchImages]);

  if (initialLoad) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-muted-foreground">
        <p className="text-lg">Няма снимки в този албум</p>
        <p className="text-sm mt-1">Качете снимки с бутона по-горе</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((image) => (
          <div key={image.id} className="group relative overflow-hidden rounded-lg bg-muted aspect-square">
            <img
              src={`/api/v1/images/${image.r2Key}`}
              alt={image.filename}
              loading="lazy"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
            {image.takenAt && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                {formatDate(image.takenAt)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="py-6 flex justify-center">
        {loading && <Loader2 className="size-6 animate-spin text-muted-foreground" />}
        {!hasMore && images.length > 0 && (
          <p className="text-sm text-muted-foreground">Всички снимки са заредени</p>
        )}
      </div>
    </div>
  );
};

export default ImageGrid;
