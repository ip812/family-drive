import { Link } from 'react-router';
import AddAlbumDialog from './AddAlbumDialog';

interface NavbarProps {
  onAlbumCreated?: () => void;
}

const Navbar = ({ onAlbumCreated }: NavbarProps) => {
  return (
    <nav className="w-full border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center gap-4">
        <AddAlbumDialog onCreated={onAlbumCreated} />
        <Link to="/" className="text-xl font-bold text-primary">
          Семеен архив
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
