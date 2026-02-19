import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { uploadV1 } from '../../http/client';
import { isToast } from '../../toasts';
import type { ImageResponse } from '../../types/images';

interface UploadButtonProps {
  albumId: number;
  onUploaded: () => void;
}

const UploadButton = ({ albumId, onUploaded }: UploadButtonProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFiles = async (files: FileList) => {
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    const formData = new FormData();
    const metadataList: Array<{ filename: string; takenAt: string | null }> = [];

    for (const file of Array.from(files)) {
      formData.append('files', file);

      let takenAt: string | null = null;
      try {
        const exifr = await import('exifr');
        const exif = await exifr.parse(file, ['DateTimeOriginal']);
        if (exif?.DateTimeOriginal instanceof Date) {
          takenAt = exif.DateTimeOriginal.toISOString();
        }
      } catch {
        // EXIF not available for this file — that's fine
      }

      metadataList.push({ filename: file.name, takenAt });
    }

    formData.append('metadata', JSON.stringify(metadataList));

    const result = await uploadV1<ImageResponse[]>(`/albums/${albumId}/images`, formData);

    setUploading(false);

    if (isToast(result)) {
      setError(result.message);
      return;
    }

    if (inputRef.current) inputRef.current.value = '';
    onUploaded();
  };

  return (
    <div className="flex flex-col items-start gap-1">
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
        {uploading ? 'Качване...' : 'Добави снимки'}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export default UploadButton;
