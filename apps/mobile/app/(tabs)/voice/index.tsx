import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  type KeyboardEvent,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bell,
  History,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react-native';

import { MotionPressable } from '@/components/motion-pressable';
import { useSession } from '@/features/session/session-provider';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { sendAssistantMessage, type AssistantChatMessage } from '@/lib/assistant';
import { ApiError } from '@/lib/api';
import { storageKeys } from '@/lib/constants';
import { formatRelativeTime } from '@/lib/format';
import { storage, useStoredValue } from '@/lib/storage';
import { palette, radii, shadow, typography } from '@/theme/tokens';

type RouteParams = {
  prompt?: string | string[];
};

type QuickPrompt = {
  label: string;
  prompt: string;
};

type StoredConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantChatMessage[];
};

const quickPrompts: QuickPrompt[] = [
  {
    label: 'Weather help',
    prompt: 'Give me a simple weather-based farming tip for today.',
  },
  {
    label: 'Market advice',
    prompt: 'How should I check if today is a good day to sell my crop?',
  },
  {
    label: 'Crop care',
    prompt: 'Give me a short checklist to inspect my crop health this week.',
  },
];

const screenPalette = {
  page: '#FFFFFF',
  header: '#EDF8EE',
  assistantBubble: '#E8F4EA',
  assistantBorder: '#D4E6D7',
  userBubble: '#0A7248',
  cardBorder: '#E6EEE7',
  composerBorder: '#D5DED6',
  muted: '#7B877D',
  panelBorder: '#DCE7DE',
  panelBackdrop: 'rgba(16, 33, 22, 0.16)',
};

