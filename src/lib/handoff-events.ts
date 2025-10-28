import { EventEmitter } from 'events';

// Global in-memory event bus for handoff updates (single-process only)
const bus = new EventEmitter();
bus.setMaxListeners(0);

const EVENT = 'handoff:update';

export function emitHandoffUpdate(sessionId: string) {
  try {
    bus.emit(EVENT, sessionId);
  } catch {}
}

export function onHandoffUpdate(sessionId: string, handler: () => void) {
  const cb = (id: string) => {
    if (id === sessionId) handler();
  };
  bus.on(EVENT, cb);
  return () => bus.off(EVENT, cb);
}
