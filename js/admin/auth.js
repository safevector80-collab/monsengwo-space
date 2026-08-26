// ============================================
// Journée Culturelle — Connexion espace comité (RÉELLE)
// ============================================
// Utilise le client Supabase défini dans js/supabaseClient.js (chargé
// avant ce fichier). Remplace définitivement le bloc temporaire
// admin/admin qui servait à construire le dashboard.
//
// Déroulé :
// 1. Connexion réelle via e-mail + mot de passe (Supabase Auth)
// 2. Vérifie qu'un profil existe dans `profiles` pour ce compte
//    (sinon : compte Auth valide mais pas encore autorisé comme admin)
// 3. Redirige vers le dashboard seulement si les deux étapes réussissent
// Le rôle (superadmin/ministre) n'est JAMAIS déduit du formulaire — toujours
// lu depuis la base après une vraie authentification.
// ============================================

const form = document.getElementById("login-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");
const formInfo = document.getElementById("form-info");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.hidden = true;
  formInfo.hidden = true;

  if (!form.checkValidity()) {
    formError.textContent = "Merci de renseigner ton e-mail et ton mot de passe.";
    formError.hidden = false;
    form.reportValidity();
    return;
  }

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitBtn.disabled = true;
  submitBtn.textContent = "Connexion en cours…";

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    formError.textContent = "E-mail ou mot de passe incorrect.";
    formError.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Se connecter";
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    formError.textContent = "Ce compte n'a pas encore de profil admin associé. Contacte le superadmin.";
    formError.hidden = false;
    await supabaseClient.auth.signOut();
    submitBtn.disabled = false;
    submitBtn.textContent = "Se connecter";
    return;
  }

  window.location.href = "dashboard.html";
});