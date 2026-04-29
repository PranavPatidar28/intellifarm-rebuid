import { Pressable, Text, View } from 'react-native';

import { Flag } from 'lucide-react-native';

import { FarmerAvatar } from '@/components/farmer-avatar';
import { InsetCard } from '@/components/inset-card';
import type { CommunityReply } from '@/lib/api-types';
import { formatRelativeTime } from '@/lib/format';
import { formatCommunityLocation } from '@/lib/community';
import { palette, radii, spacing, typography } from '@/theme/tokens';

export function CommunityReplyCard({
  reply,
  onReport,
}: {
  reply: CommunityReply;
  onReport?: () => void;
}) {
  return (
    <InsetCard padding={12}>
      <View style={{ gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              flex: 1,
            }}
          >
            <FarmerAvatar
              name={reply.author.firstName}
              profilePhotoUrl={reply.author.profilePhotoUrl}
              size={32}
              backgroundColor={palette.parchmentSoft}
            />
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={{
                  color: palette.ink,
                  fontFamily: typography.bodyStrong,
                  fontSize: 12,
                }}
              >
                {reply.author.firstName}
              </Text>
              <Text
                style={{
                  color: palette.inkMuted,
                  fontFamily: typography.bodyRegular,
                  fontSize: 11,
                }}
              >
                {formatCommunityLocation(reply.author)}
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text
              style={{
                color: palette.inkMuted,
                fontFamily: typography.bodyRegular,
                fontSize: 11,
              }}
            >
              {formatRelativeTime(reply.createdAt)}
            </Text>
            {onReport ? (
              <Pressable
                onPress={onReport}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderRadius: radii.pill,
                  backgroundColor: palette.terracottaSoft,
                }}
              >
                <Flag color={palette.terracotta} size={12} />
                <Text
                  style={{
                    color: palette.terracotta,
                    fontFamily: typography.bodyStrong,
                    fontSize: 10,
                  }}
                >
                  Report
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <Text
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 12,
            lineHeight: 18,
          }}
        >
          {reply.body}
        </Text>
      </View>
    </InsetCard>
  );
}
