export const FLUSH_TAG = 'localijambo-flush';

interface SyncRegistration extends ServiceWorkerRegistration {
  sync?: { register: (tag: string) => Promise<void> };
}

export async function registerBackgroundSync(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = (await navigator.serviceWorker.ready) as SyncRegistration;
    if (!registration.sync) return;
    await registration.sync.register(FLUSH_TAG);
  } catch {
    // Unsupported or blocked — online/visibility triggers cover flushing.
  }
}

export function onBackgroundSyncMessage(run: () => void): () => void {
  if (!('serviceWorker' in navigator)) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === FLUSH_TAG) run();
  };
  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
