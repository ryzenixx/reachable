import { z } from "zod";

const cursorSchema = z.strictObject({
  timestamp: z.iso.datetime().refine((value) => !value.startsWith("0000-")),
  id: z.uuid(),
});

export type Cursor = z.infer<typeof cursorSchema>;
export type HistoryQuery<State extends string> = { limit: number; state: State; cursor?: Cursor };

export function parseHistoryQuery<State extends string>(url: string, states: readonly State[]): HistoryQuery<State> | undefined {
  const params = new URL(url).searchParams;
  if ([...params.keys()].some((key) => !["limit", "state", "cursor"].includes(key) || params.getAll(key).length !== 1)) return undefined;
  const limitText = params.get("limit");
  if (limitText !== null && !/^[1-9]\d{0,2}$/.test(limitText)) return undefined;
  const limit = limitText === null ? 20 : Number(limitText);
  if (limit > 100) return undefined;
  const state = params.get("state") ?? "all";
  if (!states.includes(state as State)) return undefined;
  const token = params.get("cursor");
  if (token === null) return { limit, state: state as State };
  if (!/^[A-Za-z0-9_-]{1,512}$/.test(token)) return undefined;
  try {
    const decoded = Buffer.from(token, "base64url");
    if (decoded.toString("base64url") !== token) return undefined;
    const cursor = cursorSchema.safeParse(JSON.parse(decoded.toString("utf8")));
    if (!cursor.success) return undefined;
    return { limit, state: state as State, cursor: cursor.data };
  } catch {
    return undefined;
  }
}

export function encodeCursor(timestamp: string, id: string) {
  return Buffer.from(JSON.stringify({ timestamp, id })).toString("base64url");
}
