// Place aliases: a short form a group gives a long place name ("SP" for "SHREE PARSHWANATH ROAD"), stored in
// public.place_aliases and loaded with dataService.getPlaceAliases. Pickers show the alias next to the name and
// match a search against either.

export type PlaceAliases = Record<string, string>;

// Options for ThemedSelect: the full name stays the value, the alias is shown as a hint and searched too
export const placeOptions = (places: string[], aliases: PlaceAliases) =>
  places.map(p => ({ value: p, label: p, hint: aliases[p] || undefined }));

// Does a place match a search, by its name or its alias?
export const placeMatches = (place: string | null | undefined, aliases: PlaceAliases, query: string) => {
  const q = query.trim().toLowerCase();
  if (!q || !place) return !q;
  return place.toLowerCase().includes(q) || (aliases[place] || '').toLowerCase().includes(q);
};
