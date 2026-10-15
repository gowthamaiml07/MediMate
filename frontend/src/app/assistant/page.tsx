"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  Sparkles,
  Send,
  Square,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  X,
  History,
  ShieldCheck,
  PhoneCall
} from "lucide-react";
import {
  fetchConversations,
  createConversation,
  fetchConversationDetail,
  renameConversation,
  deleteConversation,
  clearConversationMessages,
  sendMessage,
  streamMessage,
  retryLastMessage,
  fetchSuggestedPrompts,
  ConversationDto,
  AssistantMessageDto,
  SuggestedPromptDto,
  CitationItemDto
} from "@/lib/assistantApi";

export default function AssistantPage() {
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [currentConvTitle, setCurrentConvTitle] = useState<string>("Healthcare Chat");
  const [messages, setMessages] = useState<AssistantMessageDto[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedPromptDto[]>([]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [streamMeta, setStreamMeta] = useState<{
    citations: CitationItemDto[];
    is_emergency: boolean;
    is_mock: boolean;
    model_used?: string;
  } | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [expandedCitationMsgId, setExpandedCitationMsgId] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamBuffer, isStreaming]);

  // Initial load: Fetch conversations and suggested prompts
  useEffect(() => {
    async function init() {
      try {
        const [convList, prompts] = await Promise.all([
          fetchConversations(),
          fetchSuggestedPrompts(),
        ]);
        setConversations(convList);
        setSuggestedPrompts(prompts);

        if (convList.length > 0) {
          const first = convList[0];
          setCurrentConvId(first.id);
          setCurrentConvTitle(first.title);
          loadConversation(first.id);
        } else {
          handleNewChat();
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    }
    init();
  }, []);

  const loadConversation = async (convId: string) => {
    setIsLoading(true);
    setErrorBanner(null);
    try {
      const detail = await fetchConversationDetail(convId);
      setCurrentConvId(detail.conversation.id);
      setCurrentConvTitle(detail.conversation.title);
      setMessages(detail.messages);
    } catch (err) {
      console.error("Failed loading conversation:", err);
      setErrorBanner("Unable to load conversation messages. Please retry.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = async () => {
    setErrorBanner(null);
    try {
      const newConv = await createConversation("New Healthcare Conversation");
      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
      setCurrentConvId(newConv.id);
      setCurrentConvTitle(newConv.title);
      setMessages([]);
      setIsSidebarOpen(false);
      inputRef.current?.focus();
    } catch (err) {
      console.error("Error creating new conversation:", err);
      setErrorBanner("Failed to create new conversation.");
    }
  };

  const handleSelectConversation = (conv: ConversationDto) => {
    if (conv.id === currentConvId) return;
    setCurrentConvId(conv.id);
    setCurrentConvTitle(conv.title);
    setIsSidebarOpen(false);
    loadConversation(conv.id);
  };

  const handleRename = async () => {
    if (!currentConvId || !editTitleValue.trim()) {
      setIsEditingTitle(false);
      return;
    }
    try {
      const updated = await renameConversation(currentConvId, editTitleValue.trim());
      setCurrentConvTitle(updated.title);
      setConversations((prev) =>
        prev.map((c) => (c.id === updated.id ? { ...c, title: updated.title } : c))
      );
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setIsEditingTitle(false);
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      await deleteConversation(convId);
      const remaining = conversations.filter((c) => c.id !== convId);
      setConversations(remaining);

      if (convId === currentConvId) {
        if (remaining.length > 0) {
          setCurrentConvId(remaining[0].id);
          setCurrentConvTitle(remaining[0].title);
          loadConversation(remaining[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Delete failed:", err);
      setErrorBanner("Failed to delete conversation.");
    }
  };

  const handleClearChat = async () => {
    if (!currentConvId) return;
    if (!confirm("Clear all messages in this conversation?")) return;

    try {
      await clearConversationMessages(currentConvId);
      setMessages([]);
    } catch (err) {
      console.error("Clear chat failed:", err);
      setErrorBanner("Failed to clear conversation messages.");
    }
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);

    // If there was buffered text, commit it as a completed message
    if (streamBuffer.trim() && currentConvId) {
      const committedMsg: AssistantMessageDto = {
        id: `msg-${Date.now()}`,
        conversation_id: currentConvId,
        role: "assistant",
        content: streamBuffer,
        citations: streamMeta?.citations || [],
        is_emergency: streamMeta?.is_emergency || false,
        is_mock: streamMeta?.is_mock || true,
        model_used: streamMeta?.model_used || "interrupted",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, committedMsg]);
    }
    setStreamBuffer("");
    setStreamMeta(null);
  };

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText || input).trim();
    if (!textToSend || !currentConvId || isStreaming) return;

    setErrorBanner(null);
    setInput("");

    // Optimistically add user message
    const tempUserMsg: AssistantMessageDto = {
      id: `temp-user-${Date.now()}`,
      conversation_id: currentConvId,
      role: "user",
      content: textToSend,
      citations: [],
      is_emergency: false,
      is_mock: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsStreaming(true);
    setStreamBuffer("");
    setStreamMeta(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulated = "";

    try {
      await streamMessage(
        currentConvId,
        textToSend,
        {
          onStart: (meta) => {
            setStreamMeta(meta);
          },
          onChunk: (chunk) => {
            accumulated += chunk;
            setStreamBuffer((prev) => prev + chunk);
          },
          onDone: (doneInfo) => {
            const completedMsg: AssistantMessageDto = {
              id: doneInfo.message_id || `msg-${Date.now()}`,
              conversation_id: currentConvId,
              role: "assistant",
              content: accumulated,
              citations: streamMeta?.citations || [],
              is_emergency: streamMeta?.is_emergency || false,
              is_mock: streamMeta?.is_mock ?? true,
              model_used: streamMeta?.model_used || "mock-medical-llm-v1",
              created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, completedMsg]);
            setStreamBuffer("");
            setStreamMeta(null);
            setIsStreaming(false);

            // Update conversation list preview
            setConversations((prev) =>
              prev.map((c) =>
                c.id === currentConvId
                  ? {
                      ...c,
                      message_count: c.message_count + 2,
                      last_message_preview: accumulated.slice(0, 80),
                      updated_at: new Date().toISOString(),
                    }
                  : c
              )
            );
          },
          onError: (err) => {
            console.error("Stream chunk error:", err);
            setErrorBanner("Streaming interrupted. Retrying with non-streaming fallback...");
          },
        },
        controller.signal
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Stream aborted by user.");
        return;
      }
      console.warn("Streaming failed or unsupported, fallback to standard POST:", err);

      // Fallback to non-streaming POST
      try {
        const res = await sendMessage(currentConvId, textToSend);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          res.user_message,
          res.assistant_message,
        ]);
        setStreamBuffer("");
        setStreamMeta(null);
      } catch (fallbackErr: any) {
        console.error("Standard POST also failed:", fallbackErr);
        setErrorBanner(
          fallbackErr.message || "Failed to reach MediMate AI assistant. Please check connection."
        );
      } finally {
        setIsStreaming(false);
      }
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleRetry = async () => {
    if (!currentConvId || isStreaming) return;
    setIsStreaming(true);
    setStreamBuffer("");
    setStreamMeta(null);
    setErrorBanner(null);

    try {
      const res = await retryLastMessage(currentConvId);
      // Replace the messages with the updated history
      const detail = await fetchConversationDetail(currentConvId);
      setMessages(detail.messages);
    } catch (err: any) {
      console.error("Retry failed:", err);
      setErrorBanner("Failed to retry response. Please send your question again.");
    } finally {
      setIsStreaming(false);
    }
  };

  const lastAssistantMsg = messages.filter((m) => m.role === "assistant").slice(-1)[0];

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-120px)] max-w-7xl mx-auto gap-4 relative">
        {/* =================================================================== */}
        {/* 1. Conversations Drawer / Sidebar */}
        {/* =================================================================== */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200/90 shadow-lg p-4 flex flex-col transition-transform duration-300 ease-in-out
            md:static md:z-0 md:shadow-xs md:rounded-3xl md:border
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {/* Sidebar Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">Chat History</h2>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              aria-label="Close history drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Consultation</span>
          </button>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto mt-3 space-y-1.5 pr-1 no-scrollbar">
            {conversations.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No past consultations yet.
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = conv.id === currentConvId;
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`group relative flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all border ${
                      isActive
                        ? "bg-blue-50/80 border-blue-200 text-blue-900 font-semibold shadow-2xs"
                        : "hover:bg-slate-50 border-transparent text-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-2 overflow-hidden flex-1 pr-2">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                          isActive ? "text-blue-600" : "text-slate-400"
                        }`}
                      />
                      <div className="truncate">
                        <p className="truncate leading-tight">{conv.title}</p>
                        {conv.last_message_preview && (
                          <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                            {conv.last_message_preview}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200/60"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Safety Disclaimer in Sidebar */}
          <div className="mt-3 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>HIPAA-aligned & tenant-isolated encryption</span>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 z-30 md:hidden backdrop-blur-2xs"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* =================================================================== */}
        {/* 2. Main Chat Area */}
        {/* =================================================================== */}
        <main className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          {/* Header Bar */}
          <header className="px-4 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/80 backdrop-blur-xs">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Open history sidebar"
              >
                <History className="w-4 h-4" />
              </button>

              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>

              <div>
                {isEditingTitle ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={editTitleValue}
                      onChange={(e) => setEditTitleValue(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename()}
                      autoFocus
                      className="text-xs sm:text-sm font-bold text-slate-900 border border-blue-400 rounded-md px-2 py-0.5 focus:outline-none"
                    />
                    <button
                      onClick={handleRename}
                      className="text-[11px] bg-blue-600 text-white px-2 py-0.5 rounded font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditingTitle(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-700 px-1"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 leading-tight truncate max-w-[200px] sm:max-w-md">
                      {currentConvTitle}
                    </h1>
                    <button
                      onClick={() => {
                        setEditTitleValue(currentConvTitle);
                        setIsEditingTitle(true);
                      }}
                      className="p-1 text-slate-400 hover:text-blue-600 rounded hover:bg-blue-50 transition-colors"
                      title="Rename conversation"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span>Authoritative Medical Verification</span>
                  <span>•</span>
                  <span>Patient Health Record Scoped</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Mock Status Badge */}
              <div
                className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-100 text-blue-700 rounded-full text-[11px] font-semibold"
                title="MediMate local healthcare engine active"
              >
                <Info className="w-3 h-3 text-blue-500" />
                <span>Verified Assistant</span>
              </div>

              {/* Clear messages action */}
              {messages.length > 0 && (
                <button
                  onClick={handleClearChat}
                  className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-slate-200/80 cursor-pointer"
                  title="Clear conversation history"
                >
                  Clear Chat
                </button>
              )}
            </div>
          </header>

          {/* Error Banner */}
          {errorBanner && (
            <div className="mx-4 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorBanner}</span>
              </div>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-rose-600 hover:text-rose-800 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-12">
                <Sparkles className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs">Loading patient consultation...</span>
              </div>
            ) : messages.length === 0 && !isStreaming ? (
              /* Welcome State matching screen reference */
              <div className="max-w-xl mx-auto py-8 sm:py-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    How can I assist your health today?
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    I provide medication guidance, appointment scheduling details, and clinical explanations
                    cross-referenced with your confirmed health records and official monographs.
                  </p>
                </div>

                <div className="pt-2 text-left space-y-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                    Suggested Questions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {suggestedPrompts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleSend(p.prompt)}
                        className="p-3 text-left bg-slate-50 hover:bg-blue-50/80 hover:border-blue-200 border border-slate-200/80 rounded-2xl transition-all shadow-2xs group cursor-pointer"
                      >
                        <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-700">
                          {p.prompt}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {p.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Render Messages List */
              messages.map((m) => {
                const isUser = m.role === "user";
                const isEmergency = m.is_emergency;

                return (
                  <div
                    key={m.id}
                    className={`flex ${isUser ? "justify-end" : "justify-start"} group`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mr-2.5 mt-1 shadow-2xs">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed transition-all ${
                        isUser
                          ? "bg-blue-600 text-white shadow-xs font-medium rounded-tr-xs"
                          : isEmergency
                          ? "bg-rose-50/90 border border-rose-300 text-slate-900 rounded-tl-xs shadow-xs"
                          : "bg-slate-50/90 border border-slate-200/90 text-slate-800 rounded-tl-xs shadow-xs"
                      }`}
                    >
                      {/* Emergency Badge Alert */}
                      {isEmergency && (
                        <div className="mb-3 p-2.5 bg-rose-100/80 border border-rose-300 rounded-xl text-rose-900 text-xs font-semibold flex items-center gap-2">
                          <PhoneCall className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Emergency Medical Care Required</span>
                        </div>
                      )}

                      {/* Message Content */}
                      <div className="whitespace-pre-line prose prose-sm max-w-none">
                        {m.content}
                      </div>

                      {/* Authoritative Citations Accordion */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[11px]">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedCitationMsgId(
                                expandedCitationMsgId === m.id ? null : m.id
                              )
                            }
                            className="flex items-center gap-1.5 text-blue-700 font-semibold hover:underline cursor-pointer"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>
                              {m.citations.length} Verified Medical{" "}
                              {m.citations.length === 1 ? "Citation" : "Citations"}
                            </span>
                            {expandedCitationMsgId === m.id ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {expandedCitationMsgId === m.id && (
                            <div className="mt-2 space-y-2 pt-1">
                              {m.citations.map((c, idx) => (
                                <div
                                  key={idx}
                                  className="p-2.5 bg-white border border-slate-200/80 rounded-xl text-slate-700 shadow-2xs"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="font-semibold text-slate-900 leading-snug">
                                      {c.title}
                                    </p>
                                    {c.url && (
                                      <a
                                        href={c.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 shrink-0"
                                        title="View official government monograph"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-blue-600 mt-0.5">
                                    Source: {c.source}
                                  </p>
                                  <p className="text-[11px] text-slate-600 mt-1.5 leading-relaxed italic border-l-2 border-blue-400 pl-2">
                                    "{c.snippet}"
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Footer Actions (Copy, Retry, Mock label) */}
                      {!isUser && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400">
                          <div className="flex items-center gap-2">
                            {m.is_mock && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200/60 text-slate-600 text-[9px]">
                                Mock Mode
                              </span>
                            )}
                            <span>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCopy(m.content, m.id)}
                              className="flex items-center gap-1 hover:text-slate-700 transition-colors p-1"
                              title="Copy answer"
                            >
                              {copiedMsgId === m.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600">Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Show Retry on the latest assistant turn */}
                            {lastAssistantMsg?.id === m.id && (
                              <button
                                onClick={handleRetry}
                                className="flex items-center gap-1 hover:text-blue-600 transition-colors p-1 cursor-pointer"
                                title="Regenerate this response"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Retry</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Live Streaming Assistant Bubble */}
            {isStreaming && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mr-2.5 mt-1 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <div className="max-w-[85%] sm:max-w-[80%] rounded-2xl rounded-tl-xs p-4 text-xs sm:text-sm bg-slate-50 border border-slate-200/90 text-slate-800 shadow-xs">
                  <div className="whitespace-pre-line prose prose-sm max-w-none">
                    {streamBuffer ? (
                      <>
                        {streamBuffer}
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-blue-600 animate-pulse" />
                      </>
                    ) : (
                      <span className="text-slate-400 italic">
                        MediMate AI is synthesizing clinical guidelines...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ================================================================= */}
          {/* 3. Input & Control Bar */}
          {/* ================================================================= */}
          <footer className="p-3 sm:p-4 border-t border-slate-100 bg-white space-y-2 shrink-0">
            {/* Quick Prompt Starters Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {suggestedPrompts.slice(0, 4).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSend(p.prompt)}
                  disabled={isStreaming}
                  className="text-[11px] bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full whitespace-nowrap transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {p.prompt}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center bg-white border border-slate-200/90 rounded-2xl shadow-xs p-1.5 pr-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition-all"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about medications, appointments, or prescriptions..."
                disabled={isStreaming}
                className="flex-1 px-3.5 py-2 text-xs sm:text-sm text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none disabled:opacity-60"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-white" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              )}
            </form>

            {/* Medical Safety Disclaimer Footer */}
            <p className="text-[10px] text-slate-400 text-center leading-tight">
              MediMate AI provides health education and organizational assistance only. Never disregard
              professional clinical guidance or delay seeking emergency medical care.
            </p>
          </footer>
        </main>
      </div>
    </AppLayout>
  );
}
