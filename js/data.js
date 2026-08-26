// ============================================
// Journée Culturelle — Données partagées
// ============================================
// ⚠️ DONNÉES FICTIVES TEMPORAIRES
// À l'étape Supabase, ce fichier sera remplacé par de vrais appels
// à la base de données. Chargé AVANT les autres scripts (activites.js,
// inscription.js, etc.) qui utilisent ces variables globales.
// ============================================

const MOCK_ACTIVITIES = [
  {
    id: "1",
    nom: "Pièce de théâtre — improvisation",
    categorie: "theatre",
    lieu: "Grande salle",
    horaire: "09h00 – 10h30",
    description: "Scènes improvisées par les élèves du club théâtre.",
    capacite_max: 25,
    inscrits: 14,
  },
  {
    id: "2",
    nom: "Défilé de mode moderne",
    categorie: "defile-moderne",
    lieu: "Cour principale",
    horaire: "10h30 – 11h30",
    description: "Présentation de tenues contemporaines créées par les élèves.",
    capacite_max: 20,
    inscrits: 20,
  },
  {
    id: "3",
    nom: "Défilé en tenues traditionnelles",
    categorie: "defile-traditionnel",
    lieu: "Cour principale",
    horaire: "11h30 – 12h30",
    description: "Chaque classe présente une tenue traditionnelle de son choix.",
    capacite_max: 20,
    inscrits: 9,
  },
  {
    id: "4",
    nom: "Battle de chant et rap",
    categorie: "chant-rap",
    lieu: "Scène principale",
    horaire: "13h00 – 14h30",
    description: "Concours de chant et de rap ouvert à tous les niveaux.",
    capacite_max: 15,
    inscrits: 6,
  },
  {
    id: "5",
    nom: "Danse Afro et Hip-Hop",
    categorie: "danse-afro-hiphop",
    lieu: "Grande salle",
    horaire: "14h30 – 16h00",
    description: "Chorégraphies collectives sur des rythmes afro et hip-hop.",
    capacite_max: 25,
    inscrits: 25,
  },
  {
    id: "6",
    nom: "Théâtre — sketch comique",
    categorie: "theatre",
    lieu: "Salle 12",
    horaire: "16h00 – 17h00",
    description: "Un moment léger pour clôturer la journée en s'amusant.",
    capacite_max: 25,
    inscrits: 3,
  },
  {
    id: "7",
    nom: "La Sape — présentation stylée",
    categorie: "sape",
    lieu: "Cour principale",
    horaire: "16h00 – 17h00",
    description: "Les élèves défilent dans leurs plus belles tenues, dans le pur esprit de la Sape.",
    capacite_max: 20,
    inscrits: 5,
  },
];

// Empêche l'injection de code HTML/JavaScript (XSS) : à utiliser sur TOUT
// texte dynamique (venant d'un formulaire ou de la base) avant de l'insérer
// via innerHTML. Sans ça, un nom d'élève du type "<script>...</script>"
// pourrait s'exécuter dans le navigateur de l'admin qui consulte le dashboard.
function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const CATEGORY_LABELS = {
  theatre: "Théâtre",
  "defile-moderne": "Défilé moderne",
  "defile-traditionnel": "Défilé traditionnel",
  "chant-rap": "Chant et Rap",
  "danse-afro-hiphop": "Danse Afro et Hip-Hop",
  sape: "La Sape",
};

// Types de programme utilisés dans le formulaire "Ajouter un programme" du dashboard
// (table Supabase `programmes`, colonne `type`).
const PROGRAMME_TYPE_LABELS = {
  repetition: "Répétition",
  repos: "Repos",
  reunion: "Réunion",
};