-- Medixa: تعليقات الطلاب على ملفات PDF (قلم، تظليل، نص) مع مزامنة بين الأجهزة.
-- نفّذ هذا الملف كاملاً مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run.
-- الخصوصية يضمنها الخادم: كل صف يخص مستخدماً واحداً (Row Level Security)، ولا يقرأ أحد تعليقات غيره.

create table if not exists public.note_files (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  file_key   text not null check (char_length(file_key) between 1 and 500),
  title      text not null default '' check (char_length(title) <= 300),
  course_id  text not null default '' check (char_length(course_id) <= 100),
  url        text not null default '' check (char_length(url) <= 1000),
  pages      int  not null default 0 check (pages between 0 and 3000),
  updated_at timestamptz not null default now(),
  primary key (user_id, file_key)
);

create table if not exists public.note_pages (
  user_id    uuid not null default auth.uid(),
  file_key   text not null,
  page       int  not null check (page between 1 and 3000),
  items      jsonb not null default '{}'::jsonb,   -- {معرّف: عنصر} أقلام وتظليل ونصوص
  removed    jsonb not null default '{}'::jsonb,   -- {معرّف: وقت الحذف} حتى لا يعود محذوف من جهاز آخر
  updated_at timestamptz not null default now(),
  primary key (user_id, file_key, page),
  foreign key (user_id, file_key) references public.note_files (user_id, file_key) on delete cascade
);

alter table public.note_files enable row level security;
alter table public.note_pages enable row level security;

drop policy if exists "own files" on public.note_files;
create policy "own files" on public.note_files for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "own pages" on public.note_pages;
create policy "own pages" on public.note_pages for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- لا وصول للزوار غير المسجلين
revoke all on public.note_files from anon;
revoke all on public.note_pages from anon;

-- دمج صفحة: يضيف العناصر الجديدة ويحذف المحذوفة بشكل ذري، فلا يضيع عمل جهاز بسبب جهاز آخر.
-- العنصر المحذوف يبقى محذوفاً إلا إذا عُدّل بعد الحذف (وقت التعديل t أحدث من وقت الحذف).
create or replace function public.notes_merge(
  p_items jsonb, p_removed jsonb, p_add jsonb, p_remove jsonb
) returns jsonb[]
language plpgsql immutable set search_path = public as $$
declare
  items jsonb := coalesce(p_items, '{}'::jsonb) || coalesce(p_add, '{}'::jsonb);
  rem jsonb := coalesce(p_removed, '{}'::jsonb);
  k text; v jsonb;
begin
  for k, v in select * from jsonb_each(coalesce(p_remove, '{}'::jsonb)) loop
    if not (rem ? k) or (rem ->> k)::bigint < (v #>> '{}')::bigint then
      rem := jsonb_set(rem, array[k], v);
    end if;
  end loop;
  for k in select jsonb_object_keys(rem) loop
    if items ? k and coalesce((items -> k ->> 't')::bigint, 0) <= (rem ->> k)::bigint then
      items := items - k;
    end if;
  end loop;
  return array[items, rem];
end $$;

create or replace function public.notes_save_page(
  p_file text, p_page int, p_add jsonb, p_remove jsonb, p_meta jsonb default '{}'::jsonb
) returns bigint
language plpgsql security invoker set search_path = public as $$
declare
  uid uuid := auth.uid();
  stamp timestamptz := clock_timestamp();
  merged jsonb[];
  cur note_pages%rowtype;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if jsonb_typeof(coalesce(p_add, '{}'::jsonb)) <> 'object' or jsonb_typeof(coalesce(p_remove, '{}'::jsonb)) <> 'object' then
    raise exception 'bad_input' using errcode = '22023';
  end if;

  insert into note_files (user_id, file_key, title, course_id, url, pages, updated_at)
  values (uid, p_file, left(coalesce(p_meta ->> 'title', ''), 300), left(coalesce(p_meta ->> 'course', ''), 100),
          left(coalesce(p_meta ->> 'url', ''), 1000), least(coalesce((p_meta ->> 'pages')::int, 0), 3000), stamp)
  on conflict (user_id, file_key) do update
    set title = case when excluded.title <> '' then excluded.title else note_files.title end,
        course_id = case when excluded.course_id <> '' then excluded.course_id else note_files.course_id end,
        url = case when excluded.url <> '' then excluded.url else note_files.url end,
        pages = greatest(note_files.pages, excluded.pages),
        updated_at = stamp;

  select * into cur from note_pages where user_id = uid and file_key = p_file and page = p_page for update;
  merged := notes_merge(cur.items, cur.removed, p_add, p_remove);
  if pg_column_size(merged[1]) > 900000 then raise exception 'page_too_big' using errcode = '54000'; end if;

  insert into note_pages (user_id, file_key, page, items, removed, updated_at)
  values (uid, p_file, p_page, merged[1], merged[2], stamp)
  on conflict (user_id, file_key, page) do update
    set items = excluded.items, removed = excluded.removed, updated_at = stamp;
  return (extract(epoch from stamp) * 1000)::bigint;
end $$;

create or replace function public.notes_get_file(p_file text, p_since bigint default 0)
returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'page', page, 'items', items, 'removed', removed,
           'updated', (extract(epoch from updated_at) * 1000)::bigint) order by page), '[]'::jsonb)
  from note_pages
  where user_id = auth.uid() and file_key = p_file
    and updated_at > to_timestamp(greatest(p_since, 0) / 1000.0);
$$;

create or replace function public.notes_list_files()
returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'file_key', f.file_key, 'title', f.title, 'course', f.course_id, 'url', f.url, 'pages', f.pages,
           'count', (select coalesce(sum((select count(*) from jsonb_object_keys(p.items))), 0)
                     from note_pages p where p.user_id = f.user_id and p.file_key = f.file_key),
           'updated', (extract(epoch from f.updated_at) * 1000)::bigint) order by f.updated_at desc), '[]'::jsonb)
  from note_files f where f.user_id = auth.uid();
$$;

create or replace function public.notes_delete_file(p_file text) returns void
language sql security invoker set search_path = public as $$
  delete from note_files where user_id = auth.uid() and file_key = p_file;
$$;

create or replace function public.notes_delete_all() returns void
language sql security invoker set search_path = public as $$
  delete from note_files where user_id = auth.uid();
$$;

revoke all on function public.notes_merge(jsonb, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.notes_save_page(text, int, jsonb, jsonb, jsonb) from public, anon;
revoke all on function public.notes_get_file(text, bigint) from public, anon;
revoke all on function public.notes_list_files() from public, anon;
revoke all on function public.notes_delete_file(text) from public, anon;
revoke all on function public.notes_delete_all() from public, anon;
grant execute on function public.notes_merge(jsonb, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.notes_save_page(text, int, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.notes_get_file(text, bigint) to authenticated;
grant execute on function public.notes_list_files() to authenticated;
grant execute on function public.notes_delete_file(text) to authenticated;
grant execute on function public.notes_delete_all() to authenticated;
