// Simple in-memory store for the hackathon demo. Resets on server restart.
// Good enough for a live demo; swap for a real DB if you extend this later.

export interface LogEntry {
  id: string;
  receivedAt: string;
  fullName: string;
  email: string;
  fieldsFilled: number;
}

class SubmissionStore {
  private entries: LogEntry[] = [];

  add(entry: Omit<LogEntry, "id" | "receivedAt">) {
    const full: LogEntry = {
      ...entry,
      id: Math.random().toString(36).slice(2, 10),
      receivedAt: new Date().toISOString(),
    };
    this.entries.push(full);
    return full;
  }

  all() {
    return this.entries;
  }

  count() {
    return this.entries.length;
  }

  reset() {
    this.entries = [];
  }
}

// Survive Next.js dev hot-reload by stashing on globalThis.
const globalForStore = globalThis as unknown as { __phishbaitStore?: SubmissionStore };
export const submissionStore =
  globalForStore.__phishbaitStore ?? new SubmissionStore();
globalForStore.__phishbaitStore = submissionStore;
