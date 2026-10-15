import { getSupabaseBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface CitationItemDto {
  title: string;
  source: string;
  url?: string;
  retrieval_date: string;
  snippet: string;
}

export interface AssistantMessageDto {
  id: string;
  conversation_id: string;
  user_id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations: CitationItemDto[];
  is_emergency: boolean;
  is_mock: boolean;
  model_used?: string;
  created_at: string;
}

export interface ConversationDto {
  id: string;
  user_id?: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview?: string;
}

export interface ConversationDetailDto {
  conversation: ConversationDto;
  messages: AssistantMessageDto[];
}

export interface SuggestedPromptDto {
  id: string;
  category: string;
  prompt: string;
  description: string;
}

export interface AssistantChatResponseDto {
  conversation_id: string;
  user_message: AssistantMessageDto;
  assistant_message: AssistantMessageDto;
  disclaimer: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
      }
    } catch {
      // In demo mode or if auth is not initialized, proceed with default headers
    }
  }
  return headers;
}

export async function fetchConversations(): Promise<ConversationDto[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/assistant/conversations`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend /assistant/conversations unreachable, fallback to default.", err);
    return [
      {
        id: "conv-demo-welcome",
        title: "Prescription & Medication Guidance",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 2,
        last_message_preview: "Metformin is an oral medication that helps manage blood glucose...",
      },
    ];
  }
}

export async function createConversation(
  title?: string,
  initialMessage?: string
): Promise<ConversationDto> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/assistant/conversations`, {
      method: "POST",
      headers,
      body: JSON.stringify({ title, initial_message: initialMessage }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Failed creating conversation via backend:", err);
    return {
      id: `conv-${Date.now()}`,
      title: title || "New Healthcare Conversation",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      message_count: 0,
      last_message_preview: undefined,
    };
  }
}

export async function fetchConversationDetail(
  conversationId: string
): Promise<ConversationDetailDto> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Failed fetching conversation detail:", err);
    return {
      conversation: {
        id: conversationId,
        title: "Healthcare Chat",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        message_count: 1,
      },
      messages: [
        {
          id: "msg-welcome-fallback",
          conversation_id: conversationId,
          role: "assistant",
          content:
            "Hello! I am MediMate AI, your personal healthcare assistant. You can ask me about your prescriptions, upcoming appointments, or general medication safety guidelines.",
          citations: [],
          is_emergency: false,
          is_mock: true,
          model_used: "mock-medical-llm-v1",
          created_at: new Date().toISOString(),
        },
      ],
    };
  }
}

export async function renameConversation(
  conversationId: string,
  title: string
): Promise<ConversationDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error(`Failed to rename conversation HTTP ${res.status}`);
  return await res.json();
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Failed to delete conversation HTTP ${res.status}`);
  return true;
}

export async function clearConversationMessages(conversationId: string): Promise<boolean> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}/clear`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error(`Failed to clear conversation HTTP ${res.status}`);
  return true;
}

export async function sendMessage(
  conversationId: string,
  message: string
): Promise<AssistantChatResponseDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, stream: false }),
  });
  if (!res.ok) throw new Error(`Message failed HTTP ${res.status}`);
  return await res.json();
}

export async function streamMessage(
  conversationId: string,
  message: string,
  callbacks: {
    onStart?: (meta: { citations: CitationItemDto[]; is_emergency: boolean; is_mock: boolean; model_used?: string }) => void;
    onChunk: (textChunk: string) => void;
    onDone?: (info: { message_id: string }) => void;
    onError?: (error: any) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const headers = await getAuthHeaders();

  const response = await fetch(`${API_BASE}/assistant/conversations/${conversationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, stream: true }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Streaming failed HTTP ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("ReadableStream not supported by browser environment.");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n\n");
    buffer = lines.pop() || "";

    for (const block of lines) {
      for (const line of block.split("\n")) {
        if (line.startsWith("data: ")) {
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const data = JSON.parse(raw);
            if (data.type === "start" && callbacks.onStart) {
              callbacks.onStart(data);
            } else if (data.type === "chunk" && callbacks.onChunk) {
              callbacks.onChunk(data.text || "");
            } else if (data.type === "done" && callbacks.onDone) {
              callbacks.onDone(data);
            }
          } catch (e) {
            console.warn("Error parsing SSE JSON chunk:", e);
          }
        }
      }
    }
  }
}

export async function retryLastMessage(
  conversationId: string
): Promise<AssistantChatResponseDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/assistant/conversations/${conversationId}/retry`, {
    method: "POST",
    headers,
  });
  if (!res.ok) throw new Error(`Retry failed HTTP ${res.status}`);
  return await res.json();
}

export async function fetchSuggestedPrompts(): Promise<SuggestedPromptDto[]> {
  try {
    const res = await fetch(`${API_BASE}/assistant/suggested-prompts`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.prompts || [];
  } catch (err) {
    console.warn("Could not fetch suggested prompts from backend:", err);
    return [
      {
        id: "p1",
        category: "Prescriptions",
        prompt: "Help me understand my prescription instructions.",
        description: "Decode dosage abbreviations, food timing, and administration instructions.",
      },
      {
        id: "p2",
        category: "Education",
        prompt: "What does this medicine information mean?",
        description: "Learn about active ingredients, intended benefits, and common side effects.",
      },
      {
        id: "p3",
        category: "Schedule",
        prompt: "Show my upcoming appointments.",
        description: "Review scheduled physician visits, clinic locations, and specialties.",
      },
      {
        id: "p4",
        category: "Consultation",
        prompt: "Help me prepare questions for my doctor.",
        description: "Generate focused clinical questions about your current treatment plan.",
      },
      {
        id: "p5",
        category: "Adherence",
        prompt: "Explain how medication reminders work.",
        description: "Discover how dose scheduling, advance alerts, and adherence tracking work.",
      },
    ];
  }
}
