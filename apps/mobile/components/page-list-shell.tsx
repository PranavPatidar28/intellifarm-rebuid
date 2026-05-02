import type { ReactNode } from 'react';
import {
  FlatList,
  View,
  type FlatListProps,
  type ListRenderItem,
} from 'react-native';

import { AppHeroHeader } from '@/components/app-hero-header';
import { palette, spacing } from '@/theme/tokens';

type PageListShellProps<TItem> = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  hero?: ReactNode;
  action?: ReactNode;
  heroTone?: 'sunrise' | 'weather' | 'market' | 'scheme' | 'assistant';
  headerContent?: ReactNode;
  data: ReadonlyArray<TItem>;
  renderItem: ListRenderItem<TItem>;
  keyExtractor: NonNullable<FlatListProps<TItem>['keyExtractor']>;
  emptyContent?: ReactNode;
  listProps?: Omit<
    FlatListProps<TItem>,
    | 'contentContainerStyle'
    | 'data'
    | 'keyExtractor'
    | 'ListEmptyComponent'
    | 'ListHeaderComponent'
    | 'renderItem'
  >;
};

export function PageListShell<TItem>({
  eyebrow,
  title,
  subtitle,
  hero,
  action,
  heroTone = 'sunrise',
  headerContent,
  data,
  renderItem,
  keyExtractor,
  emptyContent,
  listProps,
}: PageListShellProps<TItem>) {
  return (
    <FlatList
      contentInsetAdjustmentBehavior="automatic"
      data={data}
      keyExtractor={keyExtractor}
      keyboardShouldPersistTaps="handled"
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: palette.canvas }}
      contentContainerStyle={{
        paddingBottom: 138,
        backgroundColor: palette.canvas,
        overflow: 'visible',
      }}
      ListHeaderComponent={
        <View style={{ zIndex: 100, overflow: 'visible' }}>
          <AppHeroHeader
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            hero={hero}
            action={action}
            tone={heroTone}
          />
          {headerContent ? (
            <View
              style={{
                gap: spacing.md,
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: spacing.md,
                zIndex: 100,
                overflow: 'visible',
              }}
            >
              {headerContent}
            </View>
          ) : null}
        </View>
      }
      ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      ListEmptyComponent={
        emptyContent ? (
          <View
            style={{
              paddingHorizontal: spacing.lg,
              paddingTop: spacing.md,
            }}
          >
            {emptyContent}
          </View>
        ) : null
      }
      {...listProps}
    />
  );
}
