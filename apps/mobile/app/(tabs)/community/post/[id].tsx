import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Flag, LifeBuoy, MessageSquareMore, Sprout } from 'lucide-react-native';

import { Button } from '@/components/button';
import { CommunityPostCard } from '@/components/community-post-card';
import { CommunityReplyCard } from '@/components/community-reply-card';
import { LoadingScreen } from '@/components/loading-screen';
import { PageShell } from '@/components/page-shell';
import { ProfileStatusCard } from '@/components/profile-status-card';
import { RichEmptyState } from '@/components/rich-empty-state';
import { SectionTitle } from '@/components/section-title';
import { SunriseCard } from '@/components/sunrise-card';
import { TextField } from '@/components/text-field';
import { useSession } from '@/features/session/session-provider';
import { useCachedQuery } from '@/hooks/use-cached-query';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { apiGet, apiPost, ApiError } from '@/lib/api';
import { mergePostIntoCommunityCaches } from '@/lib/community-cache';
import type {
  CommunityPostResponse,
  CommunityReplyResponse,
  CommunityPostSummaryResponse,
} from '@/lib/api-types';
import {
  formatCommunityCategoryLabel,
  formatCommunityContextLabel,
} from '@/lib/community';
import { storageKeys } from '@/lib/constants';
import { storage, useStoredValue } from '@/lib/storage';
import { palette, spacing, typography } from '@/theme/tokens';

type StatusMessage = {
  tone: 'success' | 'warning';
  text: string;
} | null;

