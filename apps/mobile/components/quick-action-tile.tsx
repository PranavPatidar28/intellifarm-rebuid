import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CompactListCard } from '@/components/compact-list-card';
import { palette, radii } from '@/theme/tokens';

export function QuickActionTile({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1, minWidth: 144 }}>
      <CompactListCard
        title={title}
        subtitle={subtitle}
        prefix={
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: radii.lg,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: palette.parchmentSoft,
            }}
          >
            {icon}
          </View>
        }
      />
    </Pressable>
  );
}
