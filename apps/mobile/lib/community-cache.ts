import type { QueryClient } from '@tanstack/react-query';

import type {
  CommunityFeedResponse,
  CommunityPost,
  CommunityPostResponse,
} from '@/lib/api-types';

export function mergePostIntoCommunityCaches(
  queryClient: QueryClient,
  nextPost: CommunityPost,
) {
  queryClient.setQueriesData<CommunityFeedResponse>(
    { queryKey: ['community-feed'] },
    (current) => {
      if (!current) {
        return current;
      }

      const posts =
        current.scope === 'SAVED' && !nextPost.viewerHasSaved
          ? current.posts.filter((post) => post.id !== nextPost.id)
          : current.posts.map((post) => (post.id === nextPost.id ? nextPost : post));

      return {
        ...current,
        posts,
      };
    },
  );

  queryClient.setQueriesData<CommunityPostResponse>(
    { queryKey: ['community-post'] },
    (current) => {
      if (!current || current.post.id !== nextPost.id) {
        return current;
      }

      return {
        ...current,
        post: {
          ...current.post,
          ...nextPost,
        },
      };
    },
  );
}
