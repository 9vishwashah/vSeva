import React, { useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import DirectoryListingForm from '../components/directory/DirectoryListingForm';
import { BRAND } from '@brand';

interface AddDirectoryListingProps {
  onNavigate: (path: string) => void;
}

const AddDirectoryListing: React.FC<AddDirectoryListingProps> = ({ onNavigate }) => {
  useEffect(() => {
    document.title = `Add a Listing — ${BRAND.directoryName}`;
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-10">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => onNavigate('/directory')} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800">
            <ChevronLeft size={18} /> Directory
          </button>
          <img src={BRAND.logo} alt={BRAND.name} className="h-7 w-7 object-contain opacity-80" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5">
        <h1 className="text-xl font-serif font-bold text-[#241C17] mb-1">Add a Listing</h1>
        <p className="text-sm text-gray-500 mb-5">No login needed — fill in what you know, submit, and our team will review it before it goes public.</p>
        <DirectoryListingForm mode="add" onSubmitted={() => onNavigate('/directory')} onCancel={() => onNavigate('/directory')} />
      </div>
    </div>
  );
};

export default AddDirectoryListing;
