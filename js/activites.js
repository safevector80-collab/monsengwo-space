// ============================================
// Journée Culturelle — Page publique (liste des activités)
// ============================================
// Utilise CATEGORY_LABELS (js/data.js) pour les libellés, et le client
// Supabase (js/supabaseClient.js) pour les vraies données. Charge les
// activités depuis la table `activities`, et le nombre de places prises
// depuis la vue publique `activity_places` (jamais les noms des élèves).
// ============================================

const grid = document.getElementById("activities-grid");
const loadingMsg = document.getElementById("loading-msg");
const filterChips = document.querySelectorAll(".filter-chip");

let currentFilter = "tous";
let activities = [];

function createTicketElement(activite) {
  const placesRestantes = activite.capacite_max - activite.inscrits;
  const estComplet = placesRestantes <= 0;
  const pourcentage = activite.capacite_max
    ? Math.min(100, Math.round((activite.inscrits / activite.capacite_max) * 100))
    : 0;

  const article = document.createElement("article");
  article.className = "ticket";
  article.dataset.categorie = activite.categorie;

  article.innerHTML = `
    <div class="ticket-main">
      <span class="ticket-tag tag-${activite.categorie}">${CATEGORY_LABELS[activite.categorie]}</span>
      <h2 class="ticket-title">${escapeHTML(activite.nom)}</h2>
      <p class="ticket-desc">${escapeHTML(activite.description) || ""}</p>
    </div>
    <div class="ticket-stub">
      <div>
        <p class="ticket-places">
          <span class="places-count">${activite.inscrits}</span><span class="places-total">/ ${activite.capacite_max} places</span>
        </p>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pourcentage}%"></div>
        </div>
      </div>
      ${
        estComplet
          ? `<span class="ticket-btn is-full">Complet</span>`
          : `<a class="ticket-btn" href="inscription.html?id=${encodeURIComponent(activite.id)}">S'inscrire</a>`
      }
    </div>
  `;

  return article;
}

function renderActivities() {
  grid.innerHTML = "";

  const activitesFiltrees =
    currentFilter === "tous"
      ? activities
      : activities.filter((a) => a.categorie === currentFilter);

  if (activitesFiltrees.length === 0) {
    grid.innerHTML = `<p class="loading-msg">Aucune activité dans cette catégorie pour le moment.</p>`;
    return;
  }

  activitesFiltrees.forEach((activite) => {
    grid.appendChild(createTicketElement(activite));
  });
}

function setFilter(categorie) {
  currentFilter = categorie;

  filterChips.forEach((chip) => {
    const isActive = chip.dataset.filter === categorie;
    chip.classList.toggle("is-active", isActive);
    chip.setAttribute("aria-pressed", String(isActive));
  });

  renderActivities();
}

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => setFilter(chip.dataset.filter));
});

// --- Chargement réel depuis Supabase ---
async function loadActivities() {
  loadingMsg.textContent = "Chargement des activités…";

  const { data: activitiesData, error: activitiesError } = await supabaseClient
    .from("activities")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  if (activitiesError) {
    grid.innerHTML = `<p class="loading-msg">Impossible de charger les activités pour le moment. Réessaie plus tard.</p>`;
    return;
  }

  const { data: placesData, error: placesError } = await supabaseClient
    .from("activity_places")
    .select("*");

  const placesById = {};
  if (!placesError && placesData) {
    placesData.forEach((p) => {
      placesById[p.activity_id] = p;
    });
  }

  activities = activitiesData.map((a) => ({
    ...a,
    inscrits: placesById[a.id] ? placesById[a.id].inscrits : 0,
  }));

  renderActivities();
}

loadActivities();
