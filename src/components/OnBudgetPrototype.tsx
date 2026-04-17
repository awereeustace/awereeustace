"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import AiChat from "@/components/AiChat";

const ALL_DEALS = [
  { id: 1, title: "Flight to Paris", price: 199, category: "flight", emoji: "✈️", from: "NYC", rating: 4.8 },
  { id: 2, title: "Hotel in Tokyo", price: 99, category: "hotel", emoji: "🏨", from: "per night", rating: 4.6 },
  { id: 3, title: "Cruise to Bahamas", price: 349, category: "cruise", emoji: "🚢", from: "Miami", rating: 4.9 },
  { id: 4, title: "Road Trip Package", price: 149, category: "package", emoji: "🚗", from: "LA", rating: 4.4 },
  { id: 5, title: "Bali Resort Stay", price: 129, category: "hotel", emoji: "🌴", from: "per night", rating: 4.7 },
  { id: 6, title: "NYC Weekend Getaway", price: 249, category: "package", emoji: "🗽", from: "Boston", rating: 4.5 },
  { id: 7, title: "Rome Direct Flight", price: 279, category: "flight", emoji: "🏛️", from: "Chicago", rating: 4.3 },
  { id: 8, title: "Cancun All-Inclusive", price: 399, category: "package", emoji: "🌊", from: "Dallas", rating: 4.8 },
];

const COUPONS = [
  { code: "SAVE10", desc: "10% off any booking", expires: "May 31" },
  { code: "SUMMER25", desc: "$25 off flights", expires: "Jun 30" },
  { code: "FREEMEAL", desc: "Free meal on cruise", expires: "Jul 15" },
  { code: "HOTEL20", desc: "20% off hotels", expires: "May 20" },
];

const CATEGORIES = ["all", "flight", "hotel", "cruise", "package"];

export default function OnBudgetPrototype() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState(500);
  const [budget, setBudget] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [saved, setSaved] = useState<number[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const deals = ALL_DEALS.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || d.category === category;
    const matchPrice = d.price <= maxPrice;
    return matchSearch && matchCat && matchPrice;
  });

  function toggleSave(id: number) {
    setSaved((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const budgetNum = parseFloat(budget) || 0;
  const budgetDeals = budgetNum > 0 ? ALL_DEALS.filter((d) => d.price <= budgetNum) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">✈️</span>
            <span className="text-xl font-bold text-green-700">OnBajet</span>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setShowChat((v) => !v)}
          >
            {showChat ? "Hide AI" : "✨ AI Assistant"}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {/* AI Chat Panel */}
        {showChat && (
          <Card className="overflow-hidden p-0">
            <AiChat />
          </Card>
        )}

        {/* Search & Filters */}
        <Card className="space-y-4">
          <h2 className="font-semibold text-gray-700">Search Deals</h2>
          <Input
            placeholder="Search destinations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-3 py-1 text-sm capitalize transition ${
                  category === cat
                    ? "bg-green-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div>
            <div className="mb-1 flex justify-between text-sm text-gray-600">
              <span>Max price</span>
              <span className="font-medium">${maxPrice}</span>
            </div>
            <Slider
              min={50}
              max={500}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
          </div>
        </Card>

        {/* Deals Grid */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Deals{" "}
              <span className="text-sm font-normal text-gray-400">({deals.length})</span>
            </h2>
            {saved.length > 0 && (
              <Badge className="bg-green-100 text-green-800">
                {saved.length} saved
              </Badge>
            )}
          </div>

          {deals.length === 0 ? (
            <Card className="py-10 text-center text-gray-400">
              No deals match your filters.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {deals.map((deal) => (
                <Card key={deal.id} className="flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{deal.emoji}</span>
                      <div>
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-xs text-gray-400">{deal.from}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSave(deal.id)}
                      className="text-lg"
                      title={saved.includes(deal.id) ? "Unsave" : "Save"}
                    >
                      {saved.includes(deal.id) ? "❤️" : "🤍"}
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-yellow-500">★</span>
                      <span className="text-xs text-gray-500">{deal.rating}</span>
                    </div>
                    <Badge className="text-base font-bold bg-green-50 text-green-700">
                      ${deal.price}
                    </Badge>
                  </div>
                  <Button className="mt-1 w-full bg-green-600 hover:bg-green-700 text-sm">
                    Book Now
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Budget Planner */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">Budget Planner</h2>
          <Card className="space-y-3">
            <p className="text-sm text-gray-500">
              Enter your total budget to see which deals you can afford.
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Your budget in USD"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            {budgetNum > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-green-700">
                  {budgetDeals.length} deal{budgetDeals.length !== 1 ? "s" : ""} within ${budgetNum}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {budgetDeals.map((d) => (
                    <Badge key={d.id} className="bg-green-50 text-green-800">
                      {d.emoji} {d.title} — ${d.price}
                    </Badge>
                  ))}
                  {budgetDeals.length === 0 && (
                    <p className="text-sm text-gray-400">No deals in this range.</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Coupons */}
        <section>
          <h2 className="mb-3 text-xl font-semibold">Coupons</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {COUPONS.map((c) => (
              <Card key={c.code} className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-mono font-bold text-green-700">{c.code}</p>
                  <p className="text-xs text-gray-500">{c.desc}</p>
                  <p className="text-xs text-gray-400">Expires {c.expires}</p>
                </div>
                <Button
                  className="shrink-0 text-xs py-1 px-3 bg-green-600 hover:bg-green-700"
                  onClick={() => copyCode(c.code)}
                >
                  {copiedCode === c.code ? "Copied!" : "Copy"}
                </Button>
              </Card>
            ))}
          </div>
        </section>

        {/* Saved Deals */}
        {saved.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-semibold">Saved Deals</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_DEALS.filter((d) => saved.includes(d.id)).map((d) => (
                <Badge key={d.id} className="bg-red-50 text-red-700 text-sm py-1 px-3">
                  {d.emoji} {d.title} — ${d.price}
                </Badge>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-10 border-t bg-white py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} OnBajet · Budget travel made easy
      </footer>
    </div>
  );
}
