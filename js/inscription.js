// ============================================
// Journée Culturelle — Formulaire d'inscription (RÉEL)
// ============================================
// Charge les vraies activités depuis Supabase pour remplir le menu
// déroulant (une option par activité précise, pas juste par catégorie —
// certaines catégories ont plusieurs activités distinctes).
// L'envoi du formulaire insère réellement dans la table `inscriptions`.
// La contrainte UNIQUE posée en base empêche un doublon (même élève, même
// activité) : si Supabase la renvoie, on affiche un message clair au lieu
// de l'erreur technique brute.
// ============================================

const form = document.getElementById("inscription-form");
const submitBtn = document.getElementById("submit-btn");
const formError = document.getElementById("form-error");
const activiteSelect = document.getElementById("activite");
const activiteSummary = document.getElementById("activite-summary");
const nomInput = document.getElementById("nom");
const telephoneInput = document.getElementById("telephone");

let activitesChargees = [];

// --- Masques de saisie (filtrage en direct, sans librairie externe) ---
nomInput.addEventListener("input", () => {
  nomInput.value = nomInput.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ' -]/g, "");
});

telephoneInput.addEventListener("input", () => {
  telephoneInput.value = telephoneInput.value.replace(/[^0-9+ ]/g, "");
});

// --- Chargement des vraies activités + remplissage du menu ---
async function loadActivites() {
  const { data, error } = await supabaseClient.from("activities").select("*").order("nom");

  if (error || !data) {
    activiteSelect.innerHTML = `<option value="" disabled selected>Impossible de charger les activités</option>`;
    return;
  }

  activitesChargees = data;

  activiteSelect.innerHTML = `<option value="" disabled selected>Choisis une activité</option>`;
  data.forEach((activite) => {
    const option = document.createElement("option");
    option.value = activite.id;
    option.textContent = `${CATEGORY_LABELS[activite.categorie]} — ${activite.nom}`;
    activiteSelect.appendChild(option);
  });

  // Pré-sélection si on arrive depuis activites.html?id=...
  const params = new URLSearchParams(window.location.search);
  const activityId = params.get("id");

  if (activityId) {
    const activite = activitesChargees.find((a) => a.id === activityId);
    if (activite) {
      activiteSelect.value = activite.id;
      activiteSummary.textContent = `Tu t'inscris à : ${activite.nom}. Complète tes informations pour valider.`;
    }
  }
}

loadActivites();

// --- Soumission réelle du formulaire ---
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  formError.hidden = true;

  if (!form.checkValidity()) {
    formError.textContent = "Merci de remplir correctement tous les champs avant d'envoyer.";
    formError.hidden = false;
    form.reportValidity();
    return;
  }

  const activite = activitesChargees.find((a) => a.id === activiteSelect.value);

  submitBtn.disabled = true;
  submitBtn.textContent = "Envoi en cours…";

  const { error } = await supabaseClient.from("inscriptions").insert({
    nom_eleve: nomInput.value.trim(),
    classe: document.getElementById("classe").value,
    telephone: telephoneInput.value.trim(),
    activity_id: activiteSelect.value,
  });

  if (error) {
    // Code 23505 = violation de contrainte UNIQUE (doublon détecté en base)
    if (error.code === "23505") {
      formError.textContent = "Tu es déjà inscrit(e) à cette activité avec ce nom et cette classe.";
    } else {
      formError.textContent = "Une erreur est survenue, réessaie dans un instant.";
    }
    formError.hidden = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "S'inscrire";
    return;
  }

  window.location.href = `merci.html?activite=${encodeURIComponent(activite ? activite.nom : "")}`;
});