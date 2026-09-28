import React from 'react';
import { MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { DirectoryListing } from '../../types';
import ShareButton from './ShareButton';
import { getListingTags } from './listingTags';

interface ListingCardProps {
  listing: DirectoryListing;
  selected?: boolean;
  onSelect?: (id: string) => void;
  onOpen: (slug: string) => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, selected, onSelect, onOpen }) => {
  const tags = getListingTags(listing);
  const shareUrl = `${window.location.origin}/directory/${listing.slug}`;
  const coverPhoto = listing.photos.find((p) => p.is_cover) || listing.photos[0];

  return (
    <div
      onClick={() => { onSelect?.(listing.id); onOpen(listing.slug); }}
      onMouseEnter={() => onSelect?.(listing.id)}
      className={`bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all ${selected ? 'border-saffron-400 shadow-md' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'}`}
    >
      {coverPhoto && (
        <img src={coverPhoto.url} alt={listing.name} className="w-full h-36 object-cover" loading="lazy" />
      )}
      <div className="p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
          <CheckCircle2 size={12} /> VERIFIED
        </span>
        <ShareButton url={shareUrl} title={listing.name} text={listing.city || ''} size="sm" />
      </div>

      <h3 className="text-[15px] font-bold text-[#241C17] leading-snug mb-0.5">{listing.name}</h3>
      <p className="text-xs text-gray-500 flex items-center gap-1 mb-2.5">
        <MapPin size={12} className="shrink-0" />
        {[listing.area, listing.city].filter(Boolean).join(', ') || 'Location not specified'}
      </p>

      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
        {tags.map((tag) => (
          <span key={tag.key} className="inline-flex items-center gap-1 text-[11px] font-semibold text-saffron-700 bg-saffron-50 px-2 py-0.5 rounded-full">
            {tag.icon} {tag.label}
          </span>
        ))}
      </div>

      {listing.mulnayak && (
        <p className="text-xs text-gray-500 mb-1"><span className="text-gray-400">Mulnayak:</span> {listing.mulnayak}</p>
      )}
      {listing.vihar_group_name && (
        <p className="text-xs text-gray-500 mb-1"><span className="text-gray-400">Vihar Group:</span> {listing.vihar_group_name}</p>
      )}
      {listing.captain_name && (
        <p className="text-xs text-gray-500 mb-2"><span className="text-gray-400">Captain:</span> {listing.captain_name}</p>
      )}

      {listing.routes.length > 0 && (
        <div className="bg-gray-50 rounded-xl p-2.5 mb-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Vihar Routes</p>
          <div className="space-y-0.5">
            {listing.routes.slice(0, 3).map((r, i) => (
              <p key={i} className="text-xs font-semibold text-[#241C17] flex items-center gap-1">
                {r.from.toUpperCase()} <ArrowRight size={11} className="text-saffron-500 shrink-0" /> {r.to.toUpperCase()}
              </p>
            ))}
            {listing.routes.length > 3 && (
              <p className="text-[11px] text-gray-400">+{listing.routes.length - 3} more</p>
            )}
          </div>
        </div>
      )}

      <button className="w-full text-center text-sm font-bold text-saffron-700 hover:text-saffron-800 py-1.5">
        View Details →
      </button>
      </div>
    </div>
  );
};

export default ListingCard;
