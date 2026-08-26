// ============================================
// Journée Culturelle — Gestion des programmes (dashboard, RÉEL)
// ============================================
// Écrit/lit réellement dans la table Supabase `programmes`. Protégé par les
// policies RLS (nécessite un profil admin authentifié pour insert/update/
// delete ; la lecture est publique).
// Le formulaire sert à la fois à AJOUTER et à MODIFIER : "Modifier" remplit
// le formulaire avec les infos existantes et mémorise l'id en cours
// d'édition dans un champ caché.
// ============================================

const progForm = document.getElementById("programme-form");
const progActiviteSelect = document.getElementById("prog-activite");
const progFormInfo = document.getElementById("programme-form-info");
const progSubmitBtn = document.getElementById("programme-submit-btn");
const progCancelBtn = document.getElementById("prog-cancel-edit");
const progEditIdInput = document.getElementById("prog-edit-id");
const manageList = document.getElementById("programme-manage-list");

let programmesCache = [];

// --- Remplit et vide le formulaire ---
function resetForm() {
  progForm.reset();
  progEditIdInput.value = "";
  progSubmitBtn.textContent = "Ajouter le programme";
  progCancelBtn.hidden = true;
}

function fillFormForEdit(entry) {
  progEditIdInput.value = entry.id;
  progActiviteSelect.value = entry.type;
  document.getElementById("prog-titre").value = entry.titre || "";
  document.getElementById("prog-jour").value = entry.jour || "";
  document.getElementById("prog-date").value = entry.date || "";
  document.getElementById("prog-lieu").value = entry.lieu || "";
  document.getElementById("prog-encadrant").value = entry.encadrant || "";
  document.getElementById("prog-consignes").value = entry.consigne || "";
  progSubmitBtn.textContent = "Enregistrer les modifications";
  progCancelBtn.hidden = false;
  progForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

progCancelBtn.addEventListener("click", () => {
  resetForm();
});

// --- Ajout ou modification (écriture réelle) ---
progForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!progForm.checkValidity()) {
    progForm.reportValidity();
    return;
  }

  const editId = progEditIdInput.value;

  const fields = {
    type: progActiviteSelect.value,
    titre: document.getElementById("prog-titre").value.trim(),
    jour: document.getElementById("prog-jour").value,
    date: document.getElementById("prog-date").value,
    lieu: document.getElementById("prog-lieu").value.trim(),
    encadrant: document.getElementById("prog-encadrant").value.trim(),
    consigne: document.getElementById("prog-consignes").value.trim(),
  };

  progSubmitBtn.disabled = true;

  const { error } = editId
    ? await supabaseClient.from("programmes").update(fields).eq("id", editId)
    : await supabaseClient.from("programmes").insert(fields);

  progSubmitBtn.disabled = false;

  if (error) {
    progFormInfo.textContent = "Une erreur est survenue, réessaie dans un instant.";
    progFormInfo.hidden = false;
    return;
  }

  progFormInfo.textContent = editId
    ? `Programme "${PROGRAMME_TYPE_LABELS[fields.type]}" modifié.`
    : `Programme "${PROGRAMME_TYPE_LABELS[fields.type]}" ajouté — visible dès maintenant sur la page "Programme".`;
  progFormInfo.hidden = false;

  resetForm();
  renderManageList();
});

// --- Liste "Programmes existants" avec Modifier / Supprimer ---
function formatDateFR(dateISO) {
  if (!dateISO) return "";
  const [annee, mois, jour] = dateISO.split("-");
  return `${jour}/${mois}/${annee}`;
}

async function renderManageList() {
  const { data, error } = await supabaseClient
    .from("programmes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    manageList.innerHTML = `<li class="programme-manage-empty">Impossible de charger les programmes.</li>`;
    return;
  }

  programmesCache = data || [];

  manageList.innerHTML = programmesCache.length
    ? programmesCache
        .map(
          (entry) => `
            <li class="programme-manage-item">
              <div class="programme-manage-info">
                <span class="ticket-tag tag-${entry.type}">${PROGRAMME_TYPE_LABELS[entry.type] || escapeHTML(entry.type)}</span>
                <p class="programme-manage-titre">${escapeHTML(entry.titre) || "(sans titre)"}</p>
                <p class="programme-manage-meta">${escapeHTML(entry.jour) || ""}${entry.date ? " · " + formatDateFR(entry.date) : ""}${entry.lieu ? " · " + escapeHTML(entry.lieu) : ""}${entry.encadrant ? " · " + escapeHTML(entry.encadrant) : ""}</p>
              </div>
              <div class="programme-manage-actions">
                <button type="button" class="prog-edit-btn" data-id="${entry.id}">Modifier</button>
                <button type="button" class="prog-delete-btn" data-id="${entry.id}">Supprimer</button>
              </div>
            </li>
          `
        )
        .join("")
    : `<li class="programme-manage-empty">Aucun programme pour l'instant.</li>`;
}

// Délégation d'événements : un seul écouteur pour tous les boutons Modifier/Supprimer.
manageList.addEventListener("click", async (event) => {
  const editBtn = event.target.closest(".prog-edit-btn");
  const deleteBtn = event.target.closest(".prog-delete-btn");

  if (editBtn) {
    const entry = programmesCache.find((e) => e.id === editBtn.dataset.id);
    if (entry) fillFormForEdit(entry);
    return;
  }

  if (deleteBtn) {
    const confirmed = window.confirm("Supprimer définitivement ce programme ?");
    if (confirmed) {
      await supabaseClient.from("programmes").delete().eq("id", deleteBtn.dataset.id);
      renderManageList();
    }
  }
});

// --- Initialisation ---
renderManageList();