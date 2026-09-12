"use client";
import React, { useEffect, useRef } from "react";

/**
 * Renders sanitized, pre-cloned scam-page HTML and intercepts any form
 * submission so it posts to our own /api/target-logs instead of going
 * anywhere real (clone-phish.mjs already stripped scripts/handlers and
 * neutralized form actions before this ever runs).
 */
export default function ClonedFormRenderer({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const forms = container.querySelectorAll("form");

    const doSubmit = async (form: HTMLFormElement) => {
      const data = new FormData(form);
      const filled = Array.from(data.values()).filter(
        (v) => String(v).trim().length > 0
      ).length;

      const fullName =
        (data.get("name") as string) ||
        (data.get("fullname") as string) ||
        (data.get("full_name") as string) ||
        "Unknown";
      const email = (data.get("email") as string) || "unknown@example.com";

      try {
        await fetch("/api/target-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, fieldsFilled: filled }),
        });
      } catch {
        // demo should never hard-fail on a logging error
      }

      const banner = document.createElement("div");
      banner.textContent = `Submitted (${filled} fields recorded — sandboxed clone, nothing left this app).`;
      banner.style.cssText =
        "position:fixed;bottom:16px;right:16px;background:#065f46;color:white;padding:10px 16px;border-radius:6px;font-family:monospace;font-size:12px;z-index:9999;box-shadow:0 2px 8px rgba(0,0,0,.3)";
      document.body.appendChild(banner);
      setTimeout(() => banner.remove(), 3500);

      form.reset();
    };

    const handleSubmit = (e: Event) => {
      e.preventDefault();
      doSubmit(e.currentTarget as HTMLFormElement);
    };

    // Many cloned pages drive "submit" via a plain <button type="button">
    // with JS we already stripped, rather than a real submit input. Catch
    // clicks on any button/input inside a form as a fallback trigger.
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const button = target.closest("button, input[type='submit'], input[type='button']");
      if (!button) return;
      const form = button.closest("form");
      if (!form) return;
      e.preventDefault();
      doSubmit(form as HTMLFormElement);
    };

    forms.forEach((f) => f.addEventListener("submit", handleSubmit));
    container.addEventListener("click", handleClick);

    return () => {
      forms.forEach((f) => f.removeEventListener("submit", handleSubmit));
      container.removeEventListener("click", handleClick);
    };
  }, [html]);

  return (
    <div>
      <div className="bg-yellow-100 text-yellow-900 text-xs text-center py-1 font-mono">
        SANDBOXED CLONE — hosted locally, form posts stay on this server
      </div>
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}