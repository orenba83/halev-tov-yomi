import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Payload = { v: 1; updated_at: string; state: unknown };

// Module-level store — survives warm serverless instances; good enough when both devices hit same region quickly.
const g = globalThis as unknown as { __fitrackShared?: Payload | null };
if (g.__fitrackShared === undefined) g.__fitrackShared = null;

export const getSharedState = createServerFn({ method: "GET" }).handler(async () => {
  return g.__fitrackShared;
});

const Body = z.object({
  v: z.literal(1),
  updated_at: z.string(),
  state: z.unknown(),
});

export const setSharedState = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Body.parse(d))
  .handler(async ({ data }) => {
    g.__fitrackShared = data as Payload;
    return { ok: true as const, updated_at: data.updated_at };
  });
