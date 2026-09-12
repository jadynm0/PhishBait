"use client";
import React, { useState } from "react";

// This is a self-contained, fictional mock target styled like a package-
// redelivery scam page. It exists so PhishBait's fleet has something safe
// and owned to demo against, instead of a live third-party site.
export default function TargetPortal() {
  const [submitted, setSubmitted] = useState(false);
  const [fieldsFilled, setFieldsFilled] = useState(0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const filled = Array.from(data.values()).filter((v) => String(v).trim().length > 0).length;

    await fetch("/api/target-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: data.get("name"),
        email: data.get("email"),
        fieldsFilled: filled,
      }),
    });

    setFieldsFilled(filled);
    setSubmitted(true);
    form.reset();
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg overflow-hidden border-t-4 border-blue-700">
        <div className="bg-blue-800 text-white px-6 py-4">
          <p className="text-xs uppercase tracking-widest opacity-80">Package Services</p>
          <h1 className="text-xl font-bold">Redelivery Confirmation Required</h1>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            We attempted to deliver your package but no one was available. Please
            confirm your details below within 24 hours to schedule redelivery,
            or your package will be returned to sender.
          </p>

          {submitted ? (
            <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded p-4">
              Thanks! Your redelivery has been "scheduled." ({fieldsFilled} fields
              recorded — this is a mock target, nothing was sent anywhere real.)
            </div>
          ) : (
            <form ref={form => { if (form) form.dataset.phishbaitReady = "true"; }} onSubmit={handleSubmit} className="space-y-3">
              <input name="name" placeholder="Full name" className="w-full border rounded px-3 py-2 text-sm" />
              <input name="email" type="email" placeholder="Email" className="w-full border rounded px-3 py-2 text-sm" />
              <input name="phone" type="tel" placeholder="Phone number" className="w-full border rounded px-3 py-2 text-sm" />
              <input name="address" placeholder="Delivery address" className="w-full border rounded px-3 py-2 text-sm" />
              <input name="card" placeholder="Card number (redelivery fee: $1.99)" className="w-full border rounded px-3 py-2 text-sm" />
              <div className="flex gap-3">
                <input name="exp" placeholder="MM/YY" className="w-1/2 border rounded px-3 py-2 text-sm" />
                <input name="cvv" placeholder="CVV" className="w-1/2 border rounded px-3 py-2 text-sm" />
              </div>
              <textarea name="notes" placeholder="Delivery notes" className="w-full border rounded px-3 py-2 text-sm" rows={2} />
              <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded text-sm">
                Confirm & Schedule Redelivery
              </button>
            </form>
          )}

          <p className="text-[10px] text-gray-400 mt-4">
            This is a fictional demo page created for a hackathon. It is not
            affiliated with any real postal or courier service.
          </p>
        </div>
      </div>
    </div>
  );
}
