begin;

create extension if not exists unaccent;

alter table public.activities add column if not exists status text not null default 'published';
alter table public.activities add column if not exists updated_at timestamptz not null default now();
alter table public.activities add column if not exists date_activite date;
alter table public.activities add column if not exists heure_debut time;
alter table public.activities add column if not exists heure_fin time;

alter table public.inscriptions add column if not exists status text not null default 'confirmed';
alter table public.inscriptions add column if not exists updated_at timestamptz not null default now();
alter table public.inscriptions add column if not exists cancelled_at timestamptz;

alter table public.profiles add column if not exists active boolean not null default true;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists last_login_at timestamptz;

alter table public.programmes add column if not exists status text not null default 'published';
alter table public.programmes add column if not exists heure_debut time;
alter table public.programmes add column if not exists heure_fin time;
alter table public.programmes add column if not exists activity_id uuid references public.activities(id) on delete set null;
alter table public.programmes add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists(select 1 from pg_constraint where conname='activities_status_v2_check') then alter table public.activities add constraint activities_status_v2_check check(status in('draft','published','cancelled','archived')); end if;
  if not exists(select 1 from pg_constraint where conname='inscriptions_status_v2_check') then alter table public.inscriptions add constraint inscriptions_status_v2_check check(status in('pending','confirmed','cancelled','attended','absent')); end if;
  if not exists(select 1 from pg_constraint where conname='programmes_status_v2_check') then alter table public.programmes add constraint programmes_status_v2_check check(status in('draft','published','cancelled','archived')); end if;
  if not exists(select 1 from pg_constraint where conname='activities_capacity_v2_check') then alter table public.activities add constraint activities_capacity_v2_check check(capacite_max>=0); end if;
end $$;

create table if not exists public.audit_logs(
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.audit_v2_change()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.audit_logs(actor_id,action,entity_type,entity_id,old_data,new_data)
  values(auth.uid(),tg_op,tg_table_name,coalesce(new.id,old.id),case when tg_op in('UPDATE','DELETE') then to_jsonb(old) end,case when tg_op in('INSERT','UPDATE') then to_jsonb(new) end);
  return coalesce(new,old);
end $$;
drop trigger if exists trg_audit_activities on public.activities;
create trigger trg_audit_activities after insert or update or delete on public.activities for each row execute function public.audit_v2_change();
drop trigger if exists trg_audit_programmes on public.programmes;
create trigger trg_audit_programmes after insert or update or delete on public.programmes for each row execute function public.audit_v2_change();
drop trigger if exists trg_audit_profiles on public.profiles;
create trigger trg_audit_profiles after update on public.profiles for each row execute function public.audit_v2_change();
drop trigger if exists trg_audit_inscriptions on public.inscriptions;
create trigger trg_audit_inscriptions after update or delete on public.inscriptions for each row execute function public.audit_v2_change();

create or replace function public.normalize_registration_fields()
returns trigger language plpgsql set search_path=public as $$
begin
  new.nom_eleve := trim(regexp_replace(new.nom_eleve,'\s+',' ','g'));
  new.classe := trim(regexp_replace(new.classe,'\s+',' ','g'));
  new.nom_eleve_norm := lower(unaccent(new.nom_eleve));
  new.classe_norm := lower(unaccent(new.classe));
  new.telephone := nullif(trim(regexp_replace(coalesce(new.telephone,''),'\s+',' ','g')),'');
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_normalize_registration_fields on public.inscriptions;
create trigger trg_normalize_registration_fields before insert or update of nom_eleve,classe,telephone
on public.inscriptions for each row execute function public.normalize_registration_fields();

update public.inscriptions set nom_eleve=nom_eleve,classe=classe where nom_eleve_norm is null or classe_norm is null;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists trg_activities_touch on public.activities;
create trigger trg_activities_touch before update on public.activities for each row execute function public.touch_updated_at();
drop trigger if exists trg_programmes_touch on public.programmes;
create trigger trg_programmes_touch before update on public.programmes for each row execute function public.touch_updated_at();
drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.is_active_superadmin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='superadmin' and active)
$$;
create or replace function public.can_manage_category(p_category text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and active and (role='superadmin' or (role='ministre' and categorie=p_category)))
$$;

