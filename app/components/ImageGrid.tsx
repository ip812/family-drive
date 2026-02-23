import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, X, Trash2, ChevronLeft, ChevronRight, Play, Download, File } from 'lucide-react';
import { toast } from 'sonner';
import { getV1, deleteV1 } from '../../http/client';
import { isToast, isSuccess } from '../../toasts';
import type { Toast } from '../../toasts';
import ConfirmDialog from '~/components/ConfirmDialog';
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
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pendingDeleteImage, setPendingDeleteImage] = useState<ImageResponse | null>(null);
  const [deleting, setDeleting] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] ?? null : null;

  const fetchImages = useCallback(async (offset: number | null, reset = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    const params = new URLSearchParams({ limit: '20' });
    if (offset !== null) params.set('offset', String(offset));

    const result = await getV1<PaginatedImagesResponse>(
      `/albums/${albumId}/images?${params.toString()}`,
    );

    loadingRef.current = false;
    setLoading(false);
    setInitialLoad(false);

    if (isToast(result)) return;

    setImages((prev) => (reset ? result.data : [...prev, ...result.data]));
    setNextOffset(result.nextOffset);
    setHasMore(result.hasMore);
  }, [albumId]);

  // Reset and reload when albumId or refreshKey changes
  useEffect(() => {
    setImages([]);
    setNextOffset(null);
    setHasMore(true);
    setInitialLoad(true);
    setSelectedIndex(null);
    fetchImages(null, true);
  }, [albumId, refreshKey, fetchImages]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (selectedIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) =>
          prev !== null && prev < images.length - 1 ? prev + 1 : prev
        );
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [selectedIndex, images.length]);

  // Preload next page when near the end of loaded images
  useEffect(() => {
    if (selectedIndex === null) return;
    if (selectedIndex >= images.length - 3 && hasMore && !loadingRef.current) {
      fetchImages(nextOffset);
    }
  }, [selectedIndex, images.length, hasMore, nextOffset, fetchImages]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingRef.current) {
          fetchImages(nextOffset);
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, nextOffset, fetchImages]);

  const handleDeleteImage = async () => {
    if (!pendingDeleteImage) return;
    setDeleting(true);
    const result = await deleteV1<Toast>(`/albums/${albumId}/images/${pendingDeleteImage.id}`);
    setDeleting(false);

    if (!isToast(result) || !isSuccess(result)) {
      toast.error(isToast(result) ? result.message : 'Грешка при изтриване');
      return;
    }

    toast.success('Снимката е изтрита');
    setImages((prev) => prev.filter((img) => img.id !== pendingDeleteImage.id));
    setPendingDeleteImage(null);
  };

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
    <>
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, idx) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg bg-muted aspect-square cursor-pointer"
              onClick={() => setSelectedIndex(idx)}
            >
              {image.mediaType === 'video' ? (
                <>
                  <video
                    src={`/api/v1/images/${image.r2Key}`}
                    preload="metadata"
                    muted
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Play className="size-8 text-white drop-shadow-lg" />
                  </div>
                </>
              ) : image.mediaType === 'file' ? (
                <div className="h-full w-full flex flex-col items-center justify-center gap-2 p-3 bg-muted">
                  <File className="size-10 text-muted-foreground" />
                  <span className="text-xs text-center text-muted-foreground break-all line-clamp-3 leading-tight">
                    {image.filename}
                  </span>
                </div>
              ) : (
                <img
                  src={`/api/v1/images/${image.r2Key}`}
                  alt={image.filename}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
              )}
              {image.takenAt && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  {formatDate(image.takenAt)}
                </div>
              )}
              <button
                className="absolute top-1.5 left-1.5 bg-black/50 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
                onClick={(e) => { e.stopPropagation(); setPendingDeleteImage(image); }}
                title="Изтрий снимката"
              >
                <Trash2 className="size-3.5" />
              </button>
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

      {selectedImage && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Top-left: delete */}
          <button
            className="absolute top-4 left-4 bg-black/50 hover:bg-red-600 text-white rounded-full p-2 transition-colors"
            onClick={(e) => { e.stopPropagation(); setSelectedIndex(null); setPendingDeleteImage(selectedImage); }}
            title="Изтрий снимката"
          >
            <Trash2 className="size-5" />
          </button>

          {/* Top-right: download + close */}
          <div className="absolute top-4 right-4 flex gap-2">
            <a
              href={`/api/v1/images/${selectedImage.r2Key}`}
              download={selectedImage.filename}
              className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              onClick={(e) => e.stopPropagation()}
              title="Изтегли"
            >
              <Download className="size-5" />
            </a>
            <button
              className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
              onClick={() => setSelectedIndex(null)}
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Left arrow */}
          {selectedIndex > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex((i) => (i !== null ? i - 1 : i)); }}
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {/* Right arrow */}
          {selectedIndex < images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-colors"
              onClick={(e) => { e.stopPropagation(); setSelectedIndex((i) => (i !== null ? i + 1 : i)); }}
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          {/* Media */}
          {selectedImage.mediaType === 'video' ? (
            <video
              key={selectedImage.id}
              src={`/api/v1/images/${selectedImage.r2Key}`}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          ) : selectedImage.mediaType === 'file' ? (
            <div
              className="flex flex-col items-center gap-6 rounded-xl bg-card p-10 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <File className="size-20 text-muted-foreground" />
              <p className="max-w-xs text-center text-sm font-medium break-all">{selectedImage.filename}</p>
              <a
                href={`/api/v1/images/${selectedImage.r2Key}`}
                download={selectedImage.filename}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                <Download className="size-4" />
                Изтегли
              </a>
            </div>
          ) : (
            <img
              src={`/api/v1/images/${selectedImage.r2Key}`}
              alt={selectedImage.filename}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Position indicator */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
            {selectedIndex + 1} / {images.length}{hasMore ? '+' : ''}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteImage}
        onOpenChange={(open) => { if (!open) setPendingDeleteImage(null); }}
        title="Изтрий снимката"
        description="Сигурни ли сте, че искате да изтриете тази снимка? Действието е необратимо."
        onConfirm={handleDeleteImage}
        loading={deleting}
      />
    </>
  );
};

export default ImageGrid;
