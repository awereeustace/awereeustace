import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const deals = [
  { id: 1, title: "Flight to Paris", price: "$199" },
  { id: 2, title: "Hotel in Tokyo", price: "$99" },
];

const coupons = ["10% OFF", "SUMMER2024", "FREEMEAL"];

export default function OnBudgetPrototype() {
  return (
    <div className="space-y-8 p-4">
      <h1 className="text-3xl font-bold">OnBajet Prototype</h1>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Deals</h2>
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
        <h2 className="mb-2 text-xl font-semibold">Coupons</h2>
        <div className="flex flex-wrap gap-2">
          {coupons.map((c) => (
            <Badge key={c}>{c}</Badge>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">AI Travel Toolbox</h2>
        <Card className="space-y-2">
          <p className="text-sm">
            Chat with our AI to plan itineraries, budgets, and more.
          </p>
          <Button>Launch AI</Button>
        </Card>
      </section>
    </div>
  );
}
