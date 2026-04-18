import * as React from "react";
export default function Input(props: React.InputHTMLAttributes<HTMLInputElement> & { className?: string }) {
  const { className = "", ...p } = props;
  return <input className={`w-full border rounded-xl px-3 py-2 text-sm ${className}`} {...p} />;
}
