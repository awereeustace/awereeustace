"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "Find me a cheap flight to Europe",
  "What's the best deal under $200?",
  "Plan a 5-day Tokyo trip",
  "How do I save on hotels?",
];

const AI_RESPONSES: Record<string, string> = {
  default: "Great question! Based on current deals, I recommend checking our featured flights and hotel packages. Use code SAVE10 for an extra 10% off.",
  europe: "For Europe, our best deal right now is the Paris flight at $199 from NYC. Book early for the best rates! Try code SUMMER25 for $25 off.",
  tokyo: "Tokyo hotels start at $99/night. For a 5-day trip, budget around $500–$800 including flights. The Hotel in Tokyo deal is excellent value!",
  cheap: "The cheapest deals right now: Hotel in Tokyo at $99/night and Road Trip Package at $149. Use HOTEL20 for 20% off hotels!",
  hotel: "Top hotel tip: book mid-week for up to 30% savings. Our Bali Resort and Tokyo Hotel are top-rated. Apply HOTEL20 at checkout!",
  plan: "I can help plan your trip! Tell me your destination, dates, and budget and I'll find the best deals for you.",
};

function getResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("europe") || lower.includes("paris") || lower.includes("rome")) return AI_RESPONSES.europe;
  if (lower.includes("tokyo") || lower.includes("japan")) return AI_RESPONSES.tokyo;
  if (lower.includes("cheap") || lower.includes("under") || lower.includes("best deal")) return AI_RESPONSES.cheap;
  if (lower.includes("hotel")) return AI_RESPONSES.hotel;
  if (lower.includes("plan") || lower.includes("itinerary")) return AI_RESPONSES.plan;
  return AI_RESPONSES.default;
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", text: "Hi! I'm your OnBajet AI travel assistant. Ask me anything about deals, destinations, or trip planning! ✈️" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "ai", text: getResponse(text) }]);
      setLoading(false);
    }, 800);
  }

  return (
    <div className="flex h-96 flex-col">
      <div className="border-b bg-green-600 px-4 py-2">
        <p className="font-semibold text-white">✨ AI Travel Assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                m.role === "user"
                  ? "bg-green-600 text-white rounded-br-none"
                  : "bg-gray-100 text-gray-800 rounded-bl-none"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-none bg-gray-100 px-4 py-2 text-sm text-gray-500">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="shrink-0 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-700 hover:bg-green-100"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="border-t p-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about deals or destinations..."
          onKeyDown={(e) => e.key === "Enter" && send(input)}
        />
        <Button
          onClick={() => send(input)}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 shrink-0"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
