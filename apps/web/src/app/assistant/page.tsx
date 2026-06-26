"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Mic, MicOff, Send, User, Volume2, VolumeX } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskCallout } from "@/components/ui/risk-callout";
import { Textarea } from "@/components/ui/textarea";
import { apiPost } from "@/lib/api";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { useTextToSpeech } from "@/lib/use-text-to-speech";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  toolsUsed?: string[];
};

type ChatResponse = {
  role: "assistant";
  content: string;
  toolsUsed?: string[];
};

const SUGGESTIONS = [
  "What should I do for my crop this week?",
  "Is the weather risky for spraying today?",
  "Which mandi has the best price for my produce?",
  "Are there any government schemes I qualify for?",
];

export default function AssistantPage() {
  return (
    <AuthGate>
      <AssistantContent />
    </AuthGate>
  );
}

function AssistantContent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speechRecognition = useSpeechRecognition();
  const speech = useTextToSpeech();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mirror live voice transcript into the draft while listening.
  useEffect(() => {
    if (speechRecognition.isListening) {
      setDraft(speechRecognition.transcript);
    }
  }, [speechRecognition.transcript, speechRecognition.isListening]);

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) {
      return;
    }

    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    }

    const userMessage: ChatMessage = {
      id: `user-${messages.length}-${trimmed.length}`,
      role: "user",
      content: trimmed,
    };
    const history = [...messages, userMessage];

    setMessages(history);
    setDraft("");
    setError(null);
    setIsSending(true);

    try {
      const response = await apiPost<ChatResponse>("/assistant/chat", {
        messages: history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${current.length}`,
          role: "assistant",
          content: response.content,
          toolsUsed: response.toolsUsed,
        },
      ]);
    } catch {
      setError(
        "The assistant could not respond just now. Check your connection and try again.",
      );
      // Roll back the optimistic user message so they can retry cleanly.
      setMessages((current) => current.slice(0, -1));
      setDraft(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  function toggleListening() {
    if (speechRecognition.isListening) {
      speechRecognition.stopListening();
    } else {
      speechRecognition.setTranscript("");
      speechRecognition.startListening();
    }
  }

  const hasMessages = messages.length > 0;

  return (
    <AppShell
      title="Assistant"
      description="Ask about current weather, crop tasks, markets, and schemes. Answers use your saved farm context and link back to grounded sources."
      eyebrow="Grounded assistant"
    >
      <div className="grid gap-4">
        <RiskCallout title="Guidance, not a final verdict" tone="info">
          The assistant helps you think through decisions using your farm data.
          Confirm high-stakes actions (spraying, irrigation, selling) against
          local expert advice before acting.
        </RiskCallout>

        <SectionCard
          title="Conversation"
          eyebrow="Chat"
          action={
            speech.isSupported ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leadingIcon={
                  speech.isSpeaking ? (
                    <VolumeX className="h-4 w-4" />
                  ) : (
                    <Volume2 className="h-4 w-4" />
                  )
                }
                onClick={() => {
                  if (speech.isSpeaking) {
                    speech.stop();
                  } else {
                    const lastAssistant = [...messages]
                      .reverse()
                      .find((message) => message.role === "assistant");
                    if (lastAssistant) {
                      speech.speak(lastAssistant.content);
                    }
                  }
                }}
                disabled={!hasMessages}
              >
                {speech.isSpeaking ? "Stop" : "Read aloud"}
              </Button>
            ) : null
          }
        >
          <div
            ref={scrollRef}
            className="flex max-h-[52vh] min-h-[280px] flex-col gap-4 overflow-y-auto pr-1"
          >
            {!hasMessages && !isSending ? (
              <EmptyState
                title="Start a conversation"
                description="Ask a question below, or tap a suggestion to get going."
              />
            ) : null}

            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}

            {isSending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Bot className="h-4 w-4 animate-pulse" />
                Thinking...
              </div>
            ) : null}
          </div>

          {!hasMessages ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="rounded-full border border-input px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => void sendMessage(suggestion)}
                  disabled={isSending}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="mt-4 flex flex-col gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage(draft);
            }}
          >
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about weather, crops, markets, or schemes..."
              rows={2}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage(draft);
                }
              }}
              disabled={isSending}
            />

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              {speechRecognition.isSupported ? (
                <Button
                  type="button"
                  variant={
                    speechRecognition.isListening ? "danger" : "secondary"
                  }
                  size="sm"
                  leadingIcon={
                    speechRecognition.isListening ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )
                  }
                  onClick={toggleListening}
                  disabled={isSending}
                >
                  {speechRecognition.isListening ? "Stop" : "Speak"}
                </Button>
              ) : (
                <span />
              )}

              <Button
                type="submit"
                size="sm"
                leadingIcon={<Send className="h-4 w-4" />}
                disabled={isSending || draft.trim().length === 0}
              >
                Send
              </Button>
            </div>
          </form>
        </SectionCard>
      </div>
    </AppShell>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-primary-foreground"
            : "max-w-[85%] rounded-2xl rounded-bl-sm bg-secondary px-4 py-2.5 text-secondary-foreground"
        }
      >
        <div className="mb-1 flex items-center gap-1.5 text-xs opacity-70">
          {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
          {isUser ? "You" : "Assistant"}
        </div>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        {message.toolsUsed && message.toolsUsed.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.toolsUsed.map((tool) => (
              <Badge key={tool} tone="info">
                {tool}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
