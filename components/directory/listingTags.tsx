import React from 'react';
import { Landmark, Home, Utensils, BookOpen, Users } from 'lucide-react';
import { DirectoryCardFields } from '../../types';

export interface ListingTag {
  key: string;
  label: string;
  icon: React.ReactNode;
}

// What a listing "is" — derived from which fields are actually filled in,
// not a single category picked once. A card can carry several of these at
// once (e.g. a temple that also has an Upashray and a Vihar Group).
export const getListingTags = (listing: Pick<DirectoryCardFields, 'mulnayak' | 'vihar_group_name' | 'upashray' | 'bhojanshala' | 'library'>): ListingTag[] => {
  const tags: ListingTag[] = [];
  if (listing.mulnayak) tags.push({ key: 'temple', label: 'Temple', icon: <Landmark size={13} /> });
  if (listing.vihar_group_name) tags.push({ key: 'vihar_group', label: 'Vihar Group', icon: <Users size={13} /> });
  if (listing.upashray) tags.push({ key: 'upashray', label: 'Upashray', icon: <Home size={13} /> });
  if (listing.bhojanshala) tags.push({ key: 'bhojanshala', label: 'Bhojanshala', icon: <Utensils size={13} /> });
  if (listing.library) tags.push({ key: 'library', label: 'Library', icon: <BookOpen size={13} /> });
  return tags;
};
