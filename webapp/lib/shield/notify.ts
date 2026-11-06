// Browser-notification helpers for Call Shield detection alerts.
// Client-side only; every function guards SSR and unsupported browsers.
// The in-app notification centre always works — browser notifications are an
// enhancement that requires a user gesture to grant permission.

import type { CallEvent } from "../callEvents";

export type PermissionState = "unsupported" | "default" | "granted" | "denied";

export function notificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): PermissionState {
  if (!notificationSupported()) return "unsupported";
  return Notification.permission as PermissionState;
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!notificationSupported()) return "unsupported";
  try {
    return (await Notification.requestPermission()) as PermissionState;
  } catch {
    // Safari throws if permission was previously denied via settings.
    return notificationPermission();
  }
}

export function showScamNotification(event: CallEvent): boolean {
  if (!notificationSupported() || Notification.permission !== "granted") return false;
  try {
    const title = "Possible scam call";
    const body = `${event.number}${event.warning ? ` — ${event.warning.label}` : ""}`;
    new Notification(title, { body, tag: `dna-shield-${event.id}` });
    return true;
  } catch {
    return false;
  }
}
