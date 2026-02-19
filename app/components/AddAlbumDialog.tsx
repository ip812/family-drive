import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { postV1 } from '../../http/client';
import { isToast } from '../../toasts';
import type { AlbumRequest, AlbumResponse } from '../../types/albums';

const AddAlbumDialog = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Моля въведете име на албума');
      return;
    }

    setLoading(true);
    setError('');

    const result = await postV1<AlbumRequest, AlbumResponse>('/albums', { name: trimmed });

    setLoading(false);

    if (isToast(result)) {
      setError(result.message);
      return;
    }

    setOpen(false);
    setName('');
    navigate(`/albums/${result.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setName(''); setError(''); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus />
          Нов албум
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Създай нов албум</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            <Label htmlFor="album-name">Име на албума</Label>
            <Input
              id="album-name"
              placeholder="напр. Лято 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Откажи</Button>
            </DialogClose>
            <Button type="submit" disabled={loading}>
              {loading ? 'Създаване...' : 'Създай'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAlbumDialog;
