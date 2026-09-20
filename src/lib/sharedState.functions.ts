import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Payload = { v: 1; updated_at: string; state: unknown; user?: string };

// Module-level store — survives warm serverless instances; keyed by user
const g = globalThis as unknown as { __fitrackSharedByUser?: Record<string, Payload | null> };
if (!g.__fitrackSharedByUser) g.__fitrackSharedByUser = {};

export const getSharedState = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    if (d == null || d === undefined) return { user: "dana" };
    if (typeof d === "object" && d !== null && "user" in d) {
      return { user: String((d as { user?: string }).user || "dana") };
    }
    return { user: "dana" };
  })
  .handler(async ({ data }) => {
    const key = data.user === "oren" ? "oren" : "dana";
    return g.__fitrackSharedByUser![key] ?? null;
  });

const Body = z.object({
  v: z.literal(1),
  updated_at: z.string(),
  state: z.unknown(),
  user: z.string().optional(),
});

export const setSharedState = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Body.parse(d))
  .handler(async ({ data }) => {
    const key = data.user === "oren" ? "oren" : "dana";
    g.__fitrackSharedByUser![key] = data as Payload;
    return { ok: true as const, updated_at: data.updated_at, user: key };
  });
