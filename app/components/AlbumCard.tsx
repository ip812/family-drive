import { Link } from 'react-router';
import { ImageIcon } from 'lucide-react';
import { Card, CardContent, CardFooter } from '~/components/ui/card';
import type { AlbumResponse } from '../../types/albums';

interface AlbumCardProps {
  album: AlbumResponse;
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('bg-BG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const AlbumCard = ({ album }: AlbumCardProps) => {
  return (
    <Link to={`/albums/${album.id}`} className="group block">
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
  );
};

export default AlbumCard;
