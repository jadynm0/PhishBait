"use client";
import React, { useEffect, useRef, useState } from "react";
import { Skull, Zap, ShieldAlert } from "lucide-react";
import { SwarmNode } from "@/lib/types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const DEFAULT_TARGET = APP_URL + "/target-portal";

interface CloneMeta {
  slug: string;
  title: string;
  sourceUrl: string;
  clonedAt: string;
}

export default function WarRoom() {
  const [url, setUrl] = useState(DEFAULT_TARGET);
  const [clones, setClones] = useState<CloneMeta[]>([]);
  const [fleetCount, setFleetCount] = useState(5);
  const [sessions, setSessions] = useState<SwarmNode[]>([]);
  const [poisonCount, setPoisonCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/clones")
      .then((r) => r.json())
      .then((d) => setClones(d.clones || []))
      .catch(() => setClones([]));
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch("/api/target-logs");
        const data = await res.json();
        setPoisonCount(data.count);
      } catch {
        // ignore transient poll failures
      }
    }, 1500);
  };

  const startSwarm = async () => {
    setIsRunning(true);
    setError(null);
    setWarning(null);
    setSessions([]);

    try {
      const res = await fetch("/api/swarm/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: url, fleetCount }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Launch failed");
        setIsRunning(false);
        return;
      }

      setSessions(data.sessions);
      if (data.warning) setWarning(data.warning);
      startPolling();
    } catch (err: any) {
      setError(err?.message || "Launch failed");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Skull className="text-red-500 w-8 h-8" />
          <h1 className="text-2xl font-black tracking-wider uppercase">PhishBait // Fleet Operator</h1>
        </div>
        <div className="flex gap-6">
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded">
            <span className="text-xs text-slate-400 block uppercase">Records Poisoned</span>
            <span className="text-2xl font-mono font-bold text-green-400">{poisonCount}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded">
            <span className="text-xs text-slate-400 block uppercase">Active Steel Fleet</span>
            <span className="text-2xl font-mono font-bold text-blue-400">{sessions.length} Nodes</span>
          </div>
        </div>
      </div>

      <div className="flex gap-4 mb-3 flex-wrap">
        <select
          className="bg-slate-900 border border-slate-800 rounded px-3 py-3 text-sm font-mono"
          onChange={(e) => {
            if (e.target.value) setUrl(APP_URL + e.target.value);
          }}
          defaultValue=""
        >
          <option value="">Quick select target…</option>
          <option value="/target-portal">Mock: Package Redelivery</option>
          {clones.map((c) => (
            <option key={c.slug} value={`/clone-portal/${c.slug}`}>
              Clone: {c.title}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Target URL (defaults to the mock /target-portal)"
          className="flex-1 min-w-[280px] bg-slate-900 border border-slate-800 rounded px-4 py-3 text-sm focus:outline-none focus:border-red-500 font-mono"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          type="number"
          min={1}
          max={10}
          value={fleetCount}
          onChange={(e) => setFleetCount(Number(e.target.value))}
          className="w-20 bg-slate-900 border border-slate-800 rounded px-3 py-3 text-sm font-mono"
        />
        <button
          onClick={startSwarm}
          disabled={isRunning || !url}
          className="bg-red-600 hover:bg-red-500 px-8 py-3 rounded font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
        >
          <Zap className="w-4 h-4" /> Unleash Swarm
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-950 border border-red-800 text-red-200 text-sm rounded p-3 mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {warning && !error && (
        <div className="flex items-start gap-2 bg-yellow-950 border border-yellow-800 text-yellow-200 text-sm rounded p-3 mb-6">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((sess, idx) => (
          <div key={sess.sessionId} className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
            <div className="bg-slate-800/80 px-3 py-2 flex justify-between items-center text-xs">
              <span className="font-mono text-slate-300">NODE #{idx + 1} // Persona: {sess.personaName}</span>
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ACTIVE
              </span>
            </div>
            <iframe
              src={sess.debugUrl}
              className="w-full h-80 border-none"
              title={`Node ${idx + 1}`}
            />
          </div>
        ))}
      </div>

      {sessions.length === 0 && !isRunning && (
        <p className="text-slate-500 text-sm mt-10 text-center">
          No active nodes. Paste a target and hit Unleash Swarm — it defaults
          to the bundled mock target-portal so you can demo safely.
        </p>
      )}
    </div>
  );
}
