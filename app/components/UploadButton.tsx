import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '~/components/ui/button';
import { uploadV1 } from '../../http/client';
import { isToast } from '../../toasts';
import type { ImageResponse } from '../../types/images';

const BATCH_SIZE = 10;

interface UploadButtonProps {
  albumId: number;
  onUploaded: () => void;
}

const UploadButton = ({ albumId, onUploaded }: UploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const handleFiles = async (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    setProgress({ done: 0, total: fileArray.length });

    // Parse EXIF for all files in parallel
    const exifr = await import('exifr');
    const metadataList = await Promise.all(
      fileArray.map(async (file) => {
        let takenAt: string | null = null;
        try {
          const exif = await exifr.parse(file, ['DateTimeOriginal']);
          if (exif?.DateTimeOriginal instanceof Date) {
            takenAt = exif.DateTimeOriginal.toISOString();
          }
        } catch {
          // EXIF not available — fine
        }
        return { filename: file.name, takenAt };
      })
    );

    let totalUploaded = 0;

    for (let i = 0; i < fileArray.length; i += BATCH_SIZE) {
      const batchFiles = fileArray.slice(i, i + BATCH_SIZE);
      const batchMeta = metadataList.slice(i, i + BATCH_SIZE);

      const formData = new FormData();
      batchFiles.forEach((f) => formData.append('files', f));
      formData.append('metadata', JSON.stringify(batchMeta));

      const result = await uploadV1<ImageResponse[]>(`/albums/${albumId}/images`, formData);

      if (isToast(result)) {
        toast.error(result.message);
        setUploading(false);
        if (inputRef.current) inputRef.current.value = '';
        return;
      }

      totalUploaded += result.length;
      setProgress({ done: totalUploaded, total: fileArray.length });
    }

    setUploading(false);
    toast.success(`${totalUploaded} снимк${totalUploaded === 1 ? 'а качена' : 'и качени'} успешно`);
    if (inputRef.current) inputRef.current.value = '';
    onUploaded();
  };

  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

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
        disabled={uploading}
        variant="outline"
      >
        <Upload />
        {uploading ? `Качване ${progress.done} / ${progress.total}` : 'Добави снимки'}
      </Button>

      {uploading && (
        <div className="w-44">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{pct}%</p>
        </div>
      )}
    </div>
  );
};

export default UploadButton;
