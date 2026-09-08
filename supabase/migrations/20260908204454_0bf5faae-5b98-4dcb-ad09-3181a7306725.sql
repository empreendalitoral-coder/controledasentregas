create schema if not exists private;

create table if not exists private.cron_tokens (
  nome text primary key,
  token text not null,
  criado_em timestamptz not null default now()
);

alter table private.cron_tokens enable row level security;

insert into private.cron_tokens (nome, token)
values ('hooks', 'ac6f1125bc8fec3d23ddeb892cef10fac42039222b11469a')
on conflict (nome) do update set token = excluded.token;

create or replace function public.cron_token_valido(_token text)
returns boolean
language sql
stable
security definer
set search_path = private, public
as $$
  select exists (
    select 1 from private.cron_tokens
    where nome = 'hooks' and token = _token
  );
$$;

revoke all on function public.cron_token_valido(text) from public, anon, authenticated;
grant execute on function public.cron_token_valido(text) to service_role;