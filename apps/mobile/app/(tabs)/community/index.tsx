import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Text, TextInput, View, useWindowDimensions } from 'react-native';

import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react-native';

import { CommunityPostCard } from '@/components/community-post-card';
import { Button } from '@/components/button';
import { InsetCard } from '@/components/inset-card';
import { LoadingScreen } from '@/components/loading-screen';
import { MotionPressable } from '@/components/motion-pressable';
import { MotionSection } from '@/components/motion-section';
import { PageListShell } from '@/components/page-list-shell';
import { ProfileStatusCard } from '@/components/profile-status-card';
import { SelectField } from '@/components/select-field';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { mergePostIntoCommunityCaches } from '@/lib/community-cache';
import type {
  CommunityFeedResponse,
  CommunityFeedScopeType,
  CommunityPostSummaryResponse,
} from '@/lib/api-types';
import {
  buildCommunityFeedPath,
  communityCategoryOptions,
  communityScopeOptions,
  type CommunityCategoryFilter,
} from '@/lib/community';
import { storageKeys } from '@/lib/constants';
import { storage, useStoredValue } from '@/lib/storage';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type StatusMessage = {
  tone: 'success' | 'warning';
  text: string;
} | null;

export default function CommunityRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const { token } = useSession();
  const [selectedScope, setSelectedScope] = useState<CommunityFeedScopeType | null>(null);
  const [selectedCategory, setSelectedCategory] =
    useState<CommunityCategoryFilter>('ALL');
  const [search, setSearch] = useState('');
  const [openFilter, setOpenFilter] = useState<'scope' | 'category' | null>(null);
  const [likeBusyPostId, setLikeBusyPostId] = useState<string | null>(null);
  const [saveBusyPostId, setSaveBusyPostId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);
  const [notice] = useStoredValue<string | null>(storageKeys.communityNotice, null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);

  useEffect(() => {
    if (!notice) {
      return;
    }

    setStatusMessage({ tone: 'success', text: notice });
    storage.remove(storageKeys.communityNotice);
  }, [notice]);

  const feedPath = useMemo(
    () =>
      buildCommunityFeedPath({
        scope: selectedScope ?? undefined,
        category: selectedCategory,
        query: deferredSearch,
      }),
    [deferredSearch, selectedCategory, selectedScope],
  );

  const feedQuery = useCachedQuery({
    cacheKey: `community-feed:${selectedScope ?? 'auto'}:${selectedCategory}:${deferredSearch.trim() || 'default'}`,
    queryKey: ['community-feed', token, selectedScope, selectedCategory, deferredSearch],
    enabled: Boolean(token),
    queryFn: () => apiGet<CommunityFeedResponse>(feedPath, token),
    placeholderData: (previous) => previous,
  });

  const activeScope = selectedScope ?? feedQuery.data?.scope ?? 'FOR_YOU';
  const posts = feedQuery.data?.posts ?? [];
  const stackedFilters = width < 390;
  const hasSearch = Boolean(deferredSearch.trim());
  const hasCategoryFilter = selectedCategory !== 'ALL';
  const hasScopeFilter = selectedScope != null;
  const hasActiveFilters = hasSearch || hasCategoryFilter || hasScopeFilter;

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedScope(null);
    setOpenFilter(null);
    if (statusMessage) {
      setStatusMessage(null);
    }
  };

  const togglePostAction = async (postId: string, action: 'like' | 'save') => {
    if (!token) {
      return;
    }

    const setBusy = action === 'like' ? setLikeBusyPostId : setSaveBusyPostId;
    setBusy(postId);
    setStatusMessage(null);

    try {
      const response = await apiPost<CommunityPostSummaryResponse>(
        `/community/posts/${postId}/${action}`,
        {},
        token,
      );
      mergePostIntoCommunityCaches(queryClient, response.post);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['community-post'] }),
      ]);
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError
            ? error.message
            : `Could not ${action} this post right now.`,
      });
    } finally {
      setBusy(null);
    }
  };

  if (feedQuery.isLoading && !feedQuery.data) {
    return <LoadingScreen label="Loading community" />;
  }

  const emptyState = resolveEmptyState({
    activeScope,
    hasSearch,
    hasCategoryFilter,
  });
  const renderPost = useCallback(
    ({ item: post }: { item: CommunityFeedResponse['posts'][number] }) => (
      <CommunityPostCard
        post={post}
        likeBusy={likeBusyPostId === post.id}
        saveBusy={saveBusyPostId === post.id}
        onPress={() =>
          router.push({
            pathname: '/community/post/[id]',
            params: { id: post.id },
          } as never)
        }
        onLike={() => {
          void togglePostAction(post.id, 'like');
        }}
        onReply={() =>
          router.push({
            pathname: '/community/post/[id]',
            params: { id: post.id },
          } as never)
        }
        onSave={() => {
          void togglePostAction(post.id, 'save');
        }}
      />
    ),
    [likeBusyPostId, router, saveBusyPostId],
  );

  return (
    <PageListShell
      title="Community"
      action={
        <MotionPressable
          onPress={() => router.push('/community/new')}
          contentStyle={{
            minHeight: 36,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: spacing.sm,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: palette.leaf,
            backgroundColor: palette.leafMist,
          }}
        >
          <Plus color={palette.leafDark} size={15} />
          <Text
            style={{
              color: palette.leafDark,
              fontFamily: typography.bodyStrong,
              fontSize: 12,
            }}
          >
            New
          </Text>
        </MotionPressable>
      }
      data={posts}
      keyExtractor={(post) => post.id}
      renderItem={renderPost}
      headerContent={
        <>
          {statusMessage ? (
            <MotionSection>
              <ProfileStatusCard
                message={statusMessage.text}
                tone={statusMessage.tone}
              />
            </MotionSection>
          ) : null}

          <MotionSection delay={40}>
            <View style={{ gap: spacing.sm }}>
              <View
                style={{
                  minHeight: 50,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingHorizontal: spacing.md,
                  borderRadius: radii.xl,
                  borderCurve: 'continuous',
                  borderWidth: 1,
                  borderColor: palette.outline,
                  backgroundColor: palette.white,
                }}
              >
                <Search color={palette.inkMuted} size={18} />
                <TextInput
                  value={search}
                  placeholder="Search posts"
                  placeholderTextColor={palette.inkMuted}
                  onChangeText={(value) => {
                    setSearch(value);
                    if (statusMessage) {
                      setStatusMessage(null);
                    }
                  }}
                  style={{
                    flex: 1,
                    color: palette.ink,
                    fontFamily: typography.bodyRegular,
                    fontSize: 14,
                  }}
                />
                {search.trim() ? (
                  <MotionPressable onPress={() => setSearch('')} hitSlop={8}>
                    <X color={palette.inkMuted} size={16} />
                  </MotionPressable>
                ) : null}
              </View>

              <View
                style={{
                  flexDirection: stackedFilters ? 'column' : 'row',
                  alignItems: 'flex-start',
                  gap: spacing.sm,
                  zIndex: openFilter ? 50 : 1,
                }}
              >
                <View
                  style={{
                    ...(stackedFilters ? {} : { flex: 1 }),
                    zIndex: openFilter === 'scope' ? 60 : 1,
                  }}
                >
                  <SelectField
                    label="Feed"
                    value={activeScope}
                    options={communityScopeOptions}
                    open={openFilter === 'scope'}
                    onOpenChange={(open) => setOpenFilter(open ? 'scope' : null)}
                    onChange={(value) => {
                      startTransition(() => {
                        setSelectedScope(value);
                      });
                    }}
                  />
                </View>

                <View
                  style={{
                    ...(stackedFilters ? {} : { flex: 1 }),
                    zIndex: openFilter === 'category' ? 55 : 1,
                  }}
                >
                  <SelectField
                    label="Category"
                    value={selectedCategory}
                    options={communityCategoryOptions}
                    open={openFilter === 'category'}
                    onOpenChange={(open) => setOpenFilter(open ? 'category' : null)}
                    onChange={(value) => {
                      startTransition(() => {
                        setSelectedCategory(value);
                      });
                    }}
                  />
                </View>
              </View>
            </View>
          </MotionSection>
        </>
      }
      emptyContent={
        <MotionSection>
          <InsetCard padding={18}>
            <View style={{ gap: spacing.md, alignItems: 'flex-start' }}>
              <View style={{ gap: 4 }}>
                <Text
                  style={{
                    color: palette.ink,
                    fontFamily: typography.bodyStrong,
                    fontSize: 17,
                  }}
                >
                  {emptyState.title}
                </Text>
                <Text
                  style={{
                    color: palette.inkSoft,
                    fontFamily: typography.bodyRegular,
                    fontSize: 12,
                    lineHeight: 18,
                  }}
                >
                  {emptyState.description}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {hasActiveFilters ? (
                  <Button
                    label={activeScope === 'SAVED' ? 'Browse feed' : 'Clear filters'}
                    fullWidth={false}
                    variant="soft"
                    onPress={clearFilters}
                  />
                ) : null}
                <Button
                  label={emptyState.ctaLabel}
                  fullWidth={false}
                  onPress={() => router.push('/community/new')}
                />
              </View>
            </View>
          </InsetCard>
        </MotionSection>
      }
      listProps={{
        removeClippedSubviews: false,
      }}
    />
  );
}

function resolveEmptyState({
  activeScope,
  hasSearch,
  hasCategoryFilter,
}: {
  activeScope: CommunityFeedScopeType;
  hasSearch: boolean;
  hasCategoryFilter: boolean;
}) {
  if (activeScope === 'SAVED') {
    return {
      title: 'No saved posts yet',
      description: 'Save useful discussions and they will stay easy to find here.',
      ctaLabel: 'Create post',
    };
  }

  if (activeScope === 'MY_POSTS') {
    return {
      title: 'No posts from you yet',
      description: 'Ask one clear question or share one field update to start your thread.',
      ctaLabel: 'Create post',
    };
  }

  if (hasSearch || hasCategoryFilter) {
    return {
      title: 'No matching posts',
      description: 'Try a broader search or switch the category to see more discussions.',
      ctaLabel: 'Create post',
    };
  }

  return {
    title: 'No posts yet',
    description: 'Start the first useful conversation for farmers in your area.',
    ctaLabel: 'Create post',
  };
}
