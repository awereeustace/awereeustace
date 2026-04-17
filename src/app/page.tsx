"use client";

import { useState } from "react";
import OnBudgetPrototype from "@/components/OnBudgetPrototype";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [guest, setGuest] = useState(false);

  if (guest) {
    return <OnBudgetPrototype />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-bold">Welcome to OnBajet</h1>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button>Login</Button>
        <Button>Sign Up</Button>
        <Button className="bg-white text-black border" >Continue with Google</Button>
        <Button className="bg-white text-black border" >Continue with Apple</Button>
        <Button className="text-sm text-blue-600" onClick={() => setGuest(true)}>
          Continue as Guest
        </Button>
      </div>
    </main>
  );
}
