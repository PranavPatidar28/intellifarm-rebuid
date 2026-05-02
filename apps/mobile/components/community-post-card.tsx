import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Image } from 'expo-image';
import { Bookmark, Heart, Lock, MessageCircle, Sprout } from 'lucide-react-native';

import { FarmerAvatar } from '@/components/farmer-avatar';
import { InsetCard } from '@/components/inset-card';
import { MotionPressable } from '@/components/motion-pressable';
import type { CommunityPost } from '@/lib/api-types';
import { formatRelativeTime } from '@/lib/format';
import {
  formatCommunityCategoryLabel,
  formatCommunityContextLabel,
  formatCommunityLocation,
} from '@/lib/community';
import { palette, radii, spacing, typography } from '@/theme/tokens';

type CommunityPostCardProps = {
  post: CommunityPost;
  onPress?: () => void;
  onLike?: () => void;
  onReply?: () => void;
  onSave?: () => void;
  likeBusy?: boolean;
  saveBusy?: boolean;
  footer?: ReactNode;
  detail?: boolean;
};

export function CommunityPostCard({
  post,
  onPress,
  onLike,
  onReply,
  onSave,
  likeBusy = false,
  saveBusy = false,
  footer,
  detail = false,
}: CommunityPostCardProps) {
  const hasActions = Boolean(onLike || onReply || onSave);
  const contentPaddingBottom = hasActions || footer ? spacing.sm : spacing.md;
  const content = (
    <View
      style={{
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: post.imageUrl ? spacing.sm : spacing.md,
        paddingBottom: contentPaddingBottom,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: spacing.xs,
            flex: 1,
          }}
        >
          <CategoryPill category={post.category} />
          {post.locked ? (
            <TinyMetaLabel
              label="Locked"
              icon={<Lock color={palette.mustard} size={12} />}
              tone="mustard"
            />
          ) : null}
          {post.viewerHasSaved ? (
            <TinyMetaLabel
              label="Saved"
              icon={<Bookmark color={palette.leafDark} size={12} />}
              tone="leaf"
            />
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyRegular,
              fontSize: 11,
            }}
          >
            {formatRelativeTime(post.createdAt)}
          </Text>
          <TinyMetaLabel
            label={post.replyCount > 0 ? `${post.replyCount}` : '0'}
            icon={<MessageCircle color={palette.sky} size={12} />}
            tone="sky"
          />
        </View>
      </View>

      {post.cropName || post.currentStage ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Sprout color={palette.leafDark} size={14} />
          <Text
            style={{
              color: palette.leafDark,
              fontFamily: typography.bodyStrong,
              fontSize: 12,
            }}
          >
            {formatCommunityContextLabel(post)}
          </Text>
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Text
          style={{
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: detail ? 18 : 15,
            lineHeight: detail ? 24 : 21,
          }}
        >
          {post.title}
        </Text>
        <Text
          numberOfLines={detail ? undefined : 3}
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {post.body}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <FarmerAvatar
          name={post.author.firstName}
          profilePhotoUrl={post.author.profilePhotoUrl}
          size={34}
          backgroundColor={palette.leafMist}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: palette.ink,
              fontFamily: typography.bodyStrong,
              fontSize: 12,
            }}
          >
            {post.author.firstName}
          </Text>
          <Text
            style={{
              color: palette.inkMuted,
              fontFamily: typography.bodyRegular,
              fontSize: 11,
            }}
          >
            {formatCommunityLocation(post.author)}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <InsetCard padding={0}>
      <View style={{ gap: spacing.xs }}>
        {post.imageUrl ? (
          <Image
            source={post.imageUrl}
            contentFit="cover"
            style={{
              width: '100%',
              height: detail ? 188 : 132,
              borderTopLeftRadius: radii.xl,
              borderTopRightRadius: radii.xl,
            }}
          />
        ) : null}

        {onPress ? (
          <MotionPressable onPress={onPress} pressedOpacity={0.98} pressedScale={0.994}>
            {content}
          </MotionPressable>
        ) : (
          content
        )}

        {hasActions || footer ? (
          <View
            style={{
              gap: spacing.sm,
              paddingHorizontal: spacing.md,
              paddingBottom: spacing.md,
            }}
          >
            {hasActions ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {onLike ? (
                  <PostActionButton
                    label={formatCountLabel(post.likeCount, 'Like', 'Like', 'Likes')}
                    icon={
                      <Heart
                        color={post.viewerHasLiked ? palette.terracotta : palette.inkSoft}
                        size={14}
                      />
                    }
                    tone="terracotta"
                    active={post.viewerHasLiked}
                    busy={likeBusy}
                    onPress={onLike}
                  />
                ) : null}
                {onReply ? (
                  <PostActionButton
                    label={formatCountLabel(post.replyCount, 'Reply', 'Reply', 'Replies')}
                    icon={<MessageCircle color={palette.sky} size={14} />}
                    tone="sky"
                    onPress={onReply}
                  />
                ) : null}
                {onSave ? (
                  <PostActionButton
                    label={post.viewerHasSaved ? 'Saved' : 'Save'}
                    icon={
                      <Bookmark
                        color={post.viewerHasSaved ? palette.leafDark : palette.inkSoft}
                        size={14}
                      />
                    }
                    tone="leaf"
                    active={post.viewerHasSaved}
                    busy={saveBusy}
                    onPress={onSave}
                  />
                ) : null}
              </View>
            ) : null}
            {footer}
          </View>
        ) : null}
      </View>
    </InsetCard>
  );
}