export default function VoiceAssistantRoute() {
  const params = useLocalSearchParams<RouteParams>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const listRef = useRef<FlatList<AssistantChatMessage>>(null);
  const network = useNetworkStatus();
  const { token, authUser } = useSession();
  const userStorageSuffix = authUser?.id ?? 'guest';
  const conversationsStorageKey = `${storageKeys.assistantConversations}.${userStorageSuffix}`;
  const activeConversationStorageKey = `${storageKeys.assistantActiveConversationId}.${userStorageSuffix}`;
  const [storedConversations, setStoredConversations] = useStoredValue<StoredConversation[]>(
    conversationsStorageKey,
    [],
  );
  const [storedActiveConversationId, setStoredActiveConversationId] =
    useStoredValue<string>(activeConversationStorageKey, '');
  const [composer, setComposer] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
  const [composerCardHeight, setComposerCardHeight] = useState(76);
  const [promptRowHeight, setPromptRowHeight] = useState(50);
  const [pendingAssistantMessage, setPendingAssistantMessage] =
    useState<AssistantChatMessage | null>(null);

  const promptParam = normalizeRouteParam(params.prompt);
  const keyboardGap = 8;
  const tabBarHeight = 66 + Math.max(insets.bottom, 8);
  const restingComposerBottom = tabBarHeight + 8;
  const activeComposerBottom = keyboardVisible
    ? Math.max(keyboardOverlap, 0) + keyboardGap
    : restingComposerBottom;
  const promptRowBottom = restingComposerBottom + composerCardHeight + 12;
  const conversationBottomInset = keyboardVisible
    ? activeComposerBottom + composerCardHeight + 24
    : promptRowBottom + promptRowHeight + 24;
  const historyPanelBottom = keyboardVisible
    ? activeComposerBottom + composerCardHeight + 18
    : promptRowBottom + promptRowHeight + 12;

  const conversations = useMemo(
    () => sortConversations(storedConversations),
    [storedConversations],
  );
  const activeConversation =
    conversations.find((conversation) => conversation.id === storedActiveConversationId) ??
    conversations[0] ??
    null;
  const visibleMessages = useMemo(
    () => [
      ...(activeConversation?.messages ?? []),
      ...(pendingAssistantMessage ? [pendingAssistantMessage] : []),
    ],
    [activeConversation?.messages, pendingAssistantMessage],
  );

  useEffect(() => {
    if (!conversations.length) {
      const conversation = createConversation();
      setStoredConversations([conversation]);
      setStoredActiveConversationId(conversation.id);
      return;
    }

    if (!storedActiveConversationId) {
      setStoredActiveConversationId(conversations[0]?.id ?? '');
      return;
    }

    const activeExists = conversations.some(
      (conversation) => conversation.id === storedActiveConversationId,
    );

    if (!activeExists) {
      setStoredActiveConversationId(conversations[0]?.id ?? '');
    }
  }, [
    conversations,
    setStoredActiveConversationId,
    setStoredConversations,
    storedActiveConversationId,
  ]);

  useEffect(() => {
    if (
      promptParam &&
      !composer.trim() &&
      (activeConversation?.messages.length ?? 0) === 0
    ) {
      setComposer(promptParam);
    }
  }, [activeConversation?.messages.length, composer, promptParam]);

  useEffect(() => {
    const handle = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: visibleMessages.length > 0 });
    }, 0);

    return () => clearTimeout(handle);
  }, [visibleMessages.length, activeConversation?.id]);

  useEffect(() => {
    const showEvent =
      process.env.EXPO_OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      process.env.EXPO_OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event: KeyboardEvent) => {
      const overlapFromScreenY = Math.max(
        windowHeight - event.endCoordinates.screenY,
        0,
      );

      setKeyboardVisible(true);
      setKeyboardOverlap(overlapFromScreenY || event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
      setKeyboardOverlap(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [windowHeight]);

  const updateConversationList = (updater: (current: StoredConversation[]) => StoredConversation[]) => {
    const current = storage.get<StoredConversation[]>(conversationsStorageKey, []);
    const next = sortConversations(updater(current));
    setStoredConversations(next);
    return next;
  };

  const startNewConversation = () => {
    if (busy) {
      return;
    }

    const reusableConversation =
      conversations.find((conversation) => conversation.messages.length === 0) ?? null;

    if (reusableConversation) {
      setStoredActiveConversationId(reusableConversation.id);
      setComposer('');
      setStatusMessage(null);
      setPendingAssistantMessage(null);
      setHistoryOpen(false);
      return;
    }

    const conversation = createConversation();
    updateConversationList((current) => [conversation, ...current]);
    setStoredActiveConversationId(conversation.id);
    setComposer('');
    setStatusMessage(null);
    setPendingAssistantMessage(null);
    setHistoryOpen(false);
  };

  const selectConversation = (conversationId: string) => {
    if (busy) {
      return;
    }

    setStoredActiveConversationId(conversationId);
    setComposer('');
    setStatusMessage(null);
    setPendingAssistantMessage(null);
    setHistoryOpen(false);
  };

  const sendCurrentMessage = async (overrideMessage?: string) => {
    const content = (overrideMessage ?? composer).trim();

    if (!content || !token || busy || !activeConversation) {
      return;
    }

    if (network.isOffline) {
      setStatusMessage('Offline. Reconnect to send a message.');
      return;
    }

    const timestamp = new Date().toISOString();
    const userMessage: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: content,
      createdAt: timestamp,
    };

    const typingMessage: AssistantChatMessage = {
      id: `assistant-pending-${Date.now()}`,
      role: 'assistant',
      text: 'Thinking...',
      createdAt: timestamp,
      pending: true,
    };

    const nextConversations = updateConversationList((current) =>
      current.map((conversation) => {
        if (conversation.id !== activeConversation.id) {
          return conversation;
        }

        return {
          ...conversation,
          title:
            conversation.messages.length === 0
              ? buildConversationTitle(content)
              : conversation.title,
          updatedAt: timestamp,
          messages: [...conversation.messages, userMessage],
        };
      }),
    );

    const updatedConversation =
      nextConversations.find((conversation) => conversation.id === activeConversation.id) ??
      null;

    setBusy(true);
    setStatusMessage(null);
    setComposer('');
    setPendingAssistantMessage(typingMessage);

    try {
      const result = await sendAssistantMessage({
        token,
        message: content,
        history: updatedConversation?.messages ?? [userMessage],
      });

      const assistantTimestamp = new Date().toISOString();
      const assistantMessage: AssistantChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.reply,
        createdAt: assistantTimestamp,
      };

      updateConversationList((current) =>
        current.map((conversation) => {
          if (conversation.id !== activeConversation.id) {
            return conversation;
          }

          return {
            ...conversation,
            updatedAt: assistantTimestamp,
            messages: [...conversation.messages, assistantMessage],
          };
        }),
      );
    } catch (error) {
      setStatusMessage(
        error instanceof ApiError
          ? error.message
          : 'Could not contact the chat service right now.',
      );
    } finally {
      setPendingAssistantMessage(null);
      setBusy(false);
    }
  };

  const currentConversationLabel = activeConversation
    ? activeConversation.messages.length
      ? activeConversation.title
      : 'New conversation'
    : 'Assistant';
  const headerMessage =
    statusMessage ??
    (network.isOffline
      ? 'Offline. Reconnect to keep chatting.'
      : activeConversation?.messages.length
        ? `Updated ${formatRelativeTime(activeConversation.updatedAt)}`
        : 'Start a fresh conversation or open history.');

  return (
      <View style={{ flex: 1, backgroundColor: screenPalette.page }}>
        <View
          style={{
            backgroundColor: screenPalette.header,
            paddingTop: insets.top + 14,
            paddingHorizontal: 20,
            paddingBottom: 18,
            gap: 14,
          }}
        >
          <View
            style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <MotionPressable
              onPress={() => setHistoryOpen(true)}
              disabled={busy}
              contentStyle={{
                minWidth: 88,
                height: 40,
                paddingHorizontal: 12,
                borderRadius: radii.pill,
                borderCurve: 'continuous',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                backgroundColor: '#FFFFFF',
                borderWidth: 1,
                borderColor: screenPalette.cardBorder,
              }}
            >
              <History color={palette.leafDark} size={16} strokeWidth={2.2} />
              <Text
                selectable
                style={{
                  color: palette.leafDark,
                  fontFamily: typography.bodyStrong,
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                History
              </Text>
            </MotionPressable>

            <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
              <Text
                selectable
                numberOfLines={1}
                style={{
                  color: palette.leafDark,
                  fontFamily: typography.displayBold,
                  fontSize: 18,
                  lineHeight: 24,
                }}
              >
                AI Assistant
              </Text>
              <Text
                selectable
                numberOfLines={1}
                style={{
                  color: palette.inkSoft,
                  fontFamily: typography.bodyRegular,
                  fontSize: 12,
                  lineHeight: 16,
                }}
              >
                {currentConversationLabel}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MotionPressable
                onPress={startNewConversation}
                disabled={busy}
                contentStyle={{
                  width: 40,
                  height: 40,
                  borderRadius: radii.pill,
                  borderCurve: 'continuous',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: screenPalette.cardBorder,
                }}
              >
                <Plus color={palette.leafDark} size={18} strokeWidth={2.2} />
              </MotionPressable>

              <MotionPressable
                onPress={() => router.push('/alerts')}
                contentStyle={{
                  width: 40,
                  height: 40,
                  borderRadius: radii.pill,
                  borderCurve: 'continuous',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: screenPalette.cardBorder,
                }}
              >
                <Bell color={palette.leafDark} size={18} strokeWidth={2.2} />
              </MotionPressable>
            </View>
          </View>

          <Text
            selectable
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 12,
              lineHeight: 18,
            }}
          >
            {headerMessage}
          </Text>
        </View>

        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: screenPalette.page }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: conversationBottomInset,
            gap: 14,
          }}
          renderItem={({ item }) => <ChatBubble message={item} />}
          ListEmptyComponent={<WelcomeCard />}
        />

        {!keyboardVisible ? (
          <View
            style={{
              position: 'absolute',
              right: 0,
              left: 0,
              bottom: promptRowBottom,
            }}
            pointerEvents="box-none"
          >
            <View
              onLayout={(event) => {
                const nextHeight = Math.ceil(event.nativeEvent.layout.height);
                if (Math.abs(nextHeight - promptRowHeight) > 1) {
                  setPromptRowHeight(nextHeight);
                }
              }}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  gap: 10,
                }}
              >
                {quickPrompts.map((item) => (
                  <PromptChip
                    key={item.label}
                    label={item.label}
                    onPress={() => {
                      void sendCurrentMessage(item.prompt);
                    }}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}

        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            right: 0,
            left: 0,
            bottom: activeComposerBottom,
          }}
        >
          <View
            onLayout={(event) => {
              const nextHeight = Math.ceil(event.nativeEvent.layout.height);
              if (Math.abs(nextHeight - composerCardHeight) > 1) {
                setComposerCardHeight(nextHeight);
              }
            }}
            style={{
              marginHorizontal: 16,
              borderRadius: 28,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: screenPalette.composerBorder,
              backgroundColor: palette.white,
              boxShadow: '0 10px 28px rgba(17, 54, 32, 0.08)',
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: 12,
            }}
          >
            <TextInput
              value={composer}
              onChangeText={(value) => {
                setComposer(value);
                if (statusMessage) {
                  setStatusMessage(null);
                }
              }}
              editable={!network.isOffline && !busy}
              multiline
              maxLength={4000}
              placeholder={
                network.isOffline ? 'Offline' : 'Ask IntelliFarm something...'
              }
              placeholderTextColor={palette.inkMuted}
              textAlignVertical="center"
              style={{
                flex: 1,
                minHeight: 48,
                maxHeight: 120,
                color: palette.ink,
                fontFamily: typography.bodyRegular,
                fontSize: 16,
                lineHeight: 24,
                paddingTop: 6,
                paddingBottom: 4,
              }}
            />

            <MotionPressable
              onPress={() => {
                void sendCurrentMessage();
              }}
              disabled={!composer.trim() || network.isOffline || busy}
              contentStyle={{
                width: 48,
                height: 48,
                borderRadius: radii.pill,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: palette.leaf,
                boxShadow: shadow.glow,
              }}
            >
              <Send color={palette.white} size={18} strokeWidth={2.3} />
            </MotionPressable>
          </View>
        </View>

        {historyOpen ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 20,
            }}
          >
            <Pressable
              onPress={() => setHistoryOpen(false)}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: screenPalette.panelBackdrop,
              }}
            />

            <View
              style={{
                position: 'absolute',
                top: insets.top + 82,
                right: 16,
                left: 16,
                bottom: Math.max(historyPanelBottom, 108),
                borderRadius: 28,
                borderCurve: 'continuous',
                borderWidth: 1,
                borderColor: screenPalette.panelBorder,
                backgroundColor: '#FFFFFF',
                boxShadow: '0 18px 44px rgba(17, 54, 32, 0.12)',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  paddingHorizontal: 18,
                  paddingTop: 18,
                  paddingBottom: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: screenPalette.cardBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    selectable
                    style={{
                      color: palette.ink,
                      fontFamily: typography.displayBold,
                      fontSize: 17,
                      lineHeight: 23,
                    }}
                  >
                    Chat history
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: palette.inkSoft,
                      fontFamily: typography.bodyRegular,
                      fontSize: 12,
                      lineHeight: 18,
                    }}
                  >
                    Continue an older chat or start a new one.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MotionPressable
                    onPress={startNewConversation}
                    disabled={busy}
                    contentStyle={{
                      width: 38,
                      height: 38,
                      borderRadius: radii.pill,
                      borderCurve: 'continuous',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#F4FAF4',
                      borderWidth: 1,
                      borderColor: screenPalette.cardBorder,
                    }}
                  >
                    <Plus color={palette.leafDark} size={17} strokeWidth={2.3} />
                  </MotionPressable>

                  <MotionPressable
                    onPress={() => setHistoryOpen(false)}
                    contentStyle={{
                      width: 38,
                      height: 38,
                      borderRadius: radii.pill,
                      borderCurve: 'continuous',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFFFFF',
                      borderWidth: 1,
                      borderColor: screenPalette.cardBorder,
                    }}
                  >
                    <X color={palette.inkSoft} size={17} strokeWidth={2.3} />
                  </MotionPressable>
                </View>
              </View>

              <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 16,
                  paddingTop: 14,
                  paddingBottom: 24,
                  gap: 10,
                }}
              >
                {conversations.map((conversation) => (
                  <ConversationHistoryRow
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeConversation?.id}
                    onPress={() => selectConversation(conversation.id)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </View>
  );
}

function ChatBubble({ message }: { message: AssistantChatMessage }) {
  const assistant = message.role === 'assistant';
  const textColor = assistant ? palette.ink : palette.white;

  return (
    <View
      style={{
        alignItems: assistant ? 'flex-start' : 'flex-end',
      }}
    >
      <View
        style={{
          width: assistant ? '94%' : undefined,
          maxWidth: assistant ? '94%' : '78%',
          borderRadius: 22,
          borderCurve: 'continuous',
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: assistant
            ? screenPalette.assistantBubble
            : screenPalette.userBubble,
          borderWidth: assistant ? 1 : 0,
          borderColor: screenPalette.assistantBorder,
          boxShadow: assistant
            ? shadow.soft
            : '0 10px 24px rgba(10, 114, 72, 0.14)',
          gap: 6,
        }}
      >
        <FormattedMessageText text={message.text} color={textColor} />

        <Text
          selectable
          style={{
            color: assistant ? screenPalette.muted : 'rgba(255,255,255,0.76)',
            fontFamily: typography.bodyRegular,
            fontSize: 12,
            lineHeight: 16,
          }}
        >
          {message.pending
            ? 'Waiting for reply...'
            : formatMessageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

function FormattedMessageText({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  const blocks = splitMessageBlocks(text);

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, index) => {
        if (block.type === 'bullet') {
          return (
            <View
              key={`${block.type}-${index}`}
              style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}
            >
              <Text
                selectable
                style={{
                  color,
                  fontFamily: typography.bodyStrong,
                  fontSize: 16,
                  lineHeight: 24,
                }}
              >
                •
              </Text>
              <Text
                selectable
                style={{
                  flex: 1,
                  color,
                  fontFamily: typography.bodyRegular,
                  fontSize: 16,
                  lineHeight: 24,
                }}
              >
                {block.text}
              </Text>
            </View>
          );
        }

        if (block.type === 'numbered') {
          return (
            <View
              key={`${block.type}-${index}`}
              style={{ flexDirection: 'row', gap: 8, paddingRight: 4 }}
            >
              <Text
                selectable
                style={{
                  color,
                  fontFamily: typography.bodyStrong,
                  fontSize: 16,
                  lineHeight: 24,
                }}
              >
                {block.marker}
              </Text>
              <Text
                selectable
                style={{
                  flex: 1,
                  color,
                  fontFamily: typography.bodyRegular,
                  fontSize: 16,
                  lineHeight: 24,
                }}
              >
                {block.text}
              </Text>
            </View>
          );
        }

        return (
          <Text
            key={`${block.type}-${index}`}
            selectable
            style={{
              color,
              fontFamily:
                block.type === 'label'
                  ? typography.bodyStrong
                  : typography.bodyRegular,
              fontSize: 16,
              lineHeight: 24,
            }}
          >
            {block.text}
          </Text>
        );
      })}
    </View>
  );
}

