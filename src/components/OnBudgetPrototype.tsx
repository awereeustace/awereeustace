import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const deals = [
  { id: 1, title: "Flight to Paris", price: "$199" },
  { id: 2, title: "Hotel in Tokyo", price: "$99" },
  { id: 3, title: "Cruise to Bahamas", price: "$349" },
  { id: 4, title: "Road Trip Package", price: "$149" },
];

const coupons = ["10% OFF", "SUMMER2024", "FREEMEAL", "SAVE20"];

export default function OnBudgetPrototype() {
  return (
    <div className="space-y-8 p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">OnBajet</h1>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Top Deals</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {deals.map((deal) => (
            <Card key={deal.id} className="flex items-center justify-between">
              <span>{deal.title}</span>
              <Badge>{deal.price}</Badge>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Coupons</h2>
        <div className="flex flex-wrap gap-2">
          {coupons.map((c) => (
            <Badge key={c}>{c}</Badge>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold">AI Travel Toolbox</h2>
        <Card className="space-y-3">
          <p className="text-sm text-gray-600">
            Chat with our AI to plan itineraries, find deals, and manage your travel budget.
          </p>
          <Button>Launch AI Assistant</Button>
        </Card>
      </section>
    </div>
  );
}
