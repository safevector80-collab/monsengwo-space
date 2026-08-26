select 'activities' objet,count(*) total,count(*) filter(where status='published') actifs from public.activities
union all select 'inscriptions',count(*),count(*) filter(where status='confirmed') from public.inscriptions
union all select 'profiles',count(*),count(*) filter(where active) from public.profiles
union all select 'programmes',count(*),count(*) filter(where status='published') from public.programmes;

select count(*) as normalisation_incomplete from public.inscriptions where nom_eleve_norm is null or classe_norm is null;
select count(*) as doublons_reels from(select activity_id,nom_eleve_norm,classe_norm,count(*) from public.inscriptions group by 1,2,3 having count(*)>1)d;
select activity_id,inscrits,places_restantes from public.activity_places order by activity_id;
select tablename,policyname,cmd from pg_policies where schemaname='public' and tablename in('activities','inscriptions','profiles','programmes','audit_logs') order by tablename,policyname;
