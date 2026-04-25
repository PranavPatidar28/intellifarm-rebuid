"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Mic, Plus, Volume2, VolumeX } from "lucide-react";
import useSWR from "swr";

import { AppShell } from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskCallout } from "@/components/ui/risk-callout";
import { SourceBadge } from "@/components/ui/source-badge";
import { Textarea } from "@/components/ui/textarea";
import { apiGet, apiPost } from "@/lib/api";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { useTextToSpeech } from "@/lib/use-text-to-speech";

type ThreadsResponse = {
  threads: Array<{
    id: string;
    title: string;
    updatedAt: string;
    messageCount: number;
  }>;
};

type ThreadResponse = {
  thread: {
    id: string;
    title: string | null;
    updatedAt: string;
    messages: Array<{
      id: string;
      role: "USER" | "ASSISTANT";
      content: string;
      sources: Array<{
        type: string;
        label: string;
        referenceId?: string;
      }>;
      safetyFlags: string[];
      createdAt: string;
    }>;
  };
};

export default function AssistantPage() {
  return (
    <AuthGate>
      <AssistantContent />
    </AuthGate>
  );
}

function AssistantContent() {
  const { data: threadsData, mutate: mutateThreads } = useSWR(
    "/assistant/threads",
    () => apiGet<ThreadsResponse>("/assistant/threads"),
  );
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const speechRecognition = useSpeechRecognition();
  const speech = useTextToSpeech();

  useEffect(() => {
    if (!activeThreadId && threadsData?.threads.length) {
      setActiveThreadId(threadsData.threads[0].id);
    }
  }, [activeThreadId, threadsData]);

  useEffect(() => {
    if (speechRecognition.transcript) {
      setDraft((current) =>
        [current.trim(), speechRecognition.transcript]
          .filter(Boolean)
          .join(" "),
      );
      speechRecognition.setTranscript("");
    }
  }, [speechRecognition, speechRecognition.transcript]);

  const activeThreadPath = activeThreadId
    ? `/assistant/threads/${activeThreadId}`
    : null;
  const { data: threadData, mutate: mutateThread } = useSWR(
    activeThreadPath,
    activeThreadPath ? () => apiGet<ThreadResponse>(activeThreadPath) : null,
  );

  const threadTitle = useMemo(
    () => threadData?.thread.title ?? "Grounded farming assistant",
    [threadData],
  );

  const startNewThread = async () => {
    setMessage(null);

    try {
      const response = await apiPost<ThreadResponse>("/assistant/threads", {});
      setActiveThreadId(response.thread.id);
      setDraft("");
      await mutateThreads();
    } catch {
      setMessage("Could not start a new thread right now.");
    }
  };

  const sendMessage = async () => {
    if (!draft.trim()) {
      setMessage("Type or record a question first.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      let threadId = activeThreadId;

      if (!threadId) {
        const createdThread = await apiPost<ThreadResponse>(
          "/assistant/threads",
          {},
        );
        threadId = createdThread.thread.id;
        setActiveThreadId(threadId);
      }

      await apiPost(`/assistant/threads/${threadId}/messages`, {
        content: draft.trim(),
      });
      setDraft("");
      await Promise.all([mutateThreads(), mutateThread()]);
    } catch {
      setMessage("The assistant could not respond right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Grounded assistant"
      description="Ask about your season, weather, market context, or schemes. The assistant stays tied to saved farm data and flags risky requests clearly."
      eyebrow="Support"
      actions={
        <Button
          type="button"
          variant="secondary"
          leadingIcon={<Plus className="h-4 w-4" />}
          onClick={startNewThread}
        >
          New thread
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_320px]">
        <SectionCard title="Threads" eyebrow="Recent questions" variant="glass">
          <div className="space-y-3">
            {threadsData?.threads.length ? (
              threadsData.threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full rounded-[var(--radius-card)] border p-4 text-left transition ${
                    activeThreadId === thread.id
                      ? "border-[rgba(30,90,60,0.2)] bg-[var(--brand-soft)]"
                      : "surface-card"
                  }`}
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {thread.title}
                  </p>
                  <p className="mt-2 text-sm muted">
                    {thread.messageCount} messages
                  </p>
                </button>
              ))
            ) : (
              <EmptyState
                title="No assistant history yet"
                description="Start with a grounded question about irrigation timing, nearby markets, or what to review this week."
              />
            )}
          </div>
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title={threadTitle} eyebrow="Grounded chat">
            <div className="space-y-4">
              {threadData?.thread.messages.length ? (
                threadData.thread.messages.map((item) => (
                  <article
                    key={item.id}
                    className={`rounded-[var(--radius-card)] border p-4 ${
                      item.role === "ASSISTANT"
                        ? "surface-card"
                        : "border-[rgba(30,90,60,0.18)] bg-[var(--brand-soft)]"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[var(--brand)] shadow-[var(--shadow-1)]">
                          {item.role === "ASSISTANT" ? (
                            <Bot className="h-4 w-4" />
                          ) : (
                            "Q"
                          )}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--foreground)]">
                            {item.role === "ASSISTANT" ? "Assistant" : "You"}
                          </p>
                          <p className="text-xs muted">
                            {item.role === "ASSISTANT"
                              ? "Grounded by saved farm context"
                              : "Question draft sent from this workspace"}
                          </p>
                        </div>
                      </div>
                      {item.role === "ASSISTANT" && speech.isSupported ? (
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
                          onClick={() =>
                            speech.isSpeaking
                              ? speech.stop()
                              : speech.speak(item.content)
                          }
                        >
                          {speech.isSpeaking ? "Stop audio" : "Read aloud"}
                        </Button>
                      ) : null}
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--foreground-soft)]">
                      {item.content}
                    </p>

                    {item.sources.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.sources.map((source) => (
                          <SourceBadge
                            key={`${item.id}-${source.label}`}
                            label={source.label}
                          />
                        ))}
                      </div>
                    ) : null}

                    {item.safetyFlags.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.safetyFlags.map((flag) => (
                          <Badge key={`${item.id}-${flag}`} tone="danger">
                            {flag.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))
              ) : (
                <EmptyState
                  title="Ask a grounded question"
                  description="Try: What should I review this week for my crop stage? or Which nearby mandi looks better today?"
                />
              )}
            </div>
          </SectionCard>

          <SectionCard title="Ask a grounded question" eyebrow="Voice and text">
            <div className="space-y-4">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={5}
                placeholder="Example: My cotton is at flowering and the weather looks hot. What should I review this week?"
              />
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="primary"
                  disabled={isSubmitting}
                  onClick={sendMessage}
                >
                  {isSubmitting ? "Sending..." : "Send"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  leadingIcon={<Mic className="h-4 w-4" />}
                  onClick={() =>
                    speechRecognition.isListening
                      ? speechRecognition.stopListening()
                      : speechRecognition.startListening()
                  }
                >
                  {speechRecognition.isListening
                    ? "Stop voice typing"
                    : "Voice typing"}
                </Button>
              </div>
              {speechRecognition.error ? (
                <p className="text-sm font-medium text-[var(--danger)]">
                  {speechRecognition.error}
                </p>
              ) : null}
              {message ? (
                <p className="text-sm font-medium text-[var(--danger)]">{message}</p>
              ) : null}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <RiskCallout title="Trust cues" tone="info">
            Assistant answers should be read with the attached sources and safety
            flags. Treat them as grounded guidance, not blind chemical instructions.
          </RiskCallout>
          <SectionCard title="How to ask better" eyebrow="Prompt quality" variant="glass">
            <div className="space-y-3 text-sm leading-6 muted">
              <p>Include crop stage, weather pattern, and the decision you need.</p>
              <p>Ask for comparisons when deciding between markets or schemes.</p>
              <p>Use disease help for image-based symptom triage instead of chat.</p>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
