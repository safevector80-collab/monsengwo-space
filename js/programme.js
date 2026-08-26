// ============================================
// Journée Culturelle — Programme des répétitions (RÉEL)
// ============================================
// Charge les vraies séances depuis la table Supabase `programmes`,
// groupées par type (répétition / repos / réunion). Utilise
// PROGRAMME_TYPE_LABELS défini dans js/data.js pour les libellés affichés.
// ============================================

const section = document.getElementById("programme-section");

function formatDateFR(dateISO) {
  if (!dateISO) return "";
  const [annee, mois, jour] = dateISO.split("-");
  return `${jour}/${mois}/${annee}`;
}

function createGroupElement(type, seances) {
  const group = document.createElement("article");
  group.className = "programme-group";

  const seancesHTML = seances
    .map(
      (seance) => `
        <li class="repetition-item">
          ${seance.titre ? `<p class="repetition-titre">${escapeHTML(seance.titre)}</p>` : ""}
          <div class="repetition-when">
            ${seance.jour ? `<span class="repetition-jour">${escapeHTML(seance.jour)}</span>` : ""}
            ${seance.date ? `<span class="repetition-heure">${formatDateFR(seance.date)}</span>` : ""}
            ${seance.heure ? `<span class="repetition-heure">${escapeHTML(seance.heure)}</span>` : ""}
          </div>
          ${seance.lieu ? `<p class="repetition-lieu">📍 ${escapeHTML(seance.lieu)}</p>` : ""}
          ${seance.encadrant ? `<p class="repetition-encadrant">Encadrant·e : ${escapeHTML(seance.encadrant)}</p>` : ""}
          ${seance.consigne ? `<p class="repetition-consigne">${escapeHTML(seance.consigne)}</p>` : ""}
        </li>
      `
    )
    .join("");

  group.innerHTML = `
    <div class="programme-group-header">
      <span class="ticket-tag tag-${type}">${PROGRAMME_TYPE_LABELS[type] || type}</span>
    </div>
    <ul class="repetition-list">
      ${seancesHTML}
    </ul>
  `;

  return group;
}

async function renderProgramme() {
  section.innerHTML = `<p class="loading-msg">Chargement du programme…</p>`;

  const { data, error } = await supabaseClient
    .from("programmes")
    .select("*")
    .eq("status", "published")
    .order("date", { ascending: true });

  if (error) {
    section.innerHTML = `<p class="loading-msg">Impossible de charger le programme pour le moment. Réessaie plus tard.</p>`;
    return;
  }

  if (!data || data.length === 0) {
    section.innerHTML = `<p class="loading-msg">Aucun programme publié pour l'instant.</p>`;
    return;
  }

  const groupes = {};
  data.forEach((seance) => {
    if (!groupes[seance.type]) groupes[seance.type] = [];
    groupes[seance.type].push(seance);
  });

  section.innerHTML = "";
  Object.keys(groupes).forEach((type) => {
    section.appendChild(createGroupElement(type, groupes[type]));
  });
}

renderProgramme();
