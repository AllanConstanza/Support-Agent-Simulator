"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { NotebookPen, Send } from "lucide-react";

import type { Message } from "@/lib/types";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ChatPanel({ incidentId }: { incidentId: number }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [isWorkNote, setIsWorkNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await api.listMessages(incidentId);
      setMessages(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft("");

    const optimisticMessage: Message = {
      id: -Date.now(),
      incident_id: incidentId,
      sender: "agent",
      body,
      is_work_note: isWorkNote,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      if (isWorkNote) {
        const res = await api.postWorkNote(incidentId, body);
        setMessages((prev) => [...prev.filter((m) => m.id !== optimisticMessage.id), res.message]);
        setSending(false);
        return;
      }

      const res = await fetch(`${api.apiUrl}/incidents/${incidentId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, is_work_note: false }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Failed to send message");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      setStreamingText("");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.type === "token") {
            accumulated += payload.text;
            setStreamingText(accumulated);
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          } else if (payload.type === "done") {
            await load();
            setStreamingText(null);
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setStreamingText(null);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-sm font-semibold">Conversation</h2>
        <span className="text-xs text-muted-foreground">Live chat with customer</span>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        <div className="flex flex-col gap-3">
          {loading && <p className="text-xs text-muted-foreground">Loading conversation…</p>}
          {!loading && messages.length === 0 && (
            <p className="text-xs text-muted-foreground">No messages yet.</p>
          )}
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} />
          ))}
          {streamingText !== null && (
            <ChatBubble
              message={{
                id: -1,
                incident_id: incidentId,
                sender: "client_ai",
                body: streamingText || "…",
                is_work_note: false,
                created_at: new Date().toISOString(),
              }}
              typing={streamingText === ""}
            />
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="mb-2 flex items-center gap-2">
          <Switch id="work-note" checked={isWorkNote} onCheckedChange={setIsWorkNote} />
          <Label htmlFor="work-note" className="flex items-center gap-1 text-xs text-muted-foreground">
            <NotebookPen className="h-3.5 w-3.5" />
            Post as internal work note (not visible to customer)
          </Label>
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              isWorkNote
                ? "Add an internal note for other agents..."
                : "Type a reply to the customer..."
            }
            rows={2}
            className={cn("resize-none", isWorkNote && "border-amber-400 bg-amber-50 dark:bg-amber-950/30")}
          />
          <Button onClick={handleSend} disabled={sending || !draft.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message, typing }: { message: Message; typing?: boolean }) {
  if (message.is_work_note) {
    return (
      <div className="mx-auto w-full max-w-[90%] rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        <div className="mb-0.5 flex items-center gap-1 font-medium">
          <NotebookPen className="h-3 w-3" />
          Work note · {format(new Date(message.created_at), "h:mm a")}
        </div>
        {message.body}
      </div>
    );
  }

  const isCustomer = message.sender === "client_ai";
  return (
    <div className={cn("flex", isCustomer ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[75%] rounded-lg px-3 py-2 text-sm",
          isCustomer
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p
          className={cn(
            "mt-1 text-[10px]",
            isCustomer ? "text-muted-foreground" : "text-primary-foreground/70",
          )}
        >
          {typing ? "customer is typing…" : format(new Date(message.created_at), "h:mm a")}
        </p>
      </div>
    </div>
  );
}
