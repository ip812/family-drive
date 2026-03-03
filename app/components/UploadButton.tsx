import { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { postV1 } from '../../http/client';
import { isToast } from '../../toasts';
import type { ImageResponse, UploadStartRequest, UploadStartResponse, UploadPartResponse, UploadConfirmRequest } from '../../types/images';
import type { Toast } from '../../toasts';

type ItemStatus = 'pending' | 'uploading' | 'done' | 'error';

interface QueueItem {
  filename: string;
  status: ItemStatus;
}

interface UploadButtonProps {
  albumId: number;
  onUploaded: () => void;
}

const StatusIcon = ({ status }: { status: ItemStatus }) => {
  if (status === 'uploading') return <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />;
  if (status === 'done')      return <CheckCircle2 className="size-3.5 shrink-0 text-green-500" />;
  if (status === 'error')     return <XCircle className="size-3.5 shrink-0 text-destructive" />;
  return <Circle className="size-3.5 shrink-0 text-muted-foreground/40" />;
};

const UploadButton = ({ albumId, onUploaded }: UploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [active, setActive] = useState(false);

  const done  = queue.filter((i) => i.status === 'done').length;
  const errors = queue.filter((i) => i.status === 'error').length;
  const total = queue.length;
  const allFinished = total > 0 && queue.every((i) => i.status === 'done' || i.status === 'error');
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // Auto-scroll the uploading item into view
  useEffect(() => {
    const idx = queue.findIndex((i) => i.status === 'uploading');
    if (idx === -1 || !listRef.current) return;
    const el = listRef.current.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [queue]);

  const CHUNK_SIZE = 95 * 1024 * 1024; // 95 MB — safely under the 100 MB Workers body limit

  const uploadChunked = async (file: File, takenAt: string | null): Promise<boolean> => {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const contentTypeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
      webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
      mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm',
      avi: 'video/x-msvideo', mkv: 'video/x-matroska',
    };
    const contentType = file.type || contentTypeMap[ext] || 'application/octet-stream';

    // Step 1: start multipart upload
    const startRes = await postV1<UploadStartRequest, UploadStartResponse | Toast>(
      `/albums/${albumId}/upload/start`,
      { filename: file.name, contentType, size: file.size },
    );
    if (isToast(startRes)) return false;
    const { uploadId, r2Key } = startRes;

    // Step 2: upload parts
    const parts: { partNumber: number; etag: string }[] = [];
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      try {
        const res = await fetch(
          `/api/v1/albums/${albumId}/upload/part?uploadId=${encodeURIComponent(uploadId)}&r2Key=${encodeURIComponent(r2Key)}&partNumber=${i + 1}`,
          { method: 'PUT', body: chunk },
        );
        if (!res.ok) return false;
        const part: UploadPartResponse = await res.json();
        parts.push(part);
      } catch {
        return false;
      }
    }

    // Step 3: complete
    const mediaType: 'image' | 'video' | 'file' = contentType.startsWith('video/')
      ? 'video'
      : contentType.startsWith('image/')
      ? 'image'
      : 'file';

    const confirmRes = await postV1<UploadConfirmRequest, ImageResponse | Toast>(
      `/albums/${albumId}/upload/complete`,
      { uploadId, r2Key, filename: file.name, takenAt, size: file.size, mediaType, parts },
    );
    return !isToast(confirmRes);
  };

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setActive(true);
    setQueue(fileArray.map((f) => ({ filename: f.name, status: 'pending' })));

    // Import exifr once
    const exifr = await import('exifr');

    let totalUploaded = 0;

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      // Mark current file as uploading
      setQueue((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'uploading' } : item))
      );

      // Parse EXIF (images only)
      let takenAt: string | null = null;
      if (file.type.startsWith('image/')) {
        try {
          const exif = await exifr.parse(file, ['DateTimeOriginal']);
          if (exif?.DateTimeOriginal instanceof Date) {
            takenAt = exif.DateTimeOriginal.toISOString();
          }
        } catch {
          // No EXIF — fine
        }
      }

      const ok = await uploadChunked(file, takenAt);

      setQueue((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: ok ? 'done' : 'error' } : item))
      );

      if (ok) totalUploaded++;
    }

    setActive(false);

    if (totalUploaded > 0) {
      toast.success(`${totalUploaded} файл${totalUploaded === 1 ? ' качен' : 'а качени'} успешно`);
      onUploaded();
    }
    if (errors > 0) {
      toast.error(`${errors} файла не успяха да се качат`);
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="*"
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={active}
        variant="outline"
      >
        <Upload />
        {active ? `Качване ${done} / ${total}…` : 'Добави файлове'}
      </Button>

      {queue.length > 0 && (
        <div className="w-56 rounded-lg border bg-card p-3 shadow-sm">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium">{done} / {total} качени</span>
            {allFinished && (
              <button
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setQueue([])}
              >
                Затвори
              </button>
            )}
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-3">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* File list */}
          <div ref={listRef} className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {queue.map((item, i) => (
              <div key={i} className="flex items-center gap-2 min-w-0">
                <StatusIcon status={item.status} />
                <span
                  className={`text-xs truncate ${
                    item.status === 'uploading' ? 'text-foreground font-medium' :
                    item.status === 'done'      ? 'text-muted-foreground line-through' :
                    item.status === 'error'     ? 'text-destructive' :
                    'text-muted-foreground/60'
                  }`}
                >
                  {item.filename}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadButton;
