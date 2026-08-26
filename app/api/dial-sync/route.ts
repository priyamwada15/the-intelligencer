import type { NextRequest } from "next/server";

/**
 * Dev-only broadcast channel for the DialKit type-scale panel
 * (components/DevTypeScaleDials.tsx). Lets one device's slider drags push
 * live updates to every other device viewing the app on the same LAN
 * (e.g. tweak on desktop, watch it update on a phone), via Server-Sent
 * Events over this single Next.js dev server process.
 *
 * In-memory only — resets on server restart, and does not work across
 * multiple serverless instances. That's fine: this route is inert outside
 * `next dev` (see the NODE_ENV guard below) and was never meant to survive
 * a real deployment.
 */

export type TypeScaleValues = {
  display: number;
  title: number;
  heading: number;
  body: number;
  label: number;
  labelSm: number;
  caption: number;
  micro: number;
};

const DEFAULT_VALUES: TypeScaleValues = {
  display: 32,
  title: 36,
  heading: 16,
  body: 16,
  label: 12,
  labelSm: 12,
  caption: 10,
  micro: 10,
};

let currentValues: TypeScaleValues = { ...DEFAULT_VALUES };
const subscribers = new Set<ReadableStreamDefaultController<Uint8Array>>();

function encodeEvent(values: TypeScaleValues): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(values)}\n\n`);
}

function broadcast(values: TypeScaleValues) {
  const payload = encodeEvent(values);
  for (const controller of subscribers) {
    try {
      controller.enqueue(payload);
    } catch {
      // Controller is already closed; it'll be removed via its own `cancel`.
    }
  }
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export async function GET() {
  if (isProduction()) {
    return new Response("Not found", { status: 404 });
  }

  let thisController: ReadableStreamDefaultController<Uint8Array>;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      thisController = controller;
      subscribers.add(controller);
      controller.enqueue(encodeEvent(currentValues));
    },
    cancel() {
      subscribers.delete(thisController);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export async function POST(request: NextRequest) {
  if (isProduction()) {
    return new Response("Not found", { status: 404 });
  }

  const body = (await request.json()) as Partial<TypeScaleValues>;
  currentValues = { ...currentValues, ...body };
  broadcast(currentValues);
  return Response.json({ ok: true, values: currentValues });
}
