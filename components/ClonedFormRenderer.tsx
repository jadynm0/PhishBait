"use client";
import React, { memo, useEffect, useRef, useState } from "react";

const CloneMarkup = memo(function CloneMarkup({ html, containerRef }: { html: string; containerRef: React.RefObject<HTMLDivElement> }) {
  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />;
});

// Only server-sanitized HTML may be passed to this component.
export default function ClonedFormRenderer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<{ kind: string; text: string } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.dataset.phishbaitReady = "true";
    const pending = new Set<HTMLFormElement>();
    const controllers = new Set<AbortController>();
    let disposed = false;
    const handleSubmit = async (event: Event) => {
      event.preventDefault();
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || pending.has(form) || !form.reportValidity()) return;
      const data = new FormData(form);
      const fieldsFilled = Array.from(data.values()).filter(v => typeof v === "string" && v.trim()).length;
      const name = ["name", "fullname", "full_name", "fullName"].map(key => data.get(key)).find(Boolean);
      const controller = new AbortController();
      controllers.add(controller);
      pending.add(form);
      form.setAttribute("aria-busy", "true");
      const buttons = Array.from(form.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input[type="submit"], input[type="reset"]'));
      const wasDisabled = buttons.map(button => button.disabled);
      buttons.forEach(button => { button.disabled = true; });
      setStatus({ kind: "pending", text: "Saving demo submission…" });
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch("/api/target-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName: name || "Unknown", email: data.get("email") || "unknown@example.com", fieldsFilled }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        if (!disposed) {
          form.reset();
          setStatus({ kind: "success", text: `Demo submission saved: ${fieldsFilled} fields filled. View the result in the submission log.` });
        }
      } catch {
        if (!disposed) setStatus({ kind: "error", text: "Could not confirm the save. Your fields are preserved. Check the submission log before retrying." });
      } finally {
        clearTimeout(timeout);
        controllers.delete(controller);
        pending.delete(form);
        form.removeAttribute("aria-busy");
        buttons.forEach((button, i) => { button.disabled = wasDisabled[i]; });
      }
    };
    const handleClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest('[data-phishbait-submit="true"]');
      const form = button?.closest("form");
      if (!form || pending.has(form)) return;
      event.preventDefault();
      form.requestSubmit();
    };
    const handleReset = () => setStatus(null);
    container.addEventListener("submit", handleSubmit);
    container.addEventListener("click", handleClick);
    container.addEventListener("reset", handleReset);
    return () => {
      delete container.dataset.phishbaitReady;
      disposed = true;
      controllers.forEach(controller => controller.abort());
      container.removeEventListener("submit", handleSubmit);
      container.removeEventListener("click", handleClick);
      container.removeEventListener("reset", handleReset);
    };
  }, [html]);

  const fillSample = () => {
    const values: Record<string, string> = { name: "Alex Example", email: "alex@example.com", phone: "202-555-0142", address: "123 Example Street", notes: "Fictional delivery for the PhishBait demo." };
    containerRef.current?.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea").forEach(field => {
      if (values[field.name] && !field.disabled && !field.closest('[aria-busy="true"]')) field.value = values[field.name];
    });
    setStatus(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="bg-amber-100 text-amber-950 px-4 py-3 text-center text-sm">
        PhishBait training sandbox · Use fictional data only · No real delivery or payment
      </div>
      <nav aria-label="Demo tools" className="flex flex-wrap justify-center gap-5 p-4 text-sm">
        <a href="/" className="underline">Fleet operator</a>
        <a href="/scammer-db" className="underline">Submission log</a>
        <button type="button" onClick={fillSample} disabled={status?.kind === "pending"} className="underline disabled:opacity-50">Fill sample data</button>
      </nav>
      <div aria-live="polite" className="max-w-2xl mx-auto px-4">
        {status && <p role={status.kind === "error" ? "alert" : "status"} className={`rounded-lg border p-4 mb-4 ${status.kind === "error" ? "bg-red-50 text-red-800" : "bg-white text-slate-800"}`}>{status.text}</p>}
      </div>
      <CloneMarkup html={html} containerRef={containerRef} />
    </div>
  );
}
