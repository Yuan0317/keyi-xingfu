create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  bedtime time not null default '22:30',
  bed_reminder boolean not null default true,
  morning_reminder boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gratitude_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_date date not null,
  position integer not null check (position > 0),
  text text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists gratitude_entries_user_date_position_idx
  on public.gratitude_entries(user_id, entry_date, position);

alter table public.profiles enable row level security;
alter table public.gratitude_entries enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own gratitude entries" on public.gratitude_entries;
create policy "Users can read their own gratitude entries"
  on public.gratitude_entries for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own gratitude entries" on public.gratitude_entries;
create policy "Users can insert their own gratitude entries"
  on public.gratitude_entries for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own gratitude entries" on public.gratitude_entries;
create policy "Users can update their own gratitude entries"
  on public.gratitude_entries for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own gratitude entries" on public.gratitude_entries;
create policy "Users can delete their own gratitude entries"
  on public.gratitude_entries for delete
  to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('gratitude-images', 'gratitude-images', false)
on conflict (id) do nothing;

drop policy if exists "Users can read their own gratitude images" on storage.objects;
create policy "Users can read their own gratitude images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'gratitude-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can upload their own gratitude images" on storage.objects;
create policy "Users can upload their own gratitude images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'gratitude-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can update their own gratitude images" on storage.objects;
create policy "Users can update their own gratitude images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'gratitude-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'gratitude-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own gratitude images" on storage.objects;
create policy "Users can delete their own gratitude images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'gratitude-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
