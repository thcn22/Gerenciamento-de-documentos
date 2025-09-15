import { EventEmitter } from 'events';

// Simple pub/sub event bus for server-side events
class RealtimeBus extends EventEmitter {}

export const realtimeBus = new RealtimeBus();

// Event types
export type RealtimeEvent =
  | { type: 'folder:created'; payload: { folderId: string; parentId: string | null } }
  | { type: 'folder:deleted'; payload: { folderId: string } }
  | { type: 'folder:moved'; payload: { folderId: string; newParentId: string | null } }
  | { type: 'document:uploaded'; payload: { documentId: string; folderId: string | null } }
  | { type: 'document:deleted'; payload: { documentId: string } };

export function emitRealtime(event: RealtimeEvent) {
  realtimeBus.emit('event', event);
}

export function subscribeRealtime(listener: (event: RealtimeEvent) => void) {
  realtimeBus.on('event', listener);
  return () => realtimeBus.off('event', listener);
}
