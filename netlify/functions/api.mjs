// netlify/functions/api.mjs — نقطة دخول Netlify: تربط المنطق (../lib/core.mjs) بتخزين Blobs الحقيقي.
import { getStore } from "@netlify/blobs";
import { handle } from "../lib/core.mjs";

const env = (k) => (globalThis.Netlify && Netlify.env ? Netlify.env.get(k) : process.env[k]);

export default async (req, context) =>
  handle(req, {
    store: getStore({ name: "lectures", consistency: "strong" }),
    env,
    ip: context && context.ip,
    now: () => Date.now()
  });

export const config = { path: "/api/*" };
