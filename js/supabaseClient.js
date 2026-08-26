// ============================================
// Journée Culturelle — Client Supabase partagé
// ============================================
// Chargé APRÈS la librairie Supabase (CDN) et AVANT tout autre script qui
// utilise `supabaseClient`. La clé ci-dessous est la clé PUBLIQUE
// (publishable) — elle est faite pour être visible côté frontend, la vraie
// protection des données vient des policies RLS posées dans Supabase.
// ============================================

const SUPABASE_URL = "https://ypcpoxdzulvpzscvygvr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_5AMybn6-2MgS2TJg4J24FA_aInvTqNx";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);