create or replace function public.register_inscription_v2(p_activity_id uuid,p_nom_eleve text,p_classe text,p_telephone text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_capacity integer;v_taken integer;
begin
  select capacite_max into v_capacity from public.activities where id=p_activity_id and status='published' for update;
  if not found then raise exception using errcode='P0001',message='ACTIVITY_UNAVAILABLE'; end if;
  select count(*) into v_taken from public.inscriptions where activity_id=p_activity_id and status='confirmed';
  if v_capacity>0 and v_taken>=v_capacity then raise exception using errcode='P0001',message='ACTIVITY_FULL'; end if;
  insert into public.inscriptions(nom_eleve,classe,telephone,activity_id)
  values(p_nom_eleve,p_classe,p_telephone,p_activity_id) returning id into v_id;
  return v_id;
exception when unique_violation then raise exception using errcode='23505',message='DUPLICATE_REGISTRATION';
end $$;
grant execute on function public.register_inscription_v2(uuid,text,text,text) to anon,authenticated;

create or replace view public.activity_places with(security_invoker=true) as
select a.id activity_id,count(i.id) filter(where i.status='confirmed')::integer inscrits,
greatest(a.capacite_max-count(i.id) filter(where i.status='confirmed'),0)::integer places_restantes
from public.activities a left join public.inscriptions i on i.activity_id=a.id
where a.status='published' group by a.id,a.capacite_max;

alter table public.audit_logs enable row level security;
drop policy if exists audit_logs_select_superadmin on public.audit_logs;
create policy audit_logs_select_superadmin on public.audit_logs for select using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='superadmin' and p.active));

drop policy if exists activities_select_public on public.activities;
drop policy if exists activities_insert_admin on public.activities;
drop policy if exists activities_update_admin on public.activities;
drop policy if exists activities_delete_admin on public.activities;
drop policy if exists activities_select_v2 on public.activities;
drop policy if exists activities_insert_v2 on public.activities;
drop policy if exists activities_update_v2 on public.activities;
drop policy if exists activities_delete_v2 on public.activities;
create policy activities_select_v2 on public.activities for select using(status='published' or public.can_manage_category(categorie));
create policy activities_insert_v2 on public.activities for insert with check(public.can_manage_category(categorie));
create policy activities_update_v2 on public.activities for update using(public.can_manage_category(categorie)) with check(public.can_manage_category(categorie));
create policy activities_delete_v2 on public.activities for delete using(public.is_active_superadmin());

drop policy if exists inscriptions_insert_public on public.inscriptions;
drop policy if exists inscriptions_select_admin on public.inscriptions;
drop policy if exists inscriptions_select_v2 on public.inscriptions;
drop policy if exists inscriptions_update_v2 on public.inscriptions;
create policy inscriptions_select_v2 on public.inscriptions for select using(exists(select 1 from public.activities a where a.id=activity_id and public.can_manage_category(a.categorie)));
create policy inscriptions_update_v2 on public.inscriptions for update using(exists(select 1 from public.activities a where a.id=activity_id and public.can_manage_category(a.categorie)));

drop policy if exists programmes_select_public on public.programmes;
drop policy if exists programmes_insert_admin on public.programmes;
drop policy if exists programmes_update_admin on public.programmes;
drop policy if exists programmes_delete_admin on public.programmes;
drop policy if exists programmes_select_v2 on public.programmes;
drop policy if exists programmes_insert_v2 on public.programmes;
drop policy if exists programmes_update_v2 on public.programmes;
drop policy if exists programmes_delete_v2 on public.programmes;
create policy programmes_select_v2 on public.programmes for select using(status='published' or exists(select 1 from public.profiles p where p.id=auth.uid() and p.active));
create policy programmes_insert_v2 on public.programmes for insert with check(exists(select 1 from public.profiles p where p.id=auth.uid() and p.active));
create policy programmes_update_v2 on public.programmes for update using(exists(select 1 from public.profiles p where p.id=auth.uid() and p.active));
create policy programmes_delete_v2 on public.programmes for delete using(public.is_active_superadmin());

drop policy if exists profiles_select_superadmin on public.profiles;
drop policy if exists profiles_update_superadmin on public.profiles;
create policy profiles_select_superadmin on public.profiles for select using(id=auth.uid() or public.is_active_superadmin());
create policy profiles_update_superadmin on public.profiles for update using(public.is_active_superadmin()) with check(public.is_active_superadmin());

create index if not exists idx_activities_status on public.activities(status,created_at desc);
create index if not exists idx_inscriptions_activity_status on public.inscriptions(activity_id,status);
create index if not exists idx_inscriptions_created_at on public.inscriptions(created_at desc);
create index if not exists idx_programmes_status_date on public.programmes(status,date);

commit;
