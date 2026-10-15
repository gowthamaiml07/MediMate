"use client";

import React, { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockInitialMessages } from "@/lib/mockData";
import { ChatMessage } from "@/types";
import { Sparkles, Send, BookOpen, Info } from "lucide-react";

export default function AssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(mockInitialMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(100);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    idCounter.current += 1;
    const userMsg: ChatMessage = {
      id: `msg-${idCounter.current}`,
      role: "user",
      content: query,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    // AI intelligent answer synthesis simulation
    setTimeout(() => {
      let replyContent = "";
      let sources = ["MediMate Patient Health Record", "Clinical Drug Reference"];
      const q = query.toLowerCase();

      if (q.includes("metformin")) {
        replyContent = `Metformin is a medicine used to help control blood sugar levels, mainly in type 2 diabetes. It works by improving how your body uses insulin and reducing glucose production by the liver.

**Common side effects (general):**
• Stomach upset
• Nausea
• Diarrhea

Taking it with meals significantly reduces gastrointestinal discomfort.`;
        sources = [
          "Prescription #rx-sample-001 (Dr. R. Mehta)",
          "FDA Drug Information",
        ];
      } else if (q.includes("vitamin d3") || q.includes("vitamin")) {
        replyContent = `Vitamin D3 1000 IU supports calcium absorption, bone strength, and immune resistance.

**Key Guidance:**
• Your prescription specifies once weekly with food
• Best absorbed alongside dietary healthy fats (e.g., during breakfast or lunch)
• Common side effects are rare at this dosage`;
        sources = ["Prescription #rx-sample-001", "Nutritional Medicine Monograph"];
      } else if (q.includes("atorvastatin") || q.includes("cholesterol")) {
        replyContent = `Atorvastatin 10mg is a statin that manages cholesterol levels to safeguard cardiovascular health.

**Instructions & Precautions:**
• Take once daily at night as prescribed
• Avoid excessive quantities of grapefruit juice
• Let Dr. Kumar know if you experience unusual muscle fatigue`;
        sources = ["Prescription #rx-sample-001", "American Heart Association"];
      } else if (q.includes("appointment") || q.includes("kumar")) {
        replyContent = `Your next appointment is with **Dr. S. Kumar (General Physician)** scheduled for **12 Sep 2025 at 10:30 AM** at Apollo Clinic.

You can generate a Doctor Visit Summary from your navigation menu to carry along confirmed medications and adherence charts.`;
        sources = ["MediMate Appointment Records"];
      } else {
        replyContent = `Regarding "${query}": Based on your active medications (Metformin 500mg BID, Atorvastatin 10mg OD, Vitamin D3 1000IU Weekly), always adhere to your mealtime timings. If you feel any unexpected changes, please reach out directly to your doctor or pharmacist.`;
        sources = ["MediMate Clinical Safety Rulebase"];
      }

      idCounter.current += 1;
      const botMsg: ChatMessage = {
        id: `msg-${idCounter.current}`,
        role: "assistant",
        content: `${replyContent}\n\nNote: This is general information. Your prescription and dosage may be different. Always follow your doctor's instructions.`,
        sources,
        timestamp: "Just now",
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 750);
  };

  const samplePrompts = [
    "What is Metformin used for? Are there any common side effects?",
    "Can I take Vitamin D3 on an empty stomach?",
    "When is my appointment with Dr. Kumar?",
    "How does Atorvastatin help with cholesterol?",
  ];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto h-[calc(100vh-140px)] flex flex-col space-y-4">
        {/* Header matching Screen 9 */}
        <div className="flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 leading-tight">
                AI Assistant / Chat
              </h1>
              <p className="text-[11px] text-slate-400">
                Verified clinical guidelines • Powered by your health data
              </p>
            </div>
          </div>

          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
            <Info className="w-3.5 h-3.5" />
            <span>Context: Priya Sharma</span>
          </div>
        </div>

        {/* Chat Messages Container matching Screen 9 */}
        <div className="flex-1 overflow-y-auto bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mr-2.5 mt-1">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white shadow-xs font-medium rounded-tr-xs"
                      : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-tl-xs shadow-xs"
                  }`}
                >
                  <div className="whitespace-pre-line">{m.content}</div>

                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5">
                      <BookOpen className="w-3 h-3 text-slate-400" />
                      <span>Sources: {m.sources.join(" • ")}</span>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1.5 text-right ${
                      isUser ? "text-blue-200" : "text-slate-400"
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
              <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
              </div>
              <span className="animate-pulse">MediMate AI is generating guidance...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 no-scrollbar">
          {samplePrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              className="text-xs bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full whitespace-nowrap transition-all shadow-2xs shrink-0 cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar matching Screen 9 */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative shrink-0 flex items-center bg-white border border-slate-200/90 rounded-2xl shadow-xs p-1.5 pr-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition-all"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question..."
            className="flex-1 px-3.5 py-2 text-xs sm:text-sm text-slate-900 bg-transparent placeholder-slate-400 focus:outline-none"
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </AppLayout>
  );
}
