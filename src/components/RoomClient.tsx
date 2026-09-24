"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AnimalPicker from "@/components/AnimalPicker";
import PokerCard from "@/components/PokerCard";
import { getDeck, type RoomView } from "@/lib/poker";
import {
  apiFetch,
  clearRoomIdentity,
  loadIdentity,
  loadRoomIdentity,
  rememberRoom,
  saveIdentity,
  saveRoomIdentity,
  type RoomIdentity,
  type RoomResponse,
} from "@/lib/client";

type Status = "loading" | "need-join" | "in-room" | "missing";

export default function RoomClient({
  code,
  initialRoom,
}: {
  code: string;
  initialRoom: RoomView;
}) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomView>(initialRoom);
  const [status, setStatus] = useState<Status>("loading");
  const [tokens, setTokens] = useState<RoomIdentity | null>(null);
  const [identity, setIdentity] = useState({ name: "", avatar: "🦊" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [storyDraft, setStoryDraft] = useState({ title: "", url: "" });
  const [editingStory, setEditingStory] = useState(false);
  const [confettiRound, setConfettiRound] = useState(0);
  const tokensRef = useRef<RoomIdentity | null>(null);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  const deckCards = useMemo(() => getDeck(room.deck).cards, [room.deck]);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<RoomResponse>(`/api/rooms/${code}`, {
        participantToken: tokensRef.current?.participantToken ?? null,
        ownerToken: tokensRef.current?.ownerToken ?? null,
      });
      if (data.room) {
        setRoom(data.room);
        return data.room;
      }
      setStatus("missing");
    } catch {
      setStatus("missing");
    }
    return null;
  }, [code]);

  useEffect(() => {
    const storedIdentity = loadIdentity();
    const storedTokens = loadRoomIdentity(code);
    rememberRoom(code, initialRoom.name);
    startTransition(() => {
      setIdentity(storedIdentity);
      if (storedTokens?.participantToken) {
        setTokens(storedTokens);
        setStatus("in-room");
      } else {
        setStatus("need-join");
      }
    });
  }, [code, initialRoom.name]);

  useEffect(() => {
    if (status === "missing") return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 2500);
    return () => window.clearInterval(id);
  }, [status, refresh]);

  const me = room.participants.find((p) => p.isOwner) ?? null;
  const iAmOwner = Boolean(tokens?.ownerToken);
  const myVote = me?.vote ?? null;
  const revealed = room.revealed;

  useEffect(() => {
    if (revealed && room.stats.consensus && room.stats.votedCount > 1) {
      const showTimer = window.setTimeout(
        () => setConfettiRound(room.round),
        0,
      );
      const timer = window.setTimeout(() => setConfettiRound(0), 4000);
      return () => {
        window.clearTimeout(showTimer);
        window.clearTimeout(timer);
      };
    }
  }, [revealed, room.round, room.stats.consensus, room.stats.votedCount]);

  async function join(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await apiFetch<RoomResponse>(`/api/rooms/${code}/join`, {
        method: "POST",
        body: { name: identity.name, avatar: identity.avatar },
        participantToken: tokens?.participantToken ?? null,
      });
      const nextTokens: RoomIdentity = {
        participantToken:
          data.participantToken ?? tokens?.participantToken ?? "",
        ownerToken: tokens?.ownerToken,
      };
      setTokens(nextTokens);
      tokensRef.current = nextTokens;
      saveRoomIdentity(code, nextTokens);
      saveIdentity(identity);
      if (data.room) setRoom(data.room);
      setStatus("in-room");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de rejoindre la salle",
      );
    } finally {
      setBusy(false);
    }
  }

  async function vote(value: string) {
    if (!tokens?.participantToken) return;
    const next = myVote === value ? null : value;
    setBusy(true);
    try {
      const data = await apiFetch<RoomResponse>(`/api/rooms/${code}/vote`, {
        method: "POST",
        body: { vote: next },
        participantToken: tokens.participantToken,
      });
      if (data.room) setRoom(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote impossible");
    } finally {
      setBusy(false);
    }
  }

  async function toggleReveal() {
    if (!tokens?.ownerToken) return;
    setBusy(true);
    try {
      const data = await apiFetch<RoomResponse>(`/api/rooms/${code}/reveal`, {
        method: "POST",
        body: { revealed: !revealed },
        ownerToken: tokens.ownerToken,
        participantToken: tokens.participantToken ?? null,
      });
      if (data.room) setRoom(data.room);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de dévoiler");
    } finally {
      setBusy(false);
    }
  }

  async function newRound() {
    if (!tokens?.ownerToken) return;
    setBusy(true);
    try {
      const data = await apiFetch<RoomResponse>(`/api/rooms/${code}/reset`, {
        method: "POST",
        ownerToken: tokens.ownerToken,
        participantToken: tokens.participantToken ?? null,
      });
      if (data.room) setRoom(data.room);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de relancer un tour",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveStory(event: React.FormEvent) {
    event.preventDefault();
    if (!tokens?.ownerToken) return;
    setBusy(true);
    try {
      const data = await apiFetch<RoomResponse>(`/api/rooms/${code}`, {
        method: "PATCH",
        body: { storyTitle: storyDraft.title, storyUrl: storyDraft.url },
        ownerToken: tokens.ownerToken,
        participantToken: tokens.participantToken ?? null,
      });
      if (data.room) setRoom(data.room);
      setEditingStory(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Impossible de modifier la story",
      );
    } finally {
      setBusy(false);
    }
  }

  async function leaveRoom() {
    if (tokens?.participantToken) {
      try {
        await apiFetch(`/api/rooms/${code}/leave`, {
          method: "POST",
          participantToken: tokens.participantToken,
        });
      } catch {
        /* ignore */
      }
    }
    clearRoomIdentity(code);
    router.push("/");
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Impossible de copier le lien");
    }
  }

  if (status === "missing") {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 text-center">
        <div className="zoo-card zoo-pop rounded-[2rem] border-4 border-white bg-white/90 p-10">
          <div className="mb-4 text-6xl">🦥</div>
          <h1 className="text-3xl font-extrabold text-[#4b3168]">
            Cette salle a disparu
          </h1>
          <Link
            href="/"
            className="zoo-btn mt-6 inline-block rounded-2xl bg-gradient-to-r from-[#ffb26b] to-[#ff8fab] px-6 py-3 font-extrabold text-white"
          >
            Retour au zoo
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {confettiRound > 0 ? (
        <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
          {Array.from({ length: 26 }).map((_, index) => (
            <span
              key={index}
              className="confetti-piece absolute text-2xl"
              style={{
                left: `${(index * 3.9) % 100}%`,
                animationDuration: `${2.2 + (index % 5) * 0.4}s`,
                animationDelay: `${(index % 7) * 0.12}s`,
              }}
            >
              {["🎉", "✨", "🐾", "🎊", "🍭"][index % 5]}
            </span>
          ))}
        </div>
      ) : null}

      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="zoo-wiggle inline-flex items-center gap-2 text-sm font-bold text-[#7a5c9e] hover:text-[#4b3168]"
          >
            🏠 Accueil
          </Link>
          <h1 className="mt-1 text-3xl font-extrabold text-[#4b3168] sm:text-4xl">
            {room.name}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-bold text-[#7a5c9e]">
            <span className="rounded-full bg-white/80 px-3 py-1">
              🔑 Code {room.code}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1">
              🔄 Tour {room.round}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1">
              🐾 {room.stats.totalCount} joueur
              {room.stats.totalCount > 1 ? "s" : ""}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyInvite}
            className="zoo-btn rounded-2xl border-4 border-white bg-white/90 px-4 py-3 font-extrabold text-[#4b3168]"
          >
            {copied ? "✅ Copié !" : "🔗 Inviter"}
          </button>
          {status === "in-room" ? (
            <button
              type="button"
              onClick={leaveRoom}
              className="zoo-btn rounded-2xl border-4 border-white bg-white/70 px-4 py-3 font-extrabold text-[#a05a5a]"
            >
              👋 Quitter
            </button>
          ) : null}
        </div>
      </header>

      {status === "need-join" ? (
        <div className="mx-auto max-w-xl">
          <form
            onSubmit={join}
            className="zoo-card zoo-pop rounded-[2rem] border-4 border-white bg-white/95 p-8"
          >
            <h2 className="mb-1 text-center text-2xl font-extrabold text-[#4b3168]">
              Bienvenue dans la salle {room.code} !
            </h2>
            <p className="mb-6 text-center text-sm font-semibold text-[#7a5c9e]">
              Choisis ton nom et ton animal totem pour rejoindre la partie.
            </p>
            <label className="block">
              <span className="mb-1 block text-sm font-bold text-[#7a5c9e]">
                Ton prénom
              </span>
              <input
                value={identity.name}
                onChange={(e) =>
                  setIdentity({ ...identity, name: e.target.value })
                }
                placeholder="Léo le panda"
                maxLength={24}
                className="w-full rounded-2xl border-4 border-[#ffe0c2] bg-[#fffaf3] px-4 py-3 font-semibold text-[#4b3168] outline-none focus:border-[#ff9ec4]"
              />
            </label>
            <div className="mt-5">
              <AnimalPicker
                value={identity.avatar}
                onChange={(avatar) => setIdentity({ ...identity, avatar })}
              />
            </div>
            {error ? (
              <p className="mt-4 rounded-2xl border-4 border-[#ffd6d6] bg-[#fff1f1] px-4 py-3 text-sm font-bold text-[#c2410c]">
                🙈 {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="zoo-btn mt-6 w-full rounded-2xl bg-gradient-to-r from-[#8ecae6] to-[#a8e6cf] px-6 py-4 text-lg font-extrabold text-[#2f4858] disabled:opacity-60"
            >
              {busy ? "🐾 On arrive…" : "🎉 Rejoindre la partie"}
            </button>
          </form>
        </div>
      ) : null}

      {status === "in-room" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="zoo-card rounded-[2rem] border-4 border-white bg-white/90 p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#4b3168]">
                  📖 Story en cours
                </h2>
                {iAmOwner && !editingStory ? (
                  <button
                    type="button"
                    onClick={() => {
                      setStoryDraft({
                        title: room.storyTitle,
                        url: room.storyUrl,
                      });
                      setEditingStory(true);
                    }}
                    className="zoo-btn rounded-xl border-4 border-white bg-[#fff3d6] px-3 py-2 text-sm font-bold text-[#7a5c9e]"
                  >
                    ✏️ Modifier
                  </button>
                ) : null}
              </div>

              {editingStory ? (
                <form onSubmit={saveStory} className="space-y-3">
                  <input
                    value={storyDraft.title}
                    onChange={(e) =>
                      setStoryDraft({ ...storyDraft, title: e.target.value })
                    }
                    placeholder="Titre de la story"
                    maxLength={140}
                    className="w-full rounded-2xl border-4 border-[#ffe0c2] bg-[#fffaf3] px-4 py-3 font-semibold text-[#4b3168] outline-none focus:border-[#ff9ec4]"
                  />
                  <input
                    value={storyDraft.url}
                    onChange={(e) =>
                      setStoryDraft({ ...storyDraft, url: e.target.value })
                    }
                    placeholder="https://..."
                    maxLength={500}
                    className="w-full rounded-2xl border-4 border-[#ffe0c2] bg-[#fffaf3] px-4 py-3 font-semibold text-[#4b3168] outline-none focus:border-[#ff9ec4]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="zoo-btn rounded-2xl bg-gradient-to-r from-[#a8e6cf] to-[#8ecae6] px-5 py-2 font-extrabold text-[#2f4858]"
                    >
                      💾 Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingStory(false)}
                      className="zoo-btn rounded-2xl border-4 border-white bg-white/70 px-5 py-2 font-bold text-[#7a5c9e]"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <p className="text-lg font-bold text-[#4b3168]">
                    {room.storyTitle || "Aucune story définie pour l'instant"}
                  </p>
                  {room.storyUrl ? (
                    <a
                      href={room.storyUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="zoo-wiggle mt-2 inline-flex max-w-full items-center gap-2 truncate rounded-2xl border-4 border-[#cdeffd] bg-[#eefaff] px-4 py-2 font-bold text-[#2f6f8f] hover:bg-white"
                    >
                      🔗 {room.storyUrl}
                    </a>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-[#9b81b8]">
                      {iAmOwner
                        ? "Ajoute un lien vers la story (Jira, Notion, GitHub…) pour que tout le monde la consulte."
                        : "Le gardien du zoo n'a pas encore ajouté de lien."}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="zoo-card rounded-[2rem] border-4 border-white bg-white/90 p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-xl font-extrabold text-[#4b3168]">
                  🃏 Choisis ta carte
                </h2>
                <span
                  className={`rounded-full px-3 py-1 text-sm font-bold ${
                    revealed
                      ? "bg-[#e7f7ef] text-[#2f6f4f]"
                      : room.stats.totalCount > 0 &&
                          room.stats.votedCount === room.stats.totalCount
                        ? "bg-[#d7f9d7] text-[#2f6f4f]"
                        : "bg-[#fff3d6] text-[#7a5c9e]"
                  }`}
                >
                  {revealed
                    ? "🎉 Cartes dévoilées !"
                    : room.stats.totalCount > 0 &&
                        room.stats.votedCount === room.stats.totalCount
                      ? "🐾 Tout le monde a voté !"
                      : `${room.stats.votedCount}/${room.stats.totalCount} ont voté`}
                </span>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {deckCards.map((card) => (
                  <PokerCard
                    key={card}
                    value={card}
                    size="md"
                    revealed
                    selected={myVote === card}
                    disabled={busy}
                    onClick={() => vote(card)}
                  />
                ))}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                {iAmOwner ? (
                  <button
                    type="button"
                    onClick={toggleReveal}
                    disabled={busy}
                    className="zoo-btn rounded-2xl bg-gradient-to-r from-[#ffb26b] to-[#ff8fab] px-6 py-3 text-lg font-extrabold text-white disabled:opacity-60"
                  >
                    {revealed
                      ? "🙈 Cacher les cartes"
                      : "🎉 Dévoiler les cartes"}
                  </button>
                ) : null}
                {iAmOwner ? (
                  <button
                    type="button"
                    onClick={newRound}
                    disabled={busy}
                    className="zoo-btn rounded-2xl border-4 border-white bg-[#e7f7ef] px-6 py-3 text-lg font-extrabold text-[#2f6f4f] disabled:opacity-60"
                  >
                    🔄 Nouveau tour
                  </button>
                ) : null}
                {myVote ? (
                  <button
                    type="button"
                    onClick={() => vote(myVote)}
                    disabled={busy}
                    className="zoo-btn rounded-2xl border-4 border-white bg-white/80 px-5 py-3 font-bold text-[#7a5c9e]"
                  >
                    ↩️ Retirer mon vote
                  </button>
                ) : null}
              </div>

              {!iAmOwner ? (
                <p className="mt-4 text-center text-sm font-semibold text-[#9b81b8]">
                  Seul le créateur de la salle peut dévoiler les cartes 🐾
                </p>
              ) : null}
            </div>

            <div className="zoo-card rounded-[2rem] border-4 border-white bg-white/90 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-xl font-extrabold text-[#4b3168]">
                🐾 Les animaux de la salle
              </h2>
              <div className="zoo-scroll flex flex-wrap gap-4">
                {room.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`zoo-pop flex w-28 flex-col items-center rounded-3xl border-4 ${
                      participant.isOwner
                        ? "border-[#ff9ec4] bg-[#fff4f9]"
                        : "border-white bg-[#fffaf3]"
                    } p-3`}
                  >
                    <span className="text-4xl">{participant.avatar}</span>
                    <span className="mt-1 w-full truncate text-center text-sm font-bold text-[#4b3168]">
                      {participant.name}
                    </span>
                    {participant.isCreator ? (
                      <span className="mt-1 rounded-full bg-[#fff3d6] px-2 py-0.5 text-[10px] font-bold text-[#a06a00]">
                        👑 gardien
                      </span>
                    ) : null}
                    <div className="mt-2">
                      <PokerCard
                        value={participant.vote}
                        revealed={revealed}
                        size="sm"
                        label={participant.name}
                      />
                    </div>
                    <span className="mt-2 text-xs font-bold text-[#9b81b8]">
                      {participant.vote
                        ? revealed
                          ? "a voté"
                          : "prêt 🐾"
                        : "réfléchit…"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="zoo-card rounded-[2rem] border-4 border-white bg-gradient-to-br from-[#fff3d6] to-[#ffe0ec] p-6">
              <h2 className="mb-3 text-xl font-extrabold text-[#4b3168]">
                📊 Résultats
              </h2>
              {revealed ? (
                <div className="space-y-3">
                  <div className="rounded-2xl border-4 border-white bg-white/80 p-4 text-center">
                    <p className="text-sm font-bold text-[#7a5c9e]">Moyenne</p>
                    <p className="text-4xl font-extrabold text-[#4b3168]">
                      {room.stats.average ?? "—"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border-4 border-white bg-white/80 p-3 text-center">
                      <p className="text-xs font-bold text-[#7a5c9e]">Min</p>
                      <p className="text-2xl font-extrabold text-[#4b3168]">
                        {room.stats.min ?? "—"}
                      </p>
                    </div>
                    <div className="rounded-2xl border-4 border-white bg-white/80 p-3 text-center">
                      <p className="text-xs font-bold text-[#7a5c9e]">Max</p>
                      <p className="text-2xl font-extrabold text-[#4b3168]">
                        {room.stats.max ?? "—"}
                      </p>
                    </div>
                  </div>
                  {room.stats.suggestion ? (
                    <div className="rounded-2xl border-4 border-white bg-white/80 p-3 text-center">
                      <p className="text-xs font-bold text-[#7a5c9e]">
                        Carte conseillée
                      </p>
                      <p className="text-2xl font-extrabold text-[#c2410c]">
                        {room.stats.suggestion}
                      </p>
                    </div>
                  ) : null}
                  {room.stats.consensus && room.stats.votedCount > 0 ? (
                    <p className="rounded-2xl border-4 border-[#bbf7d0] bg-[#f0fdf4] p-3 text-center font-extrabold text-[#2f6f4f]">
                      🎉 Consensus total !
                    </p>
                  ) : (
                    <p className="rounded-2xl border-4 border-white bg-white/70 p-3 text-center text-sm font-bold text-[#7a5c9e]">
                      Les animaux ne sont pas d&apos;accord : on discute ! 🗣️
                    </p>
                  )}
                  {room.stats.coffeeCount > 0 ? (
                    <p className="text-center text-sm font-bold text-[#7a5c9e]">
                      ☕ {room.stats.coffeeCount} pause
                      {room.stats.coffeeCount > 1 ? "s" : ""} café demandée
                      {room.stats.coffeeCount > 1 ? "s" : ""}
                    </p>
                  ) : null}
                  {room.stats.questionCount > 0 ? (
                    <p className="text-center text-sm font-bold text-[#7a5c9e]">
                      ❓ {room.stats.questionCount} vote
                      {room.stats.questionCount > 1 ? "s" : ""} &quot;je ne sais
                      pas&quot;
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-5xl">🙈</p>
                  <p className="mt-3 text-sm font-bold text-[#7a5c9e]">
                    Les cartes sont encore cachées. Patience, petit koala…
                  </p>
                  <p className="mt-3 text-3xl font-extrabold text-[#4b3168]">
                    {room.stats.votedCount} / {room.stats.totalCount}
                  </p>
                  <p className="text-xs font-bold text-[#9b81b8]">
                    animaux ont voté
                  </p>
                </div>
              )}
            </div>

            <div className="zoo-card rounded-[2rem] border-4 border-white bg-white/90 p-6">
              <h3 className="mb-3 text-lg font-extrabold text-[#4b3168]">
                🧺 À emporter
              </h3>
              <ul className="space-y-2 text-sm font-semibold text-[#6b4f8f]">
                <li>✅ Partage le code {room.code} à ton équipe</li>
                <li>✅ Le lien de la story est visible par tous</li>
                <li>✅ Le gardien du zoo dévoile les cartes</li>
                <li>✅ Un nouveau tour remet les votes à zéro</li>
              </ul>
              <button
                type="button"
                onClick={() => void refresh()}
                className="zoo-btn mt-4 w-full rounded-2xl border-4 border-white bg-[#f3e8ff] px-4 py-2 font-bold text-[#6b4f8f]"
              >
                🔄 Rafraîchir
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {error ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <p className="zoo-pop rounded-2xl border-4 border-[#ffd6d6] bg-[#fff1f1] px-5 py-3 text-sm font-bold text-[#c2410c]">
            🙈 {error}
          </p>
        </div>
      ) : null}
    </main>
  );
}
