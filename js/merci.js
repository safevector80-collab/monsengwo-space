// ============================================
// Journée Culturelle — Page de confirmation
// ============================================
// Personnalise le message si inscription.html a redirigé vers
// merci.html avec le nom de l'activité en paramètre d'URL, ex:
// merci.html?activite=Th%C3%A9%C3%A2tre%20%E2%80%94%20improvisation
// Si le paramètre est absent, le message générique par défaut reste affiché.
// ============================================

const params = new URLSearchParams(window.location.search);
const nomActivite = params.get("activite");

if (nomActivite) {
  const texte = document.getElementById("confirmation-text");
  texte.textContent = `Ton inscription à « ${nomActivite} » a bien été enregistrée. Le comité d'organisation te communiquera les informations complémentaires plus tard.`;
}