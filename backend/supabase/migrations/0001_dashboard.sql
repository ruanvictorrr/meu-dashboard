-- Meu Dashboard — dados na nuvem
-- Rode este arquivo inteiro no Supabase: SQL Editor → New query → colar → Run.

-- 1) Um "documento" por usuário com todos os dados do dashboard
create table if not exists public.dashboard (
  user_id     uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  dados       jsonb not null,
  atualizado  timestamptz not null default now()
);

-- 2) Histórico automático (rede de segurança): guarda a versão anterior
--    no máximo a cada 30 min e mantém as 200 mais recentes por usuário.
create table if not exists public.dashboard_historico (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  dados       jsonb not null,
  atualizado  timestamptz not null,
  guardado_em timestamptz not null default now()
);
create index if not exists dashboard_historico_user_idx on public.dashboard_historico (user_id, guardado_em desc);

create or replace function public.dashboard_guardar_historico()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.atualizado := now();
  if not exists (
    select 1 from public.dashboard_historico
    where user_id = old.user_id and guardado_em > now() - interval '30 minutes'
  ) then
    insert into public.dashboard_historico (user_id, dados, atualizado)
    values (old.user_id, old.dados, old.atualizado);
    delete from public.dashboard_historico
    where user_id = old.user_id and id not in (
      select id from public.dashboard_historico
      where user_id = old.user_id order by guardado_em desc limit 200
    );
  end if;
  return new;
end $$;

drop trigger if exists dashboard_historico_trg on public.dashboard;
create trigger dashboard_historico_trg
  before update on public.dashboard
  for each row execute function public.dashboard_guardar_historico();

-- 3) Segurança (RLS): cada usuário só enxerga e altera os próprios dados
alter table public.dashboard enable row level security;
alter table public.dashboard_historico enable row level security;

drop policy if exists "dono lê"      on public.dashboard;
drop policy if exists "dono cria"    on public.dashboard;
drop policy if exists "dono altera"  on public.dashboard;
drop policy if exists "dono apaga"   on public.dashboard;
drop policy if exists "dono lê histórico" on public.dashboard_historico;

create policy "dono lê"     on public.dashboard for select to authenticated using (user_id = auth.uid());
create policy "dono cria"   on public.dashboard for insert to authenticated with check (user_id = auth.uid());
create policy "dono altera" on public.dashboard for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dono apaga"  on public.dashboard for delete to authenticated using (user_id = auth.uid());
create policy "dono lê histórico" on public.dashboard_historico for select to authenticated using (user_id = auth.uid());

-- Visitantes sem login não acessam nada
revoke all on public.dashboard, public.dashboard_historico from anon;
