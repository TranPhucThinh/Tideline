<script lang="ts">
	import { isSupabaseConfigured } from '$lib/env';

	const configured = isSupabaseConfigured();

	const sql = `-- 1. Tạo bảng profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  default_limit numeric not null default 100000,
  day_start integer not null default 1 check (day_start between 1 and 31),
  guide_seen boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. Tạo bảng expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric not null check (amount > 0),
  note text,
  date date not null,
  created_at timestamptz not null default now()
);

-- 2b. Bảng limit_settings (lịch sử đổi hạn mức / ngày bắt đầu vòng, append-only)
create table if not exists public.limit_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  default_limit numeric not null,
  day_start integer not null check (day_start between 1 and 31),
  effective_from date not null,
  created_at timestamptz not null default now()
);

create index if not exists limit_settings_user_effective_idx
  on public.limit_settings (user_id, effective_from);

-- 3. Bật RLS
alter table public.profiles enable row level security;
alter table public.expenses enable row level security;
alter table public.limit_settings enable row level security;

-- 4. Chính sách RLS
create policy "profiles select own" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "profiles update own" on public.profiles
  for update using ((select auth.uid()) = id);

create policy "expenses insert own" on public.expenses
  for insert with check ((select auth.uid()) = user_id);
create policy "expenses select own" on public.expenses
  for select using ((select auth.uid()) = user_id);
create policy "expenses delete own" on public.expenses
  for delete using ((select auth.uid()) = user_id);

create policy "limit_settings insert own" on public.limit_settings
  for insert with check ((select auth.uid()) = user_id);
create policy "limit_settings select own" on public.limit_settings
  for select using ((select auth.uid()) = user_id);
create policy "limit_settings update own" on public.limit_settings
  for update using ((select auth.uid()) = user_id);
create policy "limit_settings delete own" on public.limit_settings
  for delete using ((select auth.uid()) = user_id);

-- 5. Tự tạo profile + 1 row limit_settings khi có user mới đăng ký
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, default_limit)
  values (new.id, 100000)
  on conflict (id) do nothing;

  insert into public.limit_settings (user_id, default_limit, day_start, effective_from)
  values (new.id, 100000, 1, now()::date)
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;
</script>

<svelte:head>
	<title>Thiết lập — chi tiêu</title>
</svelte:head>

<div class="mx-auto w-full max-w-[430px] px-5 py-8">
	<h1 class="font-display text-xl font-bold">{configured ? 'Đã sẵn sàng' : 'Thiết lập ứng dụng'}</h1>

	{#if configured}
		<p class="mt-3 rounded-xl bg-surplus-bg px-4 py-3 text-sm text-surplus">
			Supabase đã được cấu hình. <a href="/auth/login" class="underline">Đăng nhập</a> để bắt đầu.
		</p>
	{:else}
		<p class="mt-3 text-sm text-muted leading-relaxed">
			Ứng dụng chưa được cấu hình Supabase. Thực hiện vài bước dưới đây để bắt đầu.
		</p>
	{/if}

	{#if !configured}
		<ol class="mt-6 space-y-5">
			<li class="rounded-2xl border border-line bg-white p-4">
				<h2 class="font-display text-base font-semibold">1. Tạo project Supabase</h2>
				<p class="mt-1 text-sm text-muted">
					Tạo project miễn phí tại supabase.com và mở <span class="font-medium text-ink">Project Settings → API</span>.
				</p>
			</li>
			<li class="rounded-2xl border border-line bg-white p-4">
				<h2 class="font-display text-base font-semibold">2. Điền thông tin vào file <code class="rounded bg-cream px-1.5 py-0.5">app/.env</code></h2>
				<p class="mt-1 text-sm text-muted">
					Sao chép giá trị <span class="font-medium text-ink">Project URL</span> và <span class="font-medium text-ink">anon public key</span> vào
					<code class="rounded bg-cream px-1.5 py-0.5">PUBLIC_SUPABASE_URL</code> và
					<code class="rounded bg-cream px-1.5 py-0.5">PUBLIC_SUPABASE_ANON_KEY</code>, rồi khởi động lại server.
				</p>
			</li>
			<li class="rounded-2xl border border-line bg-white p-4">
				<h2 class="font-display text-base font-semibold">3. Chạy SQL tạo bảng &amp; RLS</h2>
				<p class="mt-1 text-sm text-muted">
					Mở <span class="font-medium text-ink">SQL Editor</span> trong Supabase và chạy đoạn script dưới đây.
				</p>
			</li>
		</ol>

		<div class="mt-5 rounded-2xl border border-line bg-ink text-cream">
			<div class="flex items-center justify-between border-b border-white/10 px-4 py-2">
				<span class="text-sm font-medium">setup.sql</span>
			</div>
			<pre class="max-h-80 overflow-auto whitespace-pre p-4 font-mono text-xs leading-relaxed">{sql}</pre>
		</div>

		<div class="mt-5 rounded-2xl border border-line bg-white p-4 text-sm text-muted">
			File SQL này cũng được lưu ở <code class="rounded bg-cream px-1.5 py-0.5">app/supabase/setup.sql</code> trong dự án.
		</div>

		<a
			href="/auth/login"
			class="mt-6 block w-full rounded-xl bg-ink py-3 text-center text-base font-semibold text-white"
		>
			Đăng nhập
		</a>
	{/if}
</div>