import { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, CheckCircle2, XCircle, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { uploadV1 } from '../../http/client';
import { isToast } from '../../toasts';
import type { ImageResponse } from '../../types/images';

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

      // Parse EXIF
      let takenAt: string | null = null;
      try {
        const exif = await exifr.parse(file, ['DateTimeOriginal']);
        if (exif?.DateTimeOriginal instanceof Date) {
          takenAt = exif.DateTimeOriginal.toISOString();
        }
      } catch {
        // No EXIF — fine
      }

      // Upload single file
      const formData = new FormData();
      formData.append('files', file);
      formData.append('metadata', JSON.stringify([{ filename: file.name, takenAt }]));

      const result = await uploadV1<ImageResponse[]>(`/albums/${albumId}/images`, formData);

      setQueue((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: isToast(result) ? 'error' : 'done' } : item
        )
      );

      if (!isToast(result)) totalUploaded++;
    }

    setActive(false);

    if (totalUploaded > 0) {
      toast.success(`${totalUploaded} снимк${totalUploaded === 1 ? 'а качена' : 'и качени'} успешно`);
      onUploaded();
    }
    if (errors > 0) {
      toast.error(`${errors} снимки не успяха да се качат`);
    }

    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); }}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={active}
        variant="outline"
      >
        <Upload />
        {active ? `Качване ${done} / ${total}…` : 'Добави снимки'}
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
