import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Keyboard,
  type KeyboardEvent,
  LayoutAnimation,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';

import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  CloudSun,
  Database,
  History,
  ImagePlus,
  LineChart,
  ListTodo,
  Loader,
  Microscope,
  Sprout,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
  TreeDeciduous,
  User,
  Wrench,
  X,
  XCircle,
} from 'lucide-react-native';

import { MotionPressable } from '@/components/motion-pressable';
import { useSession } from '@/features/session/session-provider';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { sendAssistantMessage, getAssistantStatus, generateAssistantTitle, type AssistantChatMessage } from '@/lib/assistant';
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
  const [stagingImages, setStagingImages] = useState<string[]>([]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setStagingImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      setStatusMessage('Could not select image.');
    }
  };

  const removeStagingImage = (indexToRemove: number) => {
    setStagingImages((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

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

    if ((!content && stagingImages.length === 0) || !token || busy || !activeConversation) {
      return;
    }

    if (network.isOffline) {
      setStatusMessage('Offline. Reconnect to send a message.');
      return;
    }

    const timestamp = new Date().toISOString();
    const currentImagesToProcess = [...stagingImages];
    const userMessage: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: content,
      createdAt: timestamp,
      imageUris: currentImagesToProcess.length > 0 ? currentImagesToProcess : undefined,
    };

    const requestId = `req-${Date.now()}`;
    const typingMessage: AssistantChatMessage = {
      id: `assistant-pending-${Date.now()}`,
      role: 'assistant',
      text: 'Analyzing request...',
      createdAt: timestamp,
      pending: true,
    };

    const isFirstMessage = (activeConversation.messages.length === 0);

    const nextConversations = updateConversationList((current) =>
      current.map((conversation) => {
        if (conversation.id !== activeConversation.id) {
          return conversation;
        }

        return {
          ...conversation,
          title:
            conversation.messages.length === 0
              ? buildConversationTitle(content || 'Image upload')
              : conversation.title,
          updatedAt: timestamp,
          messages: [...conversation.messages, userMessage],
        };
      }),
    );

    if (isFirstMessage) {
      generateAssistantTitle(token, content || 'Image upload').then((res) => {
        if (res.title) {
          updateConversationList((current) =>
            current.map((conversation) => {
              if (conversation.id !== activeConversation.id) {
                return conversation;
              }
              return {
                ...conversation,
                title: res.title,
              };
            }),
          );
        }
      }).catch(() => {
        // ignore errors
      });
    }

    const updatedConversation =
      nextConversations.find((conversation) => conversation.id === activeConversation.id) ??
      null;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    setBusy(true);
    setStatusMessage(null);
    setComposer('');
    setStagingImages([]);
    setPendingAssistantMessage(typingMessage);

    let statusInterval: ReturnType<typeof setInterval> | null = null;
    let currentStatus = 'Analyzing request...';

    statusInterval = setInterval(async () => {
      const { status } = await getAssistantStatus(token, requestId);
      if (status !== currentStatus) {
        currentStatus = status;
        setPendingAssistantMessage((prev) => 
          prev ? { ...prev, text: status } : prev
        );
      }
    }, 800);

    try {
      const result = await sendAssistantMessage({
        token,
        message: content,
        history: updatedConversation?.messages ?? [userMessage],
        requestId,
        currentImages: currentImagesToProcess,
      });

      if (statusInterval) clearInterval(statusInterval);

      const assistantTimestamp = new Date().toISOString();
      const assistantMessage: AssistantChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.reply,
        createdAt: assistantTimestamp,
        toolsUsed: result.toolsUsed,
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
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      if (statusInterval) clearInterval(statusInterval);
      setStatusMessage(
        error instanceof ApiError
          ? error.message
          : 'Could not contact the chat service right now.',
      );
    } finally {
      if (statusInterval) clearInterval(statusInterval);
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
      : '');

  return (
      <View style={{ flex: 1, backgroundColor: screenPalette.page }}>
        <FlatList
          ref={listRef}
          data={visibleMessages}
          extraData={pendingAssistantMessage}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: screenPalette.page }}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 16,
            paddingTop: insets.top + 130,
            paddingBottom: conversationBottomInset,
            gap: 14,
          }}
          renderItem={({ item }) => <ChatBubble message={item} />}
          ListEmptyComponent={<WelcomeCard />}
        />

        <BlurView
          intensity={80}
          tint="light"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: 'rgba(237, 248, 238, 0.65)',
            paddingTop: insets.top + 14,
            paddingHorizontal: 20,
            paddingBottom: 18,
            gap: 14,
            borderBottomWidth: 1,
            borderBottomColor: 'rgba(212, 230, 215, 0.4)',
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
                width: 40,
                height: 40,
                borderRadius: radii.pill,
                borderCurve: 'continuous',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.8)',
                borderWidth: 1,
                borderColor: screenPalette.cardBorder,
              }}
            >
              <History color={palette.leafDark} size={18} strokeWidth={2.2} />
            </MotionPressable>

            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                bottom: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
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
                  backgroundColor: 'rgba(255,255,255,0.8)',
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
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  borderWidth: 1,
                  borderColor: screenPalette.cardBorder,
                }}
              >
                <Bell color={palette.leafDark} size={18} strokeWidth={2.2} />
              </MotionPressable>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginHorizontal: 8 }}>
            <Text
              selectable
              numberOfLines={1}
              style={{
                color: palette.leafDark,
                fontFamily: typography.bodyStrong,
                fontSize: 14,
                lineHeight: 20,
              }}
            >
              {currentConversationLabel}
            </Text>
          </View>

          {!!headerMessage && (
            <Text
              selectable
              style={{
                color: palette.inkSoft,
                fontFamily: typography.bodyRegular,
                fontSize: 12,
                lineHeight: 18,
                textAlign: 'center',
              }}
            >
              {headerMessage}
            </Text>
          )}
        </BlurView>

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
          <BlurView
            intensity={80}
            tint="light"
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
              borderColor: 'rgba(213, 222, 214, 0.4)',
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              boxShadow: '0 10px 28px rgba(17, 54, 32, 0.08)',
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {stagingImages.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10, gap: 8 }}
              >
                {stagingImages.map((uri, index) => (
                  <View key={index} style={{ position: 'relative' }}>
                    <Image
                      source={{ uri }}
                      style={{
                        width: 60,
                        height: 60,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: screenPalette.cardBorder,
                      }}
                    />
                    <Pressable
                      onPress={() => removeStagingImage(index)}
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        backgroundColor: '#FFFFFF',
                        borderRadius: 10,
                      }}
                    >
                      <XCircle color={palette.leafDark} size={20} fill="#FFFFFF" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
              <MotionPressable
                onPress={pickImage}
                disabled={network.isOffline || busy}
                contentStyle={{
                  width: 48,
                  height: 48,
                  borderRadius: radii.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ImagePlus color={palette.leafDark} size={22} strokeWidth={2.2} />
              </MotionPressable>

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
                disabled={(!composer.trim() && stagingImages.length === 0) || network.isOffline || busy}
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
          </BlurView>
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

const TOOL_CONFIG: Record<string, { label: string; icon: any }> = {
  getUserFarms: { label: 'Accessed Farm Data', icon: TreeDeciduous },
  getActiveCropSeasons: { label: 'Accessed Active Seasons', icon: Sprout },
  getWeather: { label: 'Checked Weather', icon: CloudSun },
  getMarketPrices: { label: 'Checked Market Prices', icon: LineChart },
  getTasks: { label: 'Checked Tasks', icon: ListTodo },
  getWeatherAdvisories: { label: 'Generated Advisory', icon: ShieldAlert },
  getExpenses: { label: 'Accessed Financials', icon: Database },
  getBudgets: { label: 'Accessed Budgets', icon: Database },
  getAlerts: { label: 'Checked Alerts', icon: Bell },
  predictCropSuitability: { label: 'Used Prediction Model', icon: Sparkles },
  diagnoseDisease: { label: 'Used Diagnosis Model', icon: Microscope },
};

function ExpandableToolUsage({ toolsUsed }: { toolsUsed: string[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  if (!toolsUsed || toolsUsed.length === 0) return null;

  return (
    <View
      style={{
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(10, 114, 72, 0.1)',
        alignSelf: 'stretch',
      }}
    >
      <Pressable
        onPress={toggleExpand}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Text
            style={{
              color: palette.leafDark,
              fontFamily: typography.bodyStrong,
              fontSize: 11,
            }}
          >
            Tools used:
          </Text>
          {!isExpanded && (
            <View style={{ flexDirection: 'row', gap: 4, flex: 1, overflow: 'hidden' }}>
              {toolsUsed.map((toolName, index) => {
                const config = TOOL_CONFIG[toolName] || { icon: Wrench };
                const Icon = config.icon;
                return (
                  <Icon key={`${toolName}-${index}`} color={palette.leafDark} size={12} strokeWidth={2.5} />
                );
              })}
            </View>
          )}
        </View>
        {isExpanded ? (
          <ChevronUp color={palette.leafDark} size={14} strokeWidth={2} />
        ) : (
          <ChevronDown color={palette.leafDark} size={14} strokeWidth={2} />
        )}
      </Pressable>

      {isExpanded && (
        <View style={{ marginTop: 4, gap: 4 }}>
          {toolsUsed.map((toolName, index) => {
            const config = TOOL_CONFIG[toolName] || { label: 'Used internal tool', icon: Wrench };
            const Icon = config.icon;
            return (
              <View
                key={`${toolName}-${index}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Icon color={palette.leafDark} size={12} strokeWidth={2.5} />
                <Text
                  style={{
                    color: palette.leafDark,
                    fontFamily: typography.bodyRegular,
                    fontSize: 11,
                  }}
                >
                  {config.label}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function ChatBubble({ message }: { message: AssistantChatMessage }) {
  const assistant = message.role === 'assistant';
  const textColor = assistant ? palette.ink : palette.white;

  return (
    <View
      style={{
        flexDirection: assistant ? 'row' : 'row-reverse',
        alignItems: 'flex-end',
        gap: 8,
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: assistant ? '#EAF7ED' : palette.leafDark,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: screenPalette.cardBorder,
        }}
      >
        {assistant ? (
          <Sparkles color={palette.leafDark} size={14} strokeWidth={2.5} />
        ) : (
          <User color={palette.white} size={14} strokeWidth={2.5} />
        )}
      </View>

      <View
        style={{
          maxWidth: '82%',
          borderRadius: 20,
          borderCurve: 'continuous',
          borderBottomLeftRadius: assistant ? 4 : 20,
          borderBottomRightRadius: assistant ? 20 : 4,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: assistant
            ? screenPalette.assistantBubble
            : screenPalette.userBubble,
          borderWidth: assistant ? 1 : 0,
          borderColor: screenPalette.assistantBorder,
          boxShadow: assistant
            ? shadow.soft
            : '0 8px 20px rgba(10, 114, 72, 0.18)',
          gap: 4,
        }}
      >
        {message.imageUris && message.imageUris.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {message.imageUris.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </View>
        )}

        {message.pending ? (
          <LiveStatusIndicator statusText={message.text} />
        ) : (
          <FormattedMessageText text={message.text} color={textColor} />
        )}

        {assistant && message.toolsUsed && message.toolsUsed.length > 0 && (
          <ExpandableToolUsage toolsUsed={message.toolsUsed} />
        )}

        {!message.pending && (
          <Text
            selectable
            style={{
              color: assistant ? screenPalette.muted : 'rgba(255,255,255,0.76)',
              fontFamily: typography.bodyRegular,
              fontSize: 11,
              lineHeight: 14,
              marginTop: 2,
              textAlign: assistant ? 'left' : 'right',
            }}
          >
            {formatMessageTime(message.createdAt)}
          </Text>
        )}
      </View>
    </View>
  );
}

function LiveStatusIndicator({ statusText }: { statusText: string }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, [pulse, spin]);

  const spinInterpolate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radii.pill,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(10, 114, 72, 0.1)',
        opacity: pulse,
        marginVertical: 2,
      }}
    >
      <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
        <Loader color={palette.leafDark} size={16} strokeWidth={2.5} />
      </Animated.View>
      <Text
        style={{
          color: palette.leafDark,
          fontFamily: typography.bodyStrong,
          fontSize: 13,
          lineHeight: 18,
        }}
      >
        {statusText}
      </Text>
    </Animated.View>
  );
}

function renderInlineMarkdown(text: string, baseColor: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*[^*]+\*)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <Text key={index} style={{ fontFamily: typography.bodyStrong, color: baseColor }}>
          {part.slice(2, -2)}
        </Text>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <Text key={index} style={{ fontStyle: 'italic', color: baseColor }}>
          {part.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={index} style={{ color: baseColor }}>{part}</Text>;
  });
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
                {renderInlineMarkdown(block.text, color)}
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
                {renderInlineMarkdown(block.text, color)}
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
            {renderInlineMarkdown(block.text, color)}
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
  const capabilities = [
    { icon: CloudSun, text: 'Check live weather & agronomic advisories' },
    { icon: LineChart, text: 'Track real-time market prices' },
    { icon: Microscope, text: 'Diagnose crop diseases from photos' },
    { icon: Sprout, text: 'Predict the best crops for your season' },
    { icon: Database, text: 'Manage farm tasks and financials' },
  ];

  return (
    <View
      style={{
        borderRadius: 28,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: screenPalette.cardBorder,
        backgroundColor: palette.white,
        paddingHorizontal: 20,
        paddingVertical: 24,
        gap: 16,
        boxShadow: '0 10px 26px rgba(17, 54, 32, 0.06)',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#EAF7ED',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Sparkles color={palette.leafDark} size={20} strokeWidth={2.5} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            selectable
            style={{
              color: palette.ink,
              fontFamily: typography.displayBold,
              fontSize: 18,
              lineHeight: 24,
            }}
          >
            Your AI Agronomist
          </Text>
          <Text
            selectable
            style={{
              color: palette.inkSoft,
              fontFamily: typography.bodyRegular,
              fontSize: 13,
              lineHeight: 18,
              marginTop: 2,
            }}
          >
            I'm here to help manage your farm.
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: screenPalette.cardBorder, marginVertical: 4 }} />

      <View style={{ gap: 14 }}>
        {capabilities.map((cap, i) => {
          const Icon = cap.icon;
          return (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F4FAF4',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon color={palette.leafDark} size={16} strokeWidth={2.2} />
              </View>
              <Text
                selectable
                style={{
                  flex: 1,
                  color: palette.ink,
                  fontFamily: typography.bodyRegular,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {cap.text}
              </Text>
            </View>
          );
        })}
      </View>
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

function splitMessageBlocks(text?: string | null) {
  if (!text) {
    return [{ type: 'paragraph' as const, text: '' }];
  }

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
