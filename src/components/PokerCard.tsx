"use client";

import { cardStyle } from "@/lib/poker";

export default function PokerCard({
  value,
  revealed,
  size = "md",
  selected = false,
  onClick,
  disabled = false,
  label,
}: {
  value: string | null;
  revealed: boolean;
  size?: "sm" | "md" | "lg";
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const sizes = {
    sm: "h-24 w-16 text-2xl",
    md: "h-36 w-24 text-4xl",
    lg: "h-44 w-28 text-5xl",
  } as const;

  const hasValue = value !== null && value !== undefined;

  const card = (
    <div className={`flip-card ${sizes[size]} shrink-0`}>
      <div className={`flip-inner relative h-full w-full ${revealed && hasValue ? "flipped" : ""}`}>
        <div
          className={`flip-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br ${cardStyle(
            value ?? "?",
          )} ${selected ? "ring-4 ring-[#ff9ec4]" : ""}`}
        >
          <span className="text-3xl opacity-90">{revealed && hasValue ? value : "🐾"}</span>
          {label && !revealed ? (
            <span className="mt-1 text-[10px] font-bold text-[#7a5c9e]">{label}</span>
          ) : null}
        </div>
        <div
          className={`flip-back flip-face absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-4 border-white bg-gradient-to-br ${cardStyle(
            value ?? "?",
          )}`}
        >
          <span className="drop-shadow-sm">{value}</span>
          {label ? (
            <span className="mt-1 max-w-full truncate px-1 text-[11px] font-bold text-[#5c4278]">
              {label}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (!onClick) return card;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`zoo-btn rounded-2xl transition ${disabled ? "cursor-not-allowed opacity-60" : ""} ${
        selected ? "-translate-y-2" : ""
      }`}
    >
      {card}
    </button>
  );
}
