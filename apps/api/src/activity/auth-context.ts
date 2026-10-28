import { AsyncLocalStorage } from "node:async_hooks";
import type { Actor } from "./record";

const actors = new AsyncLocalStorage<string | null>();

export function withAuthActor<T>(actorId: string | null, action: () => T): T {
  return actors.run(actorId, action);
}

export function authActor(): Actor {
  const id = actors.getStore();
  return id ? { type: "member", id } : { type: "unknown" };
}
