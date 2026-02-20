import { useState } from 'react';
import { Link } from 'react-router';
import { ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
import ConfirmDialog from '~/components/ConfirmDialog';
import { deleteV1 } from '../../http/client';
import { isToast, isSuccess } from '../../toasts';
import type { AlbumResponse } from '../../types/albums';
import type { Toast } from '../../toasts';

interface AlbumCardProps {
  album: AlbumResponse;
  onDelete?: () => void;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const AlbumCard = ({ album, onDelete }: AlbumCardProps) => {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteV1<Toast>(`/albums/${album.id}`);
    setDeleting(false);

    if (!isToast(result) || !isSuccess(result)) {
      toast.error(isToast(result) ? result.message : 'Грешка при изтриване');
      return;
    }

    setConfirmOpen(false);
    toast.success('Албумът е изтрит');
    onDelete?.();
  };

  return (
    <div className="group relative">
      <Link to={`/albums/${album.id}`} className="block">
        <Card className="gap-0 py-0 overflow-hidden transition-shadow hover:shadow-md">
          <div className="aspect-square w-full overflow-hidden bg-muted">
            {album.coverKey ? (
              <img
                src={`/api/v1/images/${album.coverKey}`}
                alt={album.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon className="size-16 opacity-30" />
              </div>
            )}
          </div>
          <CardContent className="pt-4 pb-1">
            <p className="font-semibold truncate">{album.name}</p>
          </CardContent>
          <CardFooter className="pb-4 text-sm text-muted-foreground gap-2">
            <span>{album.imageCount} {album.imageCount === 1 ? 'снимка' : 'снимки'}</span>
            <span>·</span>
            <span>{formatDate(album.createdAt)}</span>
          </CardFooter>
        </Card>
      </Link>

      <button
        className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all"
        onClick={() => setConfirmOpen(true)}
        title="Изтрий албума"
      >
        <Trash2 className="size-4" />
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Изтрий албума"
        description={`Сигурни ли сте, че искате да изтриете „${album.name}"? Всички снимки ще бъдат изтрити безвъзвратно.`}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
};

export default AlbumCard;
