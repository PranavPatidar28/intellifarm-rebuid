import { View } from 'react-native';

import { Button } from '@/components/button';
import { spacing } from '@/theme/tokens';

export function ActionCTAGroup({
  actions,
}: {
  actions: Array<{
    label: string;
    onPress?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'soft';
  }>;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {actions.map((action) => (
        <Button
          key={action.label}
          label={action.label}
          onPress={action.onPress}
          variant={action.variant}
          fullWidth={false}
        />
      ))}
    </View>
  );
}
