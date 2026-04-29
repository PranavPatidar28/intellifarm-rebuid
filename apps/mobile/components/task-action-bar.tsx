import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/button';
import { spacing } from '@/theme/tokens';

type Action = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'soft';
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
};

export function TaskActionBar({
  primaryAction,
  secondaryActions = [],
}: {
  primaryAction: Action;
  secondaryActions?: Action[];
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Button
        label={primaryAction.label}
        onPress={primaryAction.onPress}
        variant={primaryAction.variant}
        icon={primaryAction.icon}
        disabled={primaryAction.disabled}
        loading={primaryAction.loading}
      />
      {secondaryActions.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {secondaryActions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              onPress={action.onPress}
              variant={action.variant}
              icon={action.icon}
              disabled={action.disabled}
              loading={action.loading}
              fullWidth={false}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
