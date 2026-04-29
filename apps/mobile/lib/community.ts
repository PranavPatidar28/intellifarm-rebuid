import type {
  CommunityCategoryType,
  CommunityFeedScopeType,
  CommunityPost,
  CommunityReportReasonType,
} from '@/lib/api-types';

export type CommunityAuthor = CommunityPost['author'];

export const communityScopeOptions = [
  { value: 'FOR_YOU', label: 'For You' },
  { value: 'NEARBY', label: 'Nearby' },
  { value: 'TRENDING', label: 'Trending' },
  { value: 'SAVED', label: 'Saved' },
  { value: 'MY_POSTS', label: 'My Posts' },
] satisfies Array<{ value: CommunityFeedScopeType; label: string }>;

export const communityCategoryOptions = [
  { value: 'ALL', label: 'All' },
  { value: 'QUESTION', label: 'Questions' },
  { value: 'PEST_DISEASE', label: 'Pest & disease' },
  { value: 'WATER', label: 'Water' },
  { value: 'NUTRITION', label: 'Nutrition' },
  { value: 'MARKET', label: 'Market' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'WARNING', label: 'Warning' },
] as const;

export const communityPostCategoryOptions = communityCategoryOptions.filter(
  (option) => option.value !== 'ALL',
) as Array<{ value: CommunityCategoryType; label: string }>;

export const communityReportReasonOptions = [
  { value: 'MISLEADING', label: 'Misleading' },
  { value: 'ABUSIVE', label: 'Abusive' },
  { value: 'UNSAFE', label: 'Unsafe advice' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'OTHER', label: 'Other' },
] satisfies Array<{ value: CommunityReportReasonType; label: string }>;

export type CommunityCategoryFilter = (typeof communityCategoryOptions)[number]['value'];

export type CommunityComposerDraft = {
  category: CommunityCategoryType;
  title: string;
  body: string;
  cropSeasonId: string | null;
};

export const emptyCommunityComposerDraft: CommunityComposerDraft = {
  category: 'QUESTION',
  title: '',
  body: '',
  cropSeasonId: null,
};

export function buildCommunityFeedPath({
  scope,
  category,
  query,
}: {
  scope?: CommunityFeedScopeType;
  category?: CommunityCategoryFilter;
  query?: string;
}) {
  const params = new URLSearchParams();

  if (scope) {
    params.set('scope', scope);
  }

  if (category && category !== 'ALL') {
    params.set('category', category);
  }

  if (query?.trim()) {
    params.set('query', query.trim());
  }

  const suffix = params.toString();
  return `/community/feed${suffix ? `?${suffix}` : ''}`;
}

export function buildImagePart(uri: string) {
  const extension = uri.split('.').pop()?.split('?')[0]?.toLowerCase() ?? 'jpg';

  return {
    uri,
    name: `community-photo.${extension}`,
    type: extension === 'png' ? 'image/png' : 'image/jpeg',
  } as unknown as Blob;
}

export function formatCommunityCategoryLabel(category: CommunityCategoryType) {
  return (
    communityPostCategoryOptions.find((option) => option.value === category)?.label ?? 'Discussion'
  );
}

export function formatCommunityLocation(author: CommunityAuthor) {
  const parts = [author.village, author.district, author.state].filter(Boolean);
  return parts.length ? parts.slice(0, 2).join(', ') : 'Local farmer';
}

export function formatCommunityContextLabel(post: Pick<CommunityPost, 'cropName' | 'currentStage'>) {
  if (post.cropName && post.currentStage) {
    return `${post.cropName} - ${post.currentStage}`;
  }

  if (post.cropName) {
    return post.cropName;
  }

  if (post.currentStage) {
    return post.currentStage;
  }

  return 'General discussion';
}
