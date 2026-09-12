"use client";
import React, { useEffect, useState } from "react";
import { Database, Trash2 } from "lucide-react";

interface Entry {
  id: string;
  receivedAt: string;
  fullName: string;
  email: string;
  fieldsFilled: number;
}

export default function ScammerDb() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const poll = async () => {
      const res = await fetch("/api/target-logs");
      const data = await res.json();
      setEntries(data.entries);
      setCount(data.count);
    };
    poll();
    const id = setInterval(poll, 1500);
    return () => clearInterval(id);
  }, []);

  const clearDb = async () => {
    await fetch("/api/target-logs", { method: "DELETE" });
    setEntries([]);
    setCount(0);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-6">
      <div className="flex justify-between items-center mb-6 border-b border-green-900 pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          <h1 className="text-lg uppercase tracking-widest">
            scammer_db // captured_records: {count}
          </h1>
        </div>
        <button
          onClick={clearDb}
          className="flex items-center gap-1 text-xs text-red-400 border border-red-900 rounded px-2 py-1 hover:bg-red-950"
        >
          <Trash2 className="w-3 h-3" /> flush
        </button>
      </div>

      <div className="text-xs space-y-1">
        {entries.length === 0 && (
          <p className="text-green-800">-- empty. waiting for submissions --</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="border-b border-green-950 py-1 flex gap-4">
            <span className="text-green-700">{new Date(e.receivedAt).toLocaleTimeString()}</span>
            <span>{e.fullName}</span>
            <span className="text-green-600">{e.email}</span>
            <span className="text-green-800">[{e.fieldsFilled} fields]</span>
          </div>
        ))}
      </div>
    </div>
  );
}
