"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AnimalPicker from "@/components/AnimalPicker";
import { DECKS, DECK_KEYS } from "@/lib/poker";
import {
  apiFetch,
  loadIdentity,
  loadRecentRooms,
  rememberRoom,
  saveIdentity,
  saveRoomIdentity,
  type RecentRoom,
} from "@/lib/client";

export default function HomeClient() {
  const router = useRouter();
  const [identity, setIdentity] = useState(() => ({ name: "", avatar: "🦊" }));
  const [roomName, setRoomName] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [storyUrl, setStoryUrl] = useState("");
  const [deck, setDeck] = useState<string>("fibonacci");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentRoom[]>([]);

  useEffect(() => {
    const stored = loadIdentity();
    startTransition(() => {
      setIdentity(stored.avatar ? stored : { ...stored, avatar: "🦊" });
      setRecent(loadRecentRooms());
    });
  }, []);

  async function createRoom(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{
        code: string;
        participantToken: string;
        ownerToken: string;
        room: { name: string };
      }>("/api/rooms", {
        method: "POST",
        body: {
          name: roomName,
          creatorName: identity.name,
          avatar: identity.avatar,
          storyTitle,
          storyUrl,
          deck,
        },
      });
      saveIdentity(identity);
      saveRoomIdentity(data.code, {
        participantToken: data.participantToken,
        ownerToken: data.ownerToken,
      });
      rememberRoom(data.code, data.room.name);
      router.push(`/room/${data.code}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de créer la salle",
      );
      setBusy(false);
    }
  }

  async function joinRoom(event: React.FormEvent) {
    event.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<{ room: { name: string } }>(
        `/api/rooms/${code}`,
      );
      rememberRoom(code, data.room.name);
      router.push(`/room/${code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salle introuvable");
      setBusy(false);
    }
  }

  function update(patch: Partial<typeof identity>) {
    const next = { ...identity, ...patch };
    setIdentity(next);
    saveIdentity(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="lg:col-span-3">
        <form
          onSubmit={createRoom}
          className="zoo-card rounded-[2rem] border-4 border-white bg-white/90 p-6 sm:p-8"
        >
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-[#4b3168]">
            <span className="text-3xl">🏕️</span> Créer une salle
          </h2>
          <p className="mb-5 text-sm font-semibold text-[#7a5c9e]">
            Tu seras le gardien du zoo : tu pourras définir la story et dévoiler
            les cartes.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#7a5c9e]">
                Nom de la salle
              </span>
              <input
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="Sprint 42 - Les loutres"
                maxLength={60}
                className="w-full rounded-2xl border-4 border-[#ffe0c2] bg-[#fffaf3] px-4 py-3 font-semibold text-[#4b3168] outline-none focus:border-[#ff9ec4]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#7a5c9e]">
                Ton prénom
              </span>
              <input
                value={identity.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="Léo le panda"
                maxLength={24}
                className="w-full rounded-2xl border-4 border-[#ffe0c2] bg-[#fffaf3] px-4 py-3 font-semibold text-[#4b3168] outline-none focus:border-[#ff9ec4]"
              />
            </label>
          </div>

          <div className="mt-5">
            <AnimalPicker
              value={identity.avatar}
              onChange={(avatar) => update({ avatar })}
            />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#7a5c9e]">
                Titre de la story (optionnel)
              </span>
              <input
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="Ajouter la page de profil"
                maxLength={140}
                className="w-full rounded-2xl border-4 border-[#ffe0c2] bg-[#fffaf3] px-4 py-3 font-semibold text-[#4b3168] outline-none focus:border-[#ff9ec4]"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#7a5c9e]">
                Lien de la story (optionnel)
              </span>
              <input
                value={storyUrl}
                onChange={(e) => setStoryUrl(e.target.value)}
                placeholder="https://jira.exemple.com/browse/ZOO-42"
                maxLength={500}
                className="w-full rounded-2xl border-4 border-[#ffe0c2] bg-[#fffaf3] px-4 py-3 font-semibold text-[#4b3168] outline-none focus:border-[#ff9ec4]"
              />
            </label>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-sm font-bold text-[#7a5c9e]">
              Jeu de cartes
            </p>
            <div className="flex flex-wrap gap-2">
              {DECK_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDeck(key)}
                  className={`rounded-2xl border-4 px-4 py-2 text-sm font-bold transition ${
                    deck === key
                      ? "border-[#ff9ec4] bg-white text-[#4b3168]"
                      : "border-white/80 bg-white/60 text-[#7a5c9e] hover:bg-white"
                  }`}
                >
                  {DECKS[key].label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs font-semibold text-[#9b81b8]">
              Cartes : {DECKS[deck as keyof typeof DECKS].cards.join("  ·  ")}
            </p>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border-4 border-[#ffd6d6] bg-[#fff1f1] px-4 py-3 text-sm font-bold text-[#c2410c]">
              🙈 {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="zoo-btn mt-6 w-full rounded-2xl bg-gradient-to-r from-[#ffb26b] to-[#ff8fab] px-6 py-4 text-lg font-extrabold text-white disabled:opacity-60"
          >
            {busy ? "🐾 C'est parti…" : "🎉 Créer la salle"}
          </button>
        </form>
      </section>

      <div className="space-y-6 lg:col-span-2">
        <form
          onSubmit={joinRoom}
          className="zoo-card rounded-[2rem] border-4 border-white bg-white/90 p-6"
        >
          <h2 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-[#4b3168]">
            <span className="text-3xl">🚪</span> Rejoindre
          </h2>
          <p className="mb-4 text-sm font-semibold text-[#7a5c9e]">
            Entre le code de la salle donné par tes amis animaux.
          </p>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC12"
            maxLength={8}
            className="w-full rounded-2xl border-4 border-[#ffe0c2] bg-[#fffaf3] px-4 py-4 text-center text-3xl font-extrabold uppercase tracking-[0.4em] text-[#4b3168] outline-none focus:border-[#ff9ec4]"
          />
          <button
            type="submit"
            disabled={busy}
            className="zoo-btn mt-4 w-full rounded-2xl bg-gradient-to-r from-[#8ecae6] to-[#a8e6cf] px-6 py-3 text-lg font-extrabold text-[#2f4858] disabled:opacity-60"
          >
            🐾 Entrer dans la salle
          </button>
        </form>

        {recent.length > 0 ? (
          <div className="zoo-card rounded-[2rem] border-4 border-white bg-white/90 p-6">
            <h3 className="mb-3 text-lg font-extrabold text-[#4b3168]">
              🗺️ Salles récentes
            </h3>
            <ul className="space-y-2">
              {recent.map((room) => (
                <li key={room.code}>
                  <button
                    type="button"
                    onClick={() => router.push(`/room/${room.code}`)}
                    className="zoo-wiggle flex w-full items-center justify-between rounded-2xl border-4 border-[#f3e8ff] bg-[#faf5ff] px-4 py-3 text-left hover:bg-white"
                  >
                    <span className="font-bold text-[#4b3168]">
                      {room.name || room.code}
                    </span>
                    <span className="rounded-xl bg-white px-3 py-1 text-sm font-extrabold text-[#7a5c9e]">
                      {room.code}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="zoo-card rounded-[2rem] border-4 border-white bg-gradient-to-br from-[#fff3d6] to-[#ffe0ec] p-6">
          <h3 className="mb-2 text-lg font-extrabold text-[#4b3168]">
            🐢 Comment ça marche ?
          </h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm font-semibold text-[#6b4f8f]">
            <li>Le créateur ouvre une salle et colle le lien de la story.</li>
            <li>Chacun rejoint avec son animal totem.</li>
            <li>Tout le monde choisit une carte en secret.</li>
            <li>
              Le gardien du zoo dévoile les cartes : on discute et on revote !
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
