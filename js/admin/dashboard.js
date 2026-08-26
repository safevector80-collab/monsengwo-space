// ============================================
// Journée Culturelle — Dashboard admin (RÉEL)
// ============================================
// Charge les vraies inscriptions depuis Supabase (table `inscriptions`,
// jointe à `activities` pour récupérer nom + catégorie de chaque activité).
// L'accès est protégé par une vraie session Supabase Auth ; la lecture des
// inscriptions elle-même est en plus protégée par les RLS (superadmin voit
// tout, ministre ne verrait que sa catégorie une fois les rôles affinés).
// ============================================

const statsGrid = document.getElementById("stats-grid");
const filterActivite = document.getElementById("filter-activite");
const filterClasse = document.getElementById("filter-classe");
const tbody = document.getElementById("inscriptions-tbody");
const emptyState = document.getElementById("empty-state");
const exportBtn = document.getElementById("export-btn");
const logoutBtn = document.getElementById("logout-btn");

let inscriptions = [];

// --- Déconnexion réelle ---
logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});

// --- Statistiques (total + une carte par catégorie) ---
function renderStats() {
  const total = inscriptions.length;

  const cartes = [`
    <div class="stat-card stat-card-total">
      <p class="stat-value">${total}</p>
      <p class="stat-label">Inscriptions au total</p>
    </div>
  `];

  Object.keys(CATEGORY_LABELS).forEach((categorie) => {
    const count = inscriptions.filter((i) => i.categorie === categorie).length;
    cartes.push(`
      <div class="stat-card">
        <span class="ticket-tag tag-${categorie}">${CATEGORY_LABELS[categorie]}</span>
        <p class="stat-value">${count}</p>
        <p class="stat-label">inscrit${count > 1 ? "s" : ""}</p>
      </div>
    `);
  });

  statsGrid.innerHTML = cartes.join("");
}

// --- Remplissage des menus de filtre ---
function populateFilters() {
  filterActivite.innerHTML = `<option value="tous">Toutes les activités</option>`;
  Object.keys(CATEGORY_LABELS).forEach((categorie) => {
    const option = document.createElement("option");
    option.value = categorie;
    option.textContent = CATEGORY_LABELS[categorie];
    filterActivite.appendChild(option);
  });

  filterClasse.innerHTML = `<option value="tous">Toutes les classes</option>`;
  const classesUniques = [...new Set(inscriptions.map((i) => i.classe))].sort();
  classesUniques.forEach((classe) => {
    const option = document.createElement("option");
    option.value = classe;
    option.textContent = classe;
    filterClasse.appendChild(option);
  });
}

// --- Tableau des inscriptions (filtré) ---
function getFilteredInscriptions() {
  return inscriptions.filter((i) => {
    const matchActivite = filterActivite.value === "tous" || i.categorie === filterActivite.value;
    const matchClasse = filterClasse.value === "tous" || i.classe === filterClasse.value;
    return matchActivite && matchClasse;
  });
}

function formatDateHeureFR(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR") + " " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function renderTable() {
  const rows = getFilteredInscriptions();

  if (rows.length === 0) {
    tbody.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  tbody.innerHTML = rows
    .map(
      (i) => `
        <tr>
          <td>${escapeHTML(i.nom_eleve)}</td>
          <td>${escapeHTML(i.classe)}</td>
          <td>${escapeHTML(i.telephone) || ""}</td>
          <td><span class="ticket-tag tag-${i.categorie}">${CATEGORY_LABELS[i.categorie] || escapeHTML(i.nom_activite)}</span></td>
          <td>${formatDateHeureFR(i.created_at)}</td>
        </tr>
      `
    )
    .join("");
}

filterActivite.addEventListener("change", renderTable);
filterClasse.addEventListener("change", renderTable);

// --- Export CSV (respecte le filtre actif) ---
function exportCSV() {
  const rows = getFilteredInscriptions();
  const header = ["Nom", "Classe", "Téléphone", "Activité", "Date"];

  const csvLines = [
    header.join(";"),
    ...rows.map((i) =>
      [i.nom_eleve, i.classe, i.telephone || "", CATEGORY_LABELS[i.categorie] || i.nom_activite, formatDateHeureFR(i.created_at)].join(";")
    ),
  ];

  const csvContent = "\uFEFF" + csvLines.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "inscriptions-journee-culturelle.csv";
  link.click();

  URL.revokeObjectURL(url);
}

exportBtn.addEventListener("click", exportCSV);

// --- Chargement réel des inscriptions (jointes aux activités) ---
async function loadInscriptions() {
  const { data, error } = await supabaseClient
    .from("inscriptions")
    .select("id, nom_eleve, classe, telephone, status, created_at, activities(nom, categorie)")
    .neq("status", "cancelled")
    .order("created_at", { ascending: false });

  if (error) {
    emptyState.textContent = "Impossible de charger les inscriptions pour le moment.";
    emptyState.hidden = false;
    return;
  }

  inscriptions = (data || []).map((i) => ({
    id: i.id,
    nom_eleve: i.nom_eleve,
    classe: i.classe,
    telephone: i.telephone,
    created_at: i.created_at,
    categorie: i.activities ? i.activities.categorie : null,
    nom_activite: i.activities ? i.activities.nom : "",
  }));

  renderStats();
  populateFilters();
  renderTable();
}

// --- Garde d'accès réelle + initialisation ---
(async function initDashboard() {
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

  await loadInscriptions();
})();
