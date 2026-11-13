/** PWA plumbing: install prompt, iOS instructions, service worker updates. */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

export function initInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    listeners.forEach((listener) => listener(true));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((listener) => listener(false));
  });
}

export function onInstallAvailable(listener: (available: boolean) => void): () => void {
  listeners.add(listener);
  listener(Boolean(deferredPrompt));
  return () => listeners.delete(listener);
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  if (choice.outcome === 'accepted') deferredPrompt = null;
  return choice.outcome;
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const ios = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return ios || window.matchMedia('(display-mode: standalone)').matches;
}

export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !/CriOS|FxiOS/.test(navigator.userAgent);
}

/**
 * Registers the service worker (production only) and reports when a new
 * version is waiting so the UI can show a "reload" notice.
 */
export function registerServiceWorker(onUpdateReady: () => void): void {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (registration.waiting) onUpdateReady();
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdateReady();
            }
          });
        });
      })
      .catch(() => undefined);
  });
}

export function applyServiceWorkerUpdate(): void {
  navigator.serviceWorker?.getRegistration().then((registration) => {
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  });
}