function CategoryPill({ category }: { category: CommunityPost['category'] }) {
  const tone = getCategoryTone(category);

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.pill,
        backgroundColor: tone.backgroundColor,
      }}
    >
      <Text
        style={{
          color: tone.textColor,
          fontFamily: typography.bodyStrong,
          fontSize: 10,
        }}
      >
        {formatCommunityCategoryLabel(category)}
      </Text>
    </View>
  );
}

function TinyMetaLabel({
  label,
  icon,
  tone,
}: {
  label: string;
  icon?: ReactNode;
  tone: 'sky' | 'mustard' | 'leaf';
}) {
  const colors =
    tone === 'mustard'
      ? {
          backgroundColor: palette.mustardSoft,
          textColor: palette.mustard,
        }
      : tone === 'leaf'
        ? {
            backgroundColor: palette.leafMist,
            textColor: palette.leafDark,
          }
        : {
            backgroundColor: palette.skySoft,
            textColor: palette.sky,
          };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: radii.pill,
        backgroundColor: colors.backgroundColor,
      }}
    >
      {icon}
      <Text
        style={{
          color: colors.textColor,
          fontFamily: typography.bodyStrong,
          fontSize: 10,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function PostActionButton({
  label,
  icon,
  onPress,
  tone,
  active = false,
  busy = false,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  tone: 'leaf' | 'terracotta' | 'sky';
  active?: boolean;
  busy?: boolean;
}) {
  const colors = getActionTone(tone, active);

  return (
    <MotionPressable
      onPress={onPress}
      disabled={busy}
      pressedOpacity={0.96}
    >
      <View
        style={{
          minHeight: 36,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: spacing.sm,
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: colors.borderColor,
          backgroundColor: colors.backgroundColor,
        }}
      >
        {busy ? <ActivityIndicator color={colors.textColor} size="small" /> : icon}
        <Text
          style={{
            color: colors.textColor,
            fontFamily: typography.bodyStrong,
            fontSize: 11,
          }}
          >
            {label}
          </Text>
        </View>
    </MotionPressable>
  );
}

function formatCountLabel(
  count: number,
  emptyLabel: string,
  singularLabel: string,
  pluralLabel: string,
) {
  if (count <= 0) {
    return emptyLabel;
  }

  return count === 1 ? `1 ${singularLabel}` : `${count} ${pluralLabel}`;
}

function getActionTone(tone: 'leaf' | 'terracotta' | 'sky', active: boolean) {
  if (tone === 'terracotta') {
    return active
      ? {
          backgroundColor: palette.terracottaSoft,
          borderColor: palette.terracotta,
          textColor: palette.terracotta,
        }
      : {
          backgroundColor: palette.white,
          borderColor: palette.outline,
          textColor: palette.inkSoft,
        };
  }

  if (tone === 'sky') {
    return {
      backgroundColor: palette.skySoft,
      borderColor: palette.outline,
      textColor: palette.sky,
    };
  }

  return active
    ? {
        backgroundColor: palette.leafMist,
        borderColor: palette.leaf,
        textColor: palette.leafDark,
      }
    : {
        backgroundColor: palette.white,
        borderColor: palette.outline,
        textColor: palette.inkSoft,
      };
}

function getCategoryTone(category: CommunityPost['category']) {
  if (category === 'PEST_DISEASE' || category === 'WARNING') {
    return {
      backgroundColor: palette.terracottaSoft,
      textColor: palette.terracotta,
    };
  }

  if (category === 'MARKET' || category === 'SUCCESS') {
    return {
      backgroundColor: palette.mustardSoft,
      textColor: palette.mustard,
    };
  }

  return {
    backgroundColor: palette.leafMist,
    textColor: palette.leafDark,
  };
}
