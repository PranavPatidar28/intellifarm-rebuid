export type MarketExplorerScope = 'district' | 'state';
export type MarketExplorerView = 'crops' | 'mandis' | 'pinned';

export type MarketPinnedCrop = {
  cropKey: string;
  cropName: string;
};

export function buildMarketExplorerQueryString({
  scope,
  latitude,
  longitude,
  page,
  pageSize,
  search,
}: {
  scope: MarketExplorerScope;
  latitude?: number;
  longitude?: number;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const params = new URLSearchParams({ scope });

  if (typeof page === 'number') {
    params.set('page', String(page));
  }

  if (typeof pageSize === 'number') {
    params.set('pageSize', String(pageSize));
  }

  if (latitude != null && longitude != null) {
    params.set('latitude', String(latitude));
    params.set('longitude', String(longitude));
  }

  if (search?.trim()) {
    params.set('search', search.trim());
  }

  return params.toString();
}

export function buildCropKey(cropName: string) {
  return slugify(cropName);
}

export function buildMandiKey(
  mandiName: string,
  district: string,
  state: string,
) {
  return `${slugify(mandiName)}--${slugify(district)}--${slugify(state)}`;
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