function ConversationHistoryRow({
  conversation,
  active,
  onPress,
}: {
  conversation: StoredConversation;
  active: boolean;
  onPress: () => void;
}) {
  const preview =
    conversation.messages.at(-1)?.text.trim() || 'No messages yet in this conversation.';

  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        borderRadius: 20,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: active ? palette.leafDark : screenPalette.cardBorder,
        backgroundColor: active ? '#EAF7ED' : '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <Text
          selectable
          numberOfLines={1}
          style={{
            flex: 1,
            color: palette.ink,
            fontFamily: typography.bodyStrong,
            fontSize: 14,
            lineHeight: 20,
          }}
        >
          {conversation.title}
        </Text>
        <Text
          selectable
          style={{
            color: palette.inkSoft,
            fontFamily: typography.bodyRegular,
            fontSize: 11,
            lineHeight: 16,
          }}
        >
          {formatRelativeTime(conversation.updatedAt)}
        </Text>
      </View>

      <Text
        selectable
        numberOfLines={2}
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyRegular,
          fontSize: 13,
          lineHeight: 19,
        }}
      >
        {preview}
      </Text>
    </MotionPressable>
  );
}

function WelcomeCard() {
  return (
    <View
      style={{
        borderRadius: 28,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: screenPalette.cardBorder,
        backgroundColor: palette.white,
        paddingHorizontal: 18,
        paddingVertical: 18,
        gap: 14,
        boxShadow: '0 10px 26px rgba(17, 54, 32, 0.06)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Sparkles color={palette.leafDark} size={16} strokeWidth={2.1} />
        <Text
          selectable
          style={{
            color: palette.ink,
            fontFamily: typography.displayBold,
            fontSize: 16,
            lineHeight: 22,
          }}
        >
          Simple IntelliFarm Chat
        </Text>
      </View>

      <Text
        selectable
        style={{
          color: palette.inkSoft,
          fontFamily: typography.bodyRegular,
          fontSize: 14,
          lineHeight: 22,
        }}
      >
        Start a conversation, keep it in local history, and come back to it later
        from the Assistant tab.
      </Text>
    </View>
  );
}

function PromptChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <MotionPressable
      onPress={onPress}
      contentStyle={{
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: radii.pill,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: screenPalette.cardBorder,
        backgroundColor: '#F8FBF7',
      }}
    >
      <Text
        selectable
        style={{
          color: palette.leafDark,
          fontFamily: typography.bodyStrong,
          fontSize: 12,
          lineHeight: 18,
        }}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}

function normalizeRouteParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function splitMessageBlocks(text: string) {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return [{ type: 'paragraph' as const, text: '' }];
  }

  return normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
      if (bulletMatch) {
        return {
          type: 'bullet' as const,
          text: bulletMatch[1].trim(),
        };
      }

      const numberedMatch = line.match(/^(\d+[.)])\s+(.+)$/);
      if (numberedMatch) {
        return {
          type: 'numbered' as const,
          marker: numberedMatch[1],
          text: numberedMatch[2].trim(),
        };
      }

      if (/^[A-Za-z][A-Za-z /()-]{1,40}:$/.test(line)) {
        return {
          type: 'label' as const,
          text: line,
        };
      }

      return {
        type: 'paragraph' as const,
        text: line,
      };
    });
}

function formatMessageTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function createConversation(): StoredConversation {
  const timestamp = new Date().toISOString();

  return {
    id: `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'New conversation',
    createdAt: timestamp,
    updatedAt: timestamp,
    messages: [],
  };
}

function buildConversationTitle(message: string) {
  const normalized = message.replace(/\s+/g, ' ').trim();

  if (!normalized) {
    return 'New conversation';
  }

  return normalized.length > 48 ? `${normalized.slice(0, 45).trim()}...` : normalized;
}

function sortConversations(conversations: StoredConversation[]) {
  return [...conversations].sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}
