// ============================================
// Journée Culturelle — Gestion des activités (dashboard, RÉEL)
// ============================================
// Écrit/lit réellement dans la table Supabase `activities`. Protégé par les
// policies RLS (superadmin gère tout, ministre limité à sa catégorie).
// Même garde d'accès que le reste du dashboard (vraie session Supabase).
// ============================================

const actForm = document.getElementById("activite-form");
const actSubmitBtn = document.getElementById("activite-submit-btn");
const actCancelBtn = document.getElementById("act-cancel-edit");
const actEditIdInput = document.getElementById("act-edit-id");
const actFormInfo = document.getElementById("activite-form-info");
const actManageList = document.getElementById("activite-manage-list");

let activitesCache = [];

// --- Remplit et vide le formulaire ---
function resetForm() {
  actForm.reset();
  actEditIdInput.value = "";
  actSubmitBtn.textContent = "Ajouter l'activité";
  actCancelBtn.hidden = true;
}

function fillFormForEdit(entry) {
  actEditIdInput.value = entry.id;
  document.getElementById("act-nom").value = entry.nom || "";
  document.getElementById("act-categorie").value = entry.categorie || "";
  document.getElementById("act-description").value = entry.description || "";
  document.getElementById("act-lieu").value = entry.lieu || "";
  document.getElementById("act-horaire").value = entry.horaire || "";
  document.getElementById("act-capacite").value = entry.capacite_max || "";
  actSubmitBtn.textContent = "Enregistrer les modifications";
  actCancelBtn.hidden = false;
  actForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

actCancelBtn.addEventListener("click", () => {
  resetForm();
});

// --- Ajout ou modification ---
actForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!actForm.checkValidity()) {
    actForm.reportValidity();
    return;
  }

  const editId = actEditIdInput.value;

  const fields = {
    nom: document.getElementById("act-nom").value.trim(),
    categorie: document.getElementById("act-categorie").value,
    description: document.getElementById("act-description").value.trim(),
    lieu: document.getElementById("act-lieu").value.trim(),
    horaire: document.getElementById("act-horaire").value.trim(),
    capacite_max: parseInt(document.getElementById("act-capacite").value, 10),
  };

  actSubmitBtn.disabled = true;

  const { error } = editId
    ? await supabaseClient.from("activities").update(fields).eq("id", editId)
    : await supabaseClient.from("activities").insert(fields);

  actSubmitBtn.disabled = false;

  if (error) {
    actFormInfo.textContent = "Une erreur est survenue (vérifie que tu as bien les droits sur cette catégorie).";
    actFormInfo.hidden = false;
    return;
  }

  actFormInfo.textContent = editId
    ? `Activité "${fields.nom}" modifiée.`
    : `Activité "${fields.nom}" ajoutée — visible dès maintenant sur la page des élèves.`;
  actFormInfo.hidden = false;

  resetForm();
  renderManageList();
});

// --- Liste "Activités existantes" avec Modifier / Supprimer ---
async function renderManageList() {
  const { data, error } = await supabaseClient
    .from("activities")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    actManageList.innerHTML = `<li class="programme-manage-empty">Impossible de charger les activités.</li>`;
    return;
  }

  activitesCache = data || [];

  actManageList.innerHTML = activitesCache.length
    ? activitesCache
        .map(
          (entry) => `
            <li class="programme-manage-item">
              <div class="programme-manage-info">
                <span class="ticket-tag tag-${entry.categorie}">${CATEGORY_LABELS[entry.categorie] || entry.categorie}</span>
                <p class="programme-manage-titre">${escapeHTML(entry.nom)}</p>
                <p class="programme-manage-meta">${escapeHTML(entry.lieu || "")}${entry.horaire ? " · " + escapeHTML(entry.horaire) : ""} · capacité ${entry.capacite_max}</p>
              </div>
              <div class="programme-manage-actions">
                <button type="button" class="prog-edit-btn" data-id="${entry.id}">Modifier</button>
                <button type="button" class="prog-delete-btn" data-id="${entry.id}">Archiver</button>
              </div>
            </li>
          `
        )
        .join("")
    : `<li class="programme-manage-empty">Aucune activité pour l'instant.</li>`;
}

actManageList.addEventListener("click", async (event) => {
  const editBtn = event.target.closest(".prog-edit-btn");
  const deleteBtn = event.target.closest(".prog-delete-btn");

  if (editBtn) {
    const entry = activitesCache.find((e) => e.id === editBtn.dataset.id);
    if (entry) fillFormForEdit(entry);
    return;
  }

  if (deleteBtn) {
    const confirmed = window.confirm(
      "Archiver cette activité ? Elle disparaîtra du site public, mais ses inscriptions seront conservées."
    );
    if (confirmed) {
      await supabaseClient.from("activities").update({ status: "archived" }).eq("id", deleteBtn.dataset.id);
      renderManageList();
    }
  }
});

// --- Garde d'accès réelle + initialisation ---
(async function initActivitesAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, nom, role, categorie, active")
    .eq("id", session.user.id)
    .single();

  if (profileError || !profile || profile.active === false) {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
    return;
  }

  renderManageList();
})();
