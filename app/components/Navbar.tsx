import { Link } from 'react-router';
import AddAlbumDialog from './AddAlbumDialog';

const Navbar = () => {
  return (
    <nav className="w-full border-b bg-white shadow-sm sticky top-0 z-50">
      <div className="relative mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center">
        <AddAlbumDialog />
        <Link to="/" className="absolute left-1/2 -translate-x-1/2">
          <img src="/logo.png" alt="Семеен архив" className="h-20 w-auto" />
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
