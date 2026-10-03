"use client";

import { useEffect } from "react";

/** Fires once per page load and logs the visit for the analytics sheet. */
export default function VisitBeacon() {
  useEffect(() => {
    try {
      let sid = sessionStorage.getItem("pv_sid");
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem("pv_sid", sid);
      }
      const params = new URLSearchParams(window.location.search);
      const payload = {
        sessionId: sid,
        path: window.location.pathname,
        referrer: document.referrer,
        utm_source: params.get("utm_source") || "",
        utm_medium: params.get("utm_medium") || "",
        utm_campaign: params.get("utm_campaign") || "",
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
      };
      fetch("/api/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      })
        .then((r) => r.json())
        .then((d) => {
          if (d?.id) sessionStorage.setItem("pv_vid", d.id);
        })
        .catch(() => {});
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
