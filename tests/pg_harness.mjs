/* قاعدة Postgres حقيقية في الذاكرة (PGlite) تشغّل supabase/schema.sql كما هو.
   تحاكي ما توفره Supabase: مخطط auth وجدول users ودالة auth.uid() ودورَي anon وauthenticated.
   asUser(uid, fn) ينفّذ داخل معاملة بدور authenticated وهوية المستخدم، فتُطبَّق سياسات RLS فعلاً. */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function makeDb() {
  const db = new PGlite();
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin; create role authenticated nologin;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  await db.exec(readFileSync(join(root, "supabase", "schema.sql"), "utf8"));
  // في Supabase يملك الدور authenticated صلاحية الجداول عبر الإعدادات الافتراضية للمخطط public
  await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated;`);
  return db;
}

export async function addUser(db, id, email) {
  await db.query("insert into auth.users (id, email) values ($1, $2) on conflict do nothing", [id, email]);
}

/* ينفّذ fn(tx) كمستخدم؛ uid=null يعني زائراً (دور anon) */
export async function asUser(db, uid, fn) {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || ""]);
    return fn(tx);
  });
}

/* استدعاء RPC بنفس صيغة PostgREST: الاسم + كائن وسائط ← قيمة الإرجاع */
const SIGS = {
  notes_save_page: ["p_file", "p_page", "p_add", "p_remove", "p_meta"],
  notes_get_file: ["p_file", "p_since"],
  notes_list_files: [],
  notes_delete_file: ["p_file"],
  notes_delete_all: []
};
export async function rpc(db, uid, name, args = {}) {
  const sig = SIGS[name];
  if (!sig) throw Object.assign(new Error("unknown_function"), { code: "PGRST202" });
  const given = sig.filter((k) => args[k] !== undefined);
  const casts = { p_page: "int", p_since: "bigint", p_add: "jsonb", p_remove: "jsonb", p_meta: "jsonb", p_file: "text" };
  const params = given.map((k, i) => `${k} := $${i + 1}::${casts[k]}`).join(", ");
  const values = given.map((k) => (typeof args[k] === "object" ? JSON.stringify(args[k]) : args[k]));
  return asUser(db, uid, async (tx) => {
    const r = await tx.query(`select public.${name}(${params}) as r`, values);
    return r.rows[0].r;
  });
}
