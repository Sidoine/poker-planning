"use client";

import { ANIMALS } from "@/lib/poker";

export default function AnimalPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (animal: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-[#7a5c9e]">Choisis ton animal totem</p>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
        {ANIMALS.map((animal) => {
          const active = animal === value;
          return (
            <button
              key={animal}
              type="button"
              onClick={() => onChange(animal)}
              aria-label={`Choisir ${animal}`}
              className={`zoo-wiggle flex h-11 w-11 items-center justify-center rounded-2xl border-4 text-2xl transition ${
                active
                  ? "border-[#ff9ec4] bg-white shadow-[0_6px_0_0_#ff9ec4]"
                  : "border-white/70 bg-white/60 hover:bg-white"
              }`}
            >
              {animal}
            </button>
          );
        })}
      </div>
    </div>
  );
}