export default function CommunityPostDetailRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const network = useNetworkStatus();
  const params = useLocalSearchParams<{ id: string }>();
  const { token } = useSession();
  const [replyBody, setReplyBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [notice] = useStoredValue<string | null>(storageKeys.communityNotice, null);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);
  const postId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!notice) {
      return;
    }

    setStatusMessage({ tone: 'success', text: notice });
    storage.remove(storageKeys.communityNotice);
  }, [notice]);

  const postQuery = useCachedQuery({
    cacheKey: `community-post:${postId}`,
    queryKey: ['community-post', token, postId],
    enabled: Boolean(token && postId),
    queryFn: () => apiGet<CommunityPostResponse>(`/community/posts/${postId}`, token),
    placeholderData: (previous) => previous,
  });

  const post = postQuery.data?.post ?? null;
  const trimmedReply = replyBody.trim();
  const replyError =
    replyBody.length > 0 && trimmedReply.length < 2 ? 'Add at least 2 characters.' : null;

  const togglePostAction = async (action: 'like' | 'save') => {
    if (!token || !postId) {
      return;
    }

    const setBusyState = action === 'like' ? setLikeBusy : setSaveBusy;
    setBusyState(true);
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
      setBusyState(false);
    }
  };

  const submitReply = async () => {
    if (!token || !postId) {
      return;
    }

    if (network.isOffline) {
      setStatusMessage({
        tone: 'warning',
        text: 'Replying needs an active internet connection.',
      });
      return;
    }

    if (trimmedReply.length < 2) {
      setStatusMessage({
        tone: 'warning',
        text: 'Add a little more detail before posting the reply.',
      });
      return;
    }

    setBusy(true);
    setStatusMessage(null);

    try {
      await apiPost<CommunityReplyResponse>(
        `/community/posts/${postId}/replies`,
        { body: trimmedReply },
        token,
      );
      setReplyBody('');
      setStatusMessage({ tone: 'success', text: 'Reply posted to the discussion.' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['community-post', token, postId] }),
        queryClient.invalidateQueries({ queryKey: ['community-feed'] }),
        queryClient.invalidateQueries({ queryKey: ['alerts', token] }),
      ]);
    } catch (error) {
      setStatusMessage({
        tone: 'warning',
        text:
          error instanceof ApiError
            ? error.message
            : 'Could not send the reply right now.',
      });
    } finally {
      setBusy(false);
    }
  };

  if (postQuery.isLoading && !post) {
    return <LoadingScreen label="Loading discussion" />;
  }

  if (!post) {
    return (
      <PageShell
        eyebrow="Community"
        title="Discussion unavailable"
        subtitle="This post may have been removed or is not reachable right now."
      >
        <RichEmptyState
          title="Post not found"
          description="Go back to the community feed and open another discussion."
          icon={<MessageSquareMore color={palette.leafDark} size={18} />}
        />
        <Button
          label="Back to community"
          onPress={() => router.replace('/community' as never)}
        />
      </PageShell>
    );
  }

  const needsEscalation =
    post.category === 'PEST_DISEASE' || post.category === 'WARNING';

  return (
    <>
      <Stack.Screen options={{ title: post.title }} />
      <PageShell
        eyebrow="Community thread"
        title="Discussion"
        subtitle={`${formatCommunityCategoryLabel(post.category)}${post.cropName || post.currentStage ? ` - ${formatCommunityContextLabel(post)}` : ''}`}
      >
        {statusMessage ? (
          <ProfileStatusCard
            message={statusMessage.text}
            tone={statusMessage.tone}
          />
        ) : null}

        <CommunityPostCard
          post={post}
          detail
          likeBusy={likeBusy}
          saveBusy={saveBusy}
          onLike={() => {
            void togglePostAction('like');
          }}
          onSave={() => {
            void togglePostAction('save');
          }}
          footer={
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {post.cropSeasonId ? (
                <Button
                  label="View crop context"
                  fullWidth={false}
                  variant="soft"
                  icon={<Sprout color={palette.leafDark} size={15} />}
                  onPress={() =>
                    router.push({
                      pathname: '/season/[id]',
                      params: { id: post.cropSeasonId! },
                    } as never)
                  }
                />
              ) : null}
              <Button
                label="Report post"
                fullWidth={false}
                variant="ghost"
                icon={<Flag color={palette.leafDark} size={15} />}
                onPress={() =>
                  router.push({
                    pathname: '/community/report',
                    params: { targetType: 'POST', targetId: post.id },
                  } as never)
                }
              />
            </View>
          }
        />

        {needsEscalation ? (
          <SunriseCard accent="warning" title="Need faster help?">
            <View style={{ gap: spacing.sm }}>
              <Text
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                This issue may need expert support sooner than peer replies.
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                <Button
                  label="Expert help"
                  fullWidth={false}
                  icon={<LifeBuoy color={palette.white} size={15} />}
                  onPress={() => router.push('/expert-help')}
                />
                <Button
                  label="Open Assistant"
                  fullWidth={false}
                  variant="soft"
                  onPress={() =>
                    router.push({
                      pathname: '/voice',
                      params: {
                        prompt: `Summarize this community issue and tell me what a farmer should verify next: ${post.title}`,
                        originRoute: 'community',
                        focusCropSeasonId: post.cropSeasonId ?? undefined,
                      },
                    } as never)
                  }
                />
              </View>
            </View>
          </SunriseCard>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <SectionTitle title={`Replies (${post.replies.length})`} />
          {post.replies.length ? (
            <View style={{ gap: spacing.sm }}>
              {post.replies.map((reply) => (
                <CommunityReplyCard
                  key={reply.id}
                  reply={reply}
                  onReport={() =>
                    router.push({
                      pathname: '/community/report',
                      params: { targetType: 'REPLY', targetId: reply.id },
                    } as never)
                  }
                />
              ))}
            </View>
          ) : (
            <RichEmptyState
              title="No replies yet"
              description="Be the first farmer to add a practical suggestion or a follow-up question."
            />
          )}
        </View>

        <SunriseCard
          accent={post.locked ? 'warning' : 'brand'}
          title={post.locked ? 'This thread is locked' : 'Reply'}
        >
          <View style={{ gap: spacing.md }}>
            <TextField
              label="Reply"
              value={replyBody}
              error={replyError}
              placeholder={
                post.locked
                  ? 'This discussion is locked by moderation.'
                  : 'Share what you have seen, tried, or recommend next.'
              }
              multiline
              onChangeText={(value) => {
                setReplyBody(value);
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
            />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              <Button
                label={busy ? 'Posting reply...' : 'Reply'}
                loading={busy}
                disabled={post.locked || trimmedReply.length < 2}
                onPress={() => {
                  void submitReply();
                }}
              />
            </View>
          </View>
        </SunriseCard>
      </PageShell>
    </>
  );
}
