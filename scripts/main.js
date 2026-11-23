/**
 * CoC7 – Accueil « À la une » (1933 / 2026)
 * Écran d'accueil plein écran, sur fond transparent (la scène reste visible), à chaque session, pour les joueurs
 * et le Gardien. Une une de journal (The Arkham Advertiser en 1933, The Times en 2026), une carte de
 * l'Antarctique (ancienne / satellite), un fil rouge et des coupures punaisées qui servent de boutons :
 * - ma fiche (portrait, PV, SAN, Chance) ; mon carnet de bord de l'époque (pastille des pages nouvelles) ;
 * - Dramatis personae et les cartes en « vision » dans un encadré (lanterne magique / tablette), sans changer de scène ;
 * - la dernière séance (module Résumé des époques) ; le wiki des joueurs lu sur place ; le thème de ma fiche ;
 * - Gardien : préparer la partie (compendiums à importer, en dossiers), son bureau (wiki du Gardien, outils), réglages.
 * Suit l'époque du module Bascule d'époque. Aucune animation en boucle.
 * Foundry VTT v13 / v14 — magisterphamtom — MIT
 */

const ID = "coc7-accueil-une";
const BASCULE = "coc7-bascule-epoque";
const CALENDRIER = "calendrier-epoques";
const FICHES = "coc7-fiches-thematiques";
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const PETITS = new Set(["de", "du", "des", "la", "le", "les", "et", "en", "à", "au", "aux", "sur"]);
const W = 1600; const H = 1000;

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const actif = (id) => !!game.modules.get(id)?.active;
const idDe = (ref) => (typeof ref === "string" ? ref : ref?.id ?? "").split(".").pop();
const sansAccent = (t) => String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function joliNom(nom) {
  const s = String(nom ?? "").trim();
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().split(" ").map((m, i) => (i && PETITS.has(m) ? m : m.replace(/(^|[-'’])(\p{L})/gu, (x, a, b) => a + b.toUpperCase()))).join(" ");
}

/* ================================================================== */
/*  Époque et réglages                                                 */
/* ================================================================== */

function epoque() {
  try { const e = game.settings.get(BASCULE, "currentEra"); if (e === "1933" || e === "modern") return e; } catch (err) { /* pas de bascule */ }
  return "1933";
}

/** Fils rouges par défaut (le Gardien les dispose ensuite lui-même). « une » = le journal, « centre » = la punaise centrale. */
const FILS_DEFAUT = [["une", "perso"], ["perso", "cartes"], ["cartes", "dramatis"], ["dramatis", "carnet"], ["theme", "outils"], ["outils", "bureau"], ["bureau", "wiki"], ["wiki", "prepa"]];
const CENTRE_DEFAUT = { x: 800, y: 560 };

const DEFAUTS = {
  "1933": { journal: "The Arkham Advertiser", lieu: "Arkham, Massachusetts", edition: "Édition spéciale", une: "L'expédition Starkweather-Moore lève l'ancre pour l'Antarctique", campagne: "Par-delà les Montagnes Hallucinées", carnet: "Journal de Bord", carte: `modules/${"coc7-accueil-une"}/assets/antarctique-1933.webp`, pointX: "63.44", pointY: "64.36", coord: "", fils: FILS_DEFAUT, centre: CENTRE_DEFAUT, dramatis: "", cartes: [], wiki: "", wikiGardien: "Guide du module" },
  modern: { journal: "The Times", lieu: "New York", edition: "Édition numérique", une: "Les malles de l'expédition de 1933 refont surface en Californie", campagne: "Héritage Antarctique", carnet: "Carnet de Bord", carte: `modules/${"coc7-accueil-une"}/assets/antarctique-2026.webp`, pointX: "54.76", pointY: "73.19", coord: "", fils: FILS_DEFAUT, centre: CENTRE_DEFAUT, dramatis: "", cartes: [], wiki: "", wikiGardien: "Guide du module" }
};

/**
 * Projections polaires des deux cartes fournies, pour lire latitude et longitude sous le point rouge.
 * pole : position du pôle Sud (% de l'image) ; r(c) = k1·c + k2·c² pixels pour c degrés depuis le pôle (image de w × h) ;
 * l'angle compté dans le sens des aiguilles d'une montre depuis le haut vaut longitude Est + rot.
 * 1933 : National Geographic, projection azimutale équidistante (méridiens relevés sur le cadre).
 * 2026 : club-des-voyages.com, ajustée sur le cercle polaire, le massif Vinson et le dôme Argus (précision ≈ 1°).
 */
const PROJECTIONS = {
  "antarctique-1933.webp": { w: 2000, h: 1440, pole: [53.65, 49.10], k1: 21.4, k2: 0, rot: -30.4 },
  "antarctique-2026.webp": { w: 1240, h: 1240, pole: [50.16, 50.16], k1: 16.6, k2: 0.333, rot: 0 }
};
const projection = (carte) => PROJECTIONS[String(carte ?? "").split("/").pop()] ?? null;

/** Latitude / longitude sous un point (en % de l'image), d'après la projection de la carte. */
function coordonnees(carte, x, y) {
  const P = projection(carte); if (!P) return null;
  const dx = (x - P.pole[0]) / 100 * P.w; const dy = (y - P.pole[1]) / 100 * P.h;
  const r = Math.hypot(dx, dy);
  const c = P.k2 ? (-P.k1 + Math.sqrt(P.k1 * P.k1 + 4 * P.k2 * r)) / (2 * P.k2) : r / P.k1;
  const lat = Math.max(-90, -90 + c);
  let lon = (Math.atan2(dx, -dy) * 180 / Math.PI) - P.rot; lon = ((lon + 540) % 360) - 180;
  return { lat, lon };
}
function texteCoord({ lat, lon }) {
  const dm = (v) => { let d = Math.floor(Math.abs(v)); let m = Math.round((Math.abs(v) - d) * 60); if (m === 60) { d += 1; m = 0; } return `${d}°${String(m).padStart(2, "0")}′`; };
  return `${dm(lat)}${lat < 0 ? "S" : "N"} ${dm(lon)}${lon < 0 ? "W" : "E"}`;
}
/** Le texte affiché à côté du point : celui des réglages, sinon calculé, sinon les coordonnées de la campagne. */
function libelleCoord(c, x, y) {
  if ((c.coord ?? "").trim()) return c.coord.trim();
  const g = coordonnees(c.carte, x, y);
  return g ? texteCoord(g) : "76°15′S 168°42′E";
}

function config() {
  const c = foundry.utils.deepClone(game.settings.get(ID, "config") ?? {});
  for (const e of ["1933", "modern"]) c[e] = { ...DEFAUTS[e], ...(c[e] ?? {}) };
  return c;
}

/** Liens posés par les tuiles Monk's Active Tiles d'une scène (scènes visées, dans l'ordre de lecture). */
function liens(sceneId) {
  const s = game.scenes.get(sceneId); const out = [];
  if (!s) return out;
  for (const t of [...s.tiles].sort((a, b) => (Math.round(a.y / 50) - Math.round(b.y / 50)) || (a.x - b.x))) {
    for (const a of t.flags?.["monks-active-tiles"]?.actions ?? []) {
      if (a.action !== "scene") continue;
      const id = idDe(a.data?.sceneid);
      if (id && game.scenes.get(id) && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

/** Premier réglage : Dramatis personae et cartes repérés à partir des pages d'accueil de chaque époque. */
function deviner(era) {
  let racine = "";
  try { racine = game.settings.get(BASCULE, "config")?.[era]?.scene ?? ""; } catch (err) { /* rien */ }
  const freres = liens(racine);
  const nom = (id) => game.scenes.get(id)?.name ?? "";
  const dramatis = freres.find((id) => /dramatis/i.test(nom(id))) ?? "";
  const depart = freres.find((id) => /carte/i.test(nom(id)));
  const cartes = [];
  if (depart) {
    const vus = new Set([racine, ...freres]); cartes.push(depart);
    let file = [depart];
    while (file.length && cartes.length < 20) {
      const suite = [];
      for (const id of file) for (const l of liens(id)) if (!vus.has(l)) { vus.add(l); cartes.push(l); suite.push(l); }
      file = suite;
    }
  }
  const dossier = game.folders.find((f) => f.type === "JournalEntry" && !f.folder && /r[eè]gle/i.test(f.name));
  return { dramatis, cartes, wiki: dossier?.id ?? "" };
}

/* ================================================================== */
/*  Données de l'accueil                                               */
/* ================================================================== */

function monPersonnage(era) {
  try {
    const id = (game.settings.get(BASCULE, "characters") ?? {})[game.user.id]?.[era];
    if (id && game.actors.get(id)) return game.actors.get(id);
  } catch (err) { /* rien */ }
  const c = game.user.character;
  if (c && ((c.flags?.["coc7-luck-tracker"]?.era ?? "1933") === era)) return c;
  return game.actors.find((a) => a.type === "character" && a.isOwner && !game.user.isGM && (a.flags?.["coc7-luck-tracker"]?.era ?? "1933") === era) ?? null;
}

function personnagesEpoque(era) {
  return game.actors.filter((a) => a.type === "character" && a.hasPlayerOwner && (a.flags?.["coc7-luck-tracker"]?.era ?? "1933") === era)
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

function stats(a) {
  const s = a?.system?.attribs ?? {};
  const occ = a?.items?.find((i) => i.type === "occupation")?.name || a?.system?.infos?.occupation || "";
  return { pv: s.hp?.value ?? "–", pvMax: s.hp?.max ?? "", san: s.san?.value ?? "–", chance: s.lck?.value ?? "–", occ };
}

/** Carnets de bord de l'époque : journaux dont le nom commence par le préfixe réglé (« Journal de Bord », « Carnet de Bord »). */
function carnets(era) {
  const pre = sansAccent(config()[era].carnet);
  return game.journal.filter((j) => sansAccent(j.name).startsWith(pre)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

function monCarnet(era, perso) {
  if (game.user.isGM) return null;
  const miens = carnets(era).filter((j) => j.testUserPermission(game.user, "OWNER"));
  if (miens.length < 2 || !perso) return miens[0] ?? null;
  const mots = sansAccent(perso.name).split(/[\s"'«»]+/).filter((m) => m.length > 2);
  return miens.find((j) => mots.some((m) => sansAccent(j.name).includes(m))) ?? miens[0];
}

/** Pages nouvelles depuis la dernière ouverture (mémorisées sur l'utilisateur ; la première fois, tout est « déjà vu »). */
function pagesNouvelles(j) {
  if (!j) return 0;
  const vus = game.user.getFlag(ID, "vus") ?? {};
  if (!vus[j.id]) { EcranUne.marquerVu(j); return 0; }
  return j.pages.filter((p) => !vus[j.id].includes(p.id) && p.testUserPermission(game.user, "OBSERVER")).length;
}

function dateDuJour(era) {
  if (!actif(CALENDRIER)) return "";
  try { const d = game.modules.get(CALENDRIER).api.getDate(era); return d?.y ? `${d.d === 1 ? "1er" : d.d} ${MOIS[(d.m ?? 1) - 1]} ${d.y}` : ""; } catch (err) { return ""; }
}

const fondScene = (s) => s?.levels?.contents?.[0]?.background?.src || s?.background?.src || s?.thumb || "";
const outilResume = () => ui.controls?.controls?.tokens?.tools?.resumeEpoques ?? null;

/* ================================================================== */
/*  Boîte à outils : les modules CoC7 du monde                        */
/* ================================================================== */

/** Cherche un bouton de la barre de gauche (tous groupes confondus). */
function outilBarre(nom) {
  for (const g of Object.values(ui.controls?.controls ?? {})) { const t = g?.tools?.[nom]; if (t) return t; }
  return null;
}

/**
 * Catalogue des modules. qui : "tous" ou "gardien" (un bouton de la barre de gauche caché au joueur le retire aussi).
 * Action : outil (bouton de la barre de gauche), touche (raccourci clavier), pack (compendium), fn (fonction), ou rien (automatique).
 * fermer : ferme l'accueil avant (pour les éléments affichés sur la scène, sous l'écran).
 */
const MODULES = [
  // Pour tous
  { id: "messages-secrets", qui: "tous", icone: "fa-user-secret", nom: "Messages secrets", desc: "Écrire en privé au Gardien ou à un autre joueur.", outil: "messagesSecrets" },
  { id: "coc7-resume-epoques", qui: "tous", icone: "fa-scroll", nom: "Résumés des époques", desc: "Les résumés des séances, pour 1933 et pour 2026.", outil: "resumeEpoques" },
  { id: "calendrier-epoques", qui: "tous", icone: "fa-calendar-days", nom: "Calendrier des deux époques", desc: "La date du jour en 1933 et en 2026.", outil: "calendrierEpoques", fermer: true },
  { id: "fiches-en-ligne", qui: "tous", icone: "fa-globe", nom: "Ma fiche en ligne", desc: "Ta fiche sur le site, à consulter ou imprimer hors de Foundry.", fn: "ficheEnLigne" },
  { id: "coc7-fiches-thematiques", qui: "tous", icone: "fa-palette", nom: "Thème de ma fiche", desc: "Choisir l'habillage de ta fiche d'investigateur.", fn: "theme" },
  { id: "combatcthud", qui: "tous", icone: "fa-dharmachakra", nom: "Combat Cthulhu HUD", desc: "Le tableau de bord de combat de ton investigateur.", outil: "combatcthud", fermer: true },
  { id: "coc7-suivi-groupe", qui: "tous", icone: "fa-person-running", nom: "Jauge de poursuite", desc: "Afficher la jauge des poursuites.", outil: "chaseGauge", fermer: true },
  { id: "lecteur-canva", qui: "tous", icone: "fa-chalkboard", nom: "Tableau Canva", desc: "Le tableau Canva partagé de la campagne.", outil: "lecteur-canva" },
  { id: "barres-macros-libres", qui: "tous", icone: "fa-table-cells", nom: "Barres de macros libres", desc: "Réduire ou afficher tes barres de macros flottantes (Alt+M).", touche: "barres-macros-libres.toggle", fermer: true },
  { id: "carrousel-combat", qui: "tous", icone: "fa-circle-nodes", nom: "Carrousel de combat", desc: "Afficher ou masquer l'ordre du combat (Alt+0 du pavé numérique).", touche: "carrousel-combat.toggle", fermer: true },
  { id: "coc7-macros-perso", qui: "tous", icone: "fa-code", nom: "Macros CoC7", desc: "Le compendium des macros à glisser dans ta barre.", pack: "coc7-macros-perso.macros-coc7" },
  { id: "coc7-cartes-phobies-manies", qui: "tous", icone: "fa-clone", nom: "Cartes Phobies / Manies", desc: "Les tables de phobies et de manies.", pack: "coc7-cartes-phobies-manies.cartes-phobies-manies" },
  { id: "critiques-du-mythe", qui: "tous", icone: "fa-burst", nom: "Critiques du Mythe", desc: "Voir l'effet d'une réussite critique (il se joue tout seul pendant la partie).", fn: "critique", fermer: true },
  { id: "coc7-ecran-accueil", qui: "tous", icone: "fa-compass", nom: "Écran d'accueil (navigation)", desc: "L'autre accueil, celui des pages de navigation.", outil: "cea-accueil", fermer: true },
  // Pour le Gardien
  { id: "coc7-bascule-epoque", qui: "gardien", icone: "fa-hourglass-half", nom: "Bascule d'époque", desc: "Passer la table de 1933 à 2026, régler les personnages de chaque époque.", outil: "basculeEpoque" },
  { id: "distribution-aides-de-jeu", qui: "gardien", icone: "fa-envelope-open-text", nom: "Remettre une aide de jeu", desc: "Donner une aide de jeu aux joueurs (rangée dans leur carnet).", outil: "distributionAides" },
  { id: "conversations-pnj", qui: "gardien", icone: "fa-comments", nom: "Conversations – portraits des PNJ", desc: "Afficher les portraits des PNJ qui parlent.", outil: "conversationsPnj" },
  { id: "coc7-suivi-groupe", qui: "gardien", icone: "fa-users-viewfinder", nom: "Suivi du groupe", desc: "PV, SAN, chance et état des investigateurs d'un coup d'œil.", outil: "csgSuivi" },
  { id: "roll-ensemble-coc7", qui: "gardien", icone: "fa-dice", nom: "Roll Ensemble", desc: "Demander un même jet à plusieurs investigateurs.", outil: "rollEnsemble" },
  { id: "fiches-en-ligne", qui: "gardien", icone: "fa-globe", nom: "Fiches en ligne", desc: "Publier les fiches des joueurs sur le site.", fn: "fichesPanneau" },
  { id: "coc7-tableaux-perso", qui: "gardien", icone: "fa-table-list", nom: "Tableaux aléatoires", desc: "Les tables aléatoires de Montagnes Hallucinées.", pack: "coc7-tableaux-perso.tableaux-coc7" },
  // Automatiques (rien à ouvrir)
  { id: "coc7-cartes-chat", qui: "tous", icone: "fa-message", nom: "Cartes de chat thématiques", desc: "Le chat et les cartes de jets prennent le style de l'époque." },
  { id: "coc7-fenetre-jet", qui: "tous", icone: "fa-dice-d20", nom: "Fenêtre de jet thématique", desc: "Avant un jet : difficulté, dés bonus et malus, chances de réussite." },
  { id: "coc7-conteneurs", qui: "tous", icone: "fa-suitcase", nom: "Conteneurs", desc: "Sur ta fiche, glisse tes objets dans un sac ou une valise." },
  { id: "coc7-flip-cards", qui: "tous", icone: "fa-repeat", nom: "Cartes à retourner", desc: "Clic sur une carte de phobie ou de manie dans le chat pour la retourner." },
  { id: "combat-distances", qui: "tous", icone: "fa-ruler", nom: "Distances de combat", desc: "Les distances s'affichent autour du jeton pendant le combat." },
  { id: "taille-jeton-molette", qui: "tous", icone: "fa-up-right-and-down-left-from-center", nom: "Taille des jetons à la molette", desc: "La molette sur un jeton change sa taille." },
  { id: "dice-so-nice", qui: "tous", icone: "fa-dice-six", nom: "Dice So Nice", desc: "Les dés roulent en 3D (réglages : Configurer les paramètres)." },
  { id: "commandes-stream-deck", qui: "gardien", icone: "fa-keyboard", nom: "Commandes Stream Deck", desc: "Musique, bruitages et outils pilotés depuis le Stream Deck." },
  { id: "dossiers-caches", qui: "gardien", icone: "fa-folder-closed", nom: "Masquer les dossiers de journaux", desc: "Clic droit sur un dossier de journaux pour le masquer." }
];

/** Clé d'un module du catalogue (un même module peut avoir deux entrées). */
const cleModule = (m) => `${m.id}:${m.outil || m.touche || m.pack || m.fn || "auto"}`;
/** Ce que voient les joueurs tant que le Gardien n'a rien choisi : l'essentiel. */
const JOUEURS_DEFAUT = ["messages-secrets:messagesSecrets", "coc7-resume-epoques:resumeEpoques", "calendrier-epoques:calendrierEpoques", "fiches-en-ligne:ficheEnLigne", "coc7-fiches-thematiques:theme", "combatcthud:combatcthud", "coc7-conteneurs:auto"];
function vusParJoueurs() { const v = game.settings.get(ID, "outilsJoueurs"); return Array.isArray(v) ? v : JOUEURS_DEFAUT; }

/** Les modules utilisables par cet utilisateur, rangés : à ouvrir (tous / Gardien) et automatiques. */
function modulesDisponibles() {
  const gm = game.user.isGM; const r = { tous: [], gardien: [], auto: [] }; const vus = vusParJoueurs();
  MODULES.forEach((m, i) => {
    if (!game.modules.get(m.id)?.active) return;
    if (m.qui === "gardien" && !gm) return;
    const pourJoueurs = m.qui === "tous" && vus.includes(cleModule(m));
    if (!gm && !pourJoueurs) return;
    let ok = true;
    if (m.outil) { const t = outilBarre(m.outil); ok = !!t && t.visible !== false; }
    else if (m.touche) { const k = game.keybindings.actions.get(m.touche); ok = !!k && (!k.restricted || gm); }
    else if (m.pack) { const p = game.packs.get(m.pack); ok = !!p && (gm || p.visible !== false); }
    else if (m.fn === "ficheEnLigne") ok = gm || !!lienFicheEnLigne();
    else if (m.fn === "fichesPanneau") ok = gm && !!game.settings.menus.get("fiches-en-ligne.panel");
    else if (m.fn === "theme") ok = gm || !!monPersonnage(epoque());
    else if (m.fn === "critique") ok = !!game.modules.get(m.id).api?.tester;
    if (!ok) return;
    const action = m.outil || m.touche || m.pack || m.fn;
    (action ? (m.qui === "gardien" ? r.gardien : r.tous) : r.auto).push({ ...m, i, action: !!action, pourJoueurs, joueurSeul: gm && m.fn === "ficheEnLigne" });
  });
  return r;
}

function lienFicheEnLigne() {
  const p = monPersonnage(epoque()); if (!p) return "";
  const jeton = p.getFlag("fiches-en-ligne", "token");
  let site = ""; try { site = String(game.settings.get("fiches-en-ligne", "siteUrl") ?? "").trim().replace(/\/+$/, ""); } catch (err) { /* réglage absent */ }
  return jeton && site ? `${site}/fiche.html#${jeton}` : "";
}

/** Lance l'outil n° i du catalogue. */
async function lancerModule(i) {
  const m = MODULES[i]; if (!m) return;
  if (m.fermer) EcranUne.fermer();
  try {
    if (m.outil) { const t = outilBarre(m.outil); return t?.onChange?.(new PointerEvent("click"), true); }
    if (m.touche) return game.keybindings.actions.get(m.touche)?.onDown?.({});
    if (m.pack) return game.packs.get(m.pack)?.render(true);
    switch (m.fn) {
      case "ficheEnLigne": { const u = lienFicheEnLigne(); if (u) window.open(u, "_blank", "noopener"); return; }
      case "fichesPanneau": { const T = game.settings.menus.get("fiches-en-ligne.panel")?.type; return T ? new T().render(true) : null; }
      case "theme": return EcranUne.afficher("theme");
      case "critique": return game.modules.get(m.id).api.tester("critical");
    }
  } catch (err) { console.error(`${ID} | ${m.nom}`, err); ui.notifications.warn(`« ${m.nom} » n'a pas pu s'ouvrir.`); }
}

/* ================================================================== */
/*  Dessins : carte de l'Antarctique et fil rouge                      */
/* ================================================================== */

const CARTE_1933 = `<svg class="cau-carte" viewBox="0 0 760 560" aria-hidden="true">
  <defs><radialGradient id="cau-pap" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="#efe2bf"/><stop offset=".75" stop-color="#d9c38e"/><stop offset="1" stop-color="#a9874e"/></radialGradient></defs>
  <rect width="760" height="560" fill="url(#cau-pap)"/><rect x="14" y="14" width="732" height="532" fill="none" stroke="#6b4f2a" stroke-width="2"/><rect x="22" y="22" width="716" height="516" fill="none" stroke="#6b4f2a" stroke-width=".8"/>
  <g fill="none" stroke="#8a6d43" stroke-width=".9" stroke-dasharray="3 5"><circle cx="380" cy="290" r="70"/><circle cx="380" cy="290" r="140"/><circle cx="380" cy="290" r="210"/></g>
  <g stroke="#8a6d43" stroke-width=".7"><path d="M380 60V520M150 290H610M218 128L542 452M542 128L218 452"/></g>
  <path d="M250 230C270 170 340 150 380 175C440 140 520 180 535 240C575 285 525 360 470 372C440 420 350 412 318 380C255 388 215 335 232 290C215 270 228 248 250 230Z" fill="#f4ead2" stroke="#4b3720" stroke-width="2.2"/>
  <path d="M380 175C392 230 410 270 380 330" fill="none" stroke="#6b4f2a" stroke-width="1.6" stroke-dasharray="5 4"/>
  <circle cx="430" cy="270" r="6" fill="#9b1c14"/><text x="442" y="266" font-family="CAU Special Elite" font-size="13" fill="#9b1c14">76°15′S 168°42′E</text>
  <g transform="translate(640 470)"><circle r="34" fill="none" stroke="#4b3720"/><path d="M0-44L7 0 0 44-7 0Z" fill="#4b3720"/><path d="M-44 0L0 6 44 0 0-6Z" fill="#8a6d43"/><text y="-50" text-anchor="middle" font-family="CAU Garamond" font-size="14" fill="#4b3720">N</text></g>
  <g transform="translate(40 470)"><rect width="230" height="56" fill="#f4ead2" stroke="#4b3720"/><text x="115" y="24" text-anchor="middle" font-family="CAU Fraktur" font-size="20" fill="#2a2117">Terra Australis</text><text x="115" y="44" text-anchor="middle" font-family="CAU Garamond" font-style="italic" font-size="13" fill="#4b3720">relevé de l'expédition Pabodie, 1930</text></g>
</svg>`;

const CARTE_2026 = `<svg class="cau-carte" viewBox="0 0 760 560" aria-hidden="true">
  <defs><radialGradient id="cau-oc" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="#1f4f7a"/><stop offset="1" stop-color="#0b2238"/></radialGradient><linearGradient id="cau-gl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfe3f0"/></linearGradient></defs>
  <rect width="760" height="560" fill="#ffffff"/><rect x="10" y="10" width="740" height="540" fill="url(#cau-oc)"/>
  <g fill="none" stroke="rgba(160,210,240,.35)" stroke-width=".8"><circle cx="380" cy="285" r="75"/><circle cx="380" cy="285" r="150"/><circle cx="380" cy="285" r="225"/><path d="M380 10V550M10 285H750M190 95L570 475M570 95L190 475"/></g>
  <path d="M245 225C268 160 345 140 385 168C450 132 532 176 546 238C590 285 535 368 474 380C440 432 345 422 312 388C246 396 206 338 225 290C207 268 222 243 245 225Z" fill="url(#cau-gl)" stroke="#9fd0ee" stroke-width="1.5"/>
  <g fill="#ffcc4d"><circle cx="330" cy="330" r="4"/><circle cx="455" cy="205" r="4"/><circle cx="300" cy="245" r="4"/></g>
  <g font-family="CAU Mono" font-size="11" fill="#e8f4fb"><text x="338" y="334">McMurdo</text><text x="463" y="209">Concordia</text><text x="232" y="240">Halley VI</text></g>
  <circle cx="430" cy="270" r="9" fill="none" stroke="#ff4d4d" stroke-width="2.5"/><circle cx="430" cy="270" r="3" fill="#ff4d4d"/><text x="446" y="266" font-family="CAU Mono" font-size="13" font-weight="600" fill="#ff8080">76°15′S 168°42′E</text>
  <g transform="translate(30 500)"><rect width="250" height="38" fill="rgba(0,0,0,.55)"/><text x="12" y="17" font-family="CAU Inter" font-weight="800" font-size="13" fill="#ffffff" letter-spacing="1.5">ANTARCTICA</text><text x="12" y="31" font-family="CAU Mono" font-size="10" fill="#9fd0ee">composite satellite · 2025 · EPSG:3031</text></g>
  <g transform="translate(560 515)"><rect width="150" height="5" fill="#ffffff"/><rect width="75" height="5" fill="#9fd0ee"/><text y="20" font-family="CAU Mono" font-size="10" fill="#e8f4fb">0</text><text x="135" y="20" font-family="CAU Mono" font-size="10" fill="#e8f4fb">1000 km</text></g>
</svg>`;

/** Clé d'une étiquette pour le fil rouge : la même chez le Gardien et chez les joueurs. */
const ALIAS_FIL = { fiche: "perso", investigateurs: "perso", bascule: "perso", carnets: "carnet" };
const cleFil = (cp) => ALIAS_FIL[cp.dataset.cau] ?? cp.dataset.cau;
/** Clé d'un élément déplaçable de la une : étiquette, journal (« une ») ou carte (« carte »). */
function cleBloc(e) {
  if (e.matches(".cau-cp")) return cleFil(e);
  if (e.matches(".cau-une")) return "une";
  if (e.matches(".cau-carte-img, .cau-carte")) return "carte";
  return null;
}
const BLOCS = ":scope > .cau-cp, :scope > .cau-une, :scope > .cau-carte-img, :scope > .cau-carte";
const FIL = `<svg class="cau-fil" viewBox="0 0 1600 1000" aria-hidden="true"></svg>`;
const SILHOUETTE = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="40" r="17"/><path d="M18 100c2-26 16-38 32-38s30 12 32 38z"/></svg>`;

/* ================================================================== */
/*  L'écran                                                            */
/* ================================================================== */

class EcranUne {
  static el = null;
  static editionUne = false;   // panneau « changer la une » ouvert (Gardien)
  static modeFil = false;      // le Gardien dispose le fil rouge
  static filChoix = null;      // punaise choisie, en attente de la seconde
  static filSansClic = false;  // la punaise centrale vient d'être glissée : ignorer le clic qui suit
  static vue = "une";          // une | wiki | theme | prepa | bureau | outils | reglages | investigateurs | carnets
  static vision = null;        // { titre, scenes: [ids], i }
  static wiki = { quel: "joueur", entree: null, page: null };

  static ouvrir(vue = "une") {
    if (!EcranUne.el) {
      const el = document.createElement("section");
      el.id = "cau-ecran"; el.tabIndex = -1; el.setAttribute("aria-label", "Écran d'accueil");
      el.addEventListener("click", (ev) => EcranUne.#clic(ev));
      el.addEventListener("change", (ev) => EcranUne.#champ(ev));
      el.addEventListener("pointerdown", (ev) => {
        if (ev.target.closest(".cau-point")) return EcranUne.#glisserPoint(ev);
        if (ev.target.closest(".cau-centre")) return EcranUne.#glisserCentre(ev);
        EcranUne.#glisserBloc(ev);
      });
      el.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && EcranUne.modeFil) { ev.stopPropagation(); EcranUne.modeFil = false; EcranUne.filChoix = null; return EcranUne.afficher(); } if (ev.key === "Escape") { ev.stopPropagation(); EcranUne.vision ? EcranUne.fermerVision() : (EcranUne.vue !== "une" ? EcranUne.afficher("une") : EcranUne.fermer()); } });
      document.body.append(el); EcranUne.el = el;
      el.focus({ preventScroll: true });
    }
    EcranUne.afficher(vue);
    EcranUne.majBouton();
  }

  static fermer() { EcranUne.el?.remove(); EcranUne.el = null; EcranUne.vision = null; EcranUne.vue = "une"; EcranUne.majBouton(); }
  static basculer() { return EcranUne.el ? EcranUne.fermer() : EcranUne.ouvrir(); }

  static majBouton() {
    const t = ui.controls?.controls?.tokens?.tools?.["cau-accueil"];
    if (t) t.active = !!EcranUne.el;
    ui.controls?.render?.();
  }

  /** L'accueil est dessiné à 1600 × 1000 puis mis à l'échelle de la fenêtre. */
  static echelle() {
    const scene = EcranUne.el?.querySelector(".cau-scene"); if (!scene) return;
    const k = Math.min(window.innerWidth / W, window.innerHeight / H);
    scene.style.transform = `translate(-50%, -50%) scale(${k})`;
  }

  /**
   * Le fil rouge : il relie seulement quelques étiquettes entre elles, de punaise à punaise (les autres restent épinglées seules).
   * Calculé d'après la position réelle des punaises, il suit la taille des étiquettes. Dessin fixe, sans animation.
   */
  static fil() {
    const scene = EcranUne.el?.querySelector(".cau-scene"); const svg = scene?.querySelector(".cau-fil"); if (!svg) return;
    const r = scene.getBoundingClientRect(); const k = r.width / W || 1;
    const c = config()[epoque()];
    const elFil = (cle) => cle === "une" ? scene.querySelector(":scope > .cau-une > .cau-pin")
      : cle === "centre" ? scene.querySelector(":scope > .cau-centre")
      : [...scene.querySelectorAll(":scope > .cau-cp")].find((cp) => cleFil(cp) === cle)?.querySelector(":scope > .cau-pin");
    const pos = (cle) => { const e = elFil(cle); if (!e) return null; const b = e.getBoundingClientRect(); return [(b.left + b.width / 2 - r.left) / k, (b.top + b.height / 2 - r.top) / k]; };
    const chemins = []; const prises = [];
    (c.fils ?? []).forEach(([a, b], i) => {
      const A = pos(a); const B = pos(b); if (!A || !B) return;
      const d = Math.hypot(B[0] - A[0], B[1] - A[1]); const mx = (A[0] + B[0]) / 2; const my = (A[1] + B[1]) / 2 + d * 0.08; // le fil pend un peu
      const dd = `M${A[0].toFixed(1)} ${A[1].toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${B[0].toFixed(1)} ${B[1].toFixed(1)}`;
      chemins.push(`<path d="${dd}"/>`);
      if (EcranUne.modeFil) prises.push(`<path class="cau-fil-prise" data-i="${i}" d="${dd}"><title>Couper ce fil</title></path>`);
    });
    svg.innerHTML = chemins.join("") + prises.join("");
    // En mode fil : marquer la punaise choisie
    for (const e of scene.querySelectorAll(".cau-pin.choisie, .cau-centre.choisie")) e.classList.remove("choisie");
    if (EcranUne.modeFil && EcranUne.filChoix) elFil(EcranUne.filChoix)?.classList.add("choisie");
  }

  /** Mode fil rouge : clic sur une punaise puis une autre = un fil ; clic sur un fil = le couper. */
  static async #clicFil(ev) {
    ev.preventDefault(); ev.stopPropagation();
    if (EcranUne.filSansClic) { EcranUne.filSansClic = false; return; }
    const era = epoque(); const all = config(); const c = all[era]; c.fils = [...(c.fils ?? [])];
    const enregistrer = async () => { await game.settings.set(ID, "config", all); EcranUne.fil(); };
    const action = ev.target.closest("[data-cau]")?.dataset.cau;
    if (action === "fil-fin") { EcranUne.modeFil = false; EcranUne.filChoix = null; return EcranUne.afficher(); }
    if (action === "fil-vider") { c.fils = []; EcranUne.filChoix = null; return enregistrer(); }
    if (action === "fil-etoile") { // relier toutes les étiquettes à la punaise centrale
      const cles = [...EcranUne.el.querySelectorAll(".cau-scene > .cau-cp")].map(cleFil);
      c.fils = ["une", ...cles].map((k) => ["centre", k]); EcranUne.filChoix = null; await game.settings.set(ID, "config", all); return EcranUne.afficher();
    }
    if (action === "pos-defaut") { delete c.positions; await game.settings.set(ID, "config", all); return EcranUne.afficher(); }
    if (action === "fil-defaut") { c.fils = FILS_DEFAUT.map((f) => [...f]); EcranUne.filChoix = null; return enregistrer(); }
    const prise = ev.target.closest(".cau-fil-prise");
    if (prise) { c.fils.splice(Number(prise.dataset.i), 1); return enregistrer(); }
    const cp = ev.target.closest(".cau-scene > .cau-cp");
    const cle = ev.target.closest(".cau-centre") ? "centre" : cp ? cleFil(cp) : ev.target.closest(".cau-une") ? "une" : null;
    if (!cle) { EcranUne.filChoix = null; return EcranUne.fil(); }
    const avant = EcranUne.filChoix;
    if (!avant || avant === cle) { EcranUne.filChoix = avant === cle ? null : cle; return EcranUne.fil(); }
    const existe = c.fils.findIndex(([a, b]) => (a === avant && b === cle) || (a === cle && b === avant));
    if (existe >= 0) c.fils.splice(existe, 1); else c.fils.push([avant, cle]); // relier (ou défaire si le fil existe déjà)
    EcranUne.filChoix = cle; // on peut continuer la chaîne depuis cette punaise
    if (cle === "centre" || avant === "centre") { await game.settings.set(ID, "config", all); return EcranUne.afficher(); }
    return enregistrer();
  }

  /** Applique les positions choisies par le Gardien (par époque). */
  static #placer() {
    const scene = EcranUne.el?.querySelector(".cau-scene"); if (!scene) return;
    const pos = config()[epoque()].positions ?? {};
    for (const e of scene.querySelectorAll(BLOCS)) { const p = pos[cleBloc(e)]; if (p) { e.style.left = `${p.x}px`; e.style.top = `${p.y}px`; } }
    scene.classList.toggle("cau-disposer", !!(EcranUne.modeFil && game.user.isGM));
  }

  /** Mode mise en place : faire glisser une étiquette, le journal ou la carte. Sans mouvement, c'est un clic (fil rouge). */
  static #glisserBloc(ev) {
    if (!EcranUne.modeFil || !game.user.isGM || ev.button !== 0 || ev.target.closest(".cau-editer, .cau-mode-fil, .cau-centre, .cau-point")) return;
    const scene = EcranUne.el.querySelector(".cau-scene");
    const bloc = [...scene.querySelectorAll(BLOCS)].find((b) => b.contains(ev.target)); if (!bloc) return;
    const k = scene.getBoundingClientRect().width / W || 1;
    const x0 = ev.clientX; const y0 = ev.clientY; const l0 = bloc.offsetLeft; const t0 = bloc.offsetTop;
    let bouge = false; let x = l0; let y = t0;
    const bouger = (e) => {
      if (!bouge && Math.hypot(e.clientX - x0, e.clientY - y0) < 5) return;
      if (!bouge) { bouge = true; bloc.classList.add("cau-prise"); }
      x = Math.round(Math.min(W - 40, Math.max(-bloc.offsetWidth + 40, l0 + (e.clientX - x0) / k)));
      y = Math.round(Math.min(H - 30, Math.max(-20, t0 + (e.clientY - y0) / k)));
      bloc.style.left = `${x}px`; bloc.style.top = `${y}px`; EcranUne.fil();
    };
    const lacher = async () => {
      window.removeEventListener("pointermove", bouger); window.removeEventListener("pointerup", lacher);
      if (!bouge) return;
      bloc.classList.remove("cau-prise");
      EcranUne.filSansClic = true; setTimeout(() => { EcranUne.filSansClic = false; }, 300);
      const all = config(); const c = all[epoque()]; c.positions = { ...(c.positions ?? {}), [cleBloc(bloc)]: { x, y } };
      await game.settings.set(ID, "config", all);
    };
    window.addEventListener("pointermove", bouger); window.addEventListener("pointerup", lacher);
  }

  /** Mode fil rouge : faire glisser la punaise centrale. */
  static #glisserCentre(ev) {
    const centre = ev.target.closest?.(".cau-centre"); if (!centre || !EcranUne.modeFil || ev.button !== 0) return;
    ev.preventDefault(); ev.stopPropagation();
    const scene = EcranUne.el.querySelector(".cau-scene"); const k = scene.getBoundingClientRect().width / W || 1;
    const x0 = ev.clientX; const y0 = ev.clientY; const l0 = parseFloat(centre.style.left); const t0 = parseFloat(centre.style.top);
    let bouge = false; let x = l0; let y = t0;
    const bouger = (e) => {
      if (Math.hypot(e.clientX - x0, e.clientY - y0) > 3) bouge = true; if (!bouge) return;
      x = Math.min(W, Math.max(0, l0 + (e.clientX - x0) / k)); y = Math.min(H, Math.max(0, t0 + (e.clientY - y0) / k));
      centre.style.left = `${x}px`; centre.style.top = `${y}px`; EcranUne.fil();
    };
    const lacher = async () => {
      window.removeEventListener("pointermove", bouger); window.removeEventListener("pointerup", lacher);
      if (!bouge) return;
      EcranUne.filSansClic = true; setTimeout(() => { EcranUne.filSansClic = false; }, 300);
      const all = config(); all[epoque()].centre = { x: Math.round(x), y: Math.round(y) };
      await game.settings.set(ID, "config", all);
    };
    window.addEventListener("pointermove", bouger); window.addEventListener("pointerup", lacher);
  }

  /** Le Gardien fait glisser le point rouge sur la carte ; les coordonnées suivent, la position est enregistrée au lâcher. */
  static #glisserPoint(ev) {
    const point = ev.target.closest?.(".cau-point.deplacable"); if (!point || !game.user.isGM || ev.button !== 0) return;
    ev.preventDefault(); ev.stopPropagation();
    const img = point.parentElement.querySelector("img"); const coord = point.parentElement.querySelector(".cau-coord");
    const era = epoque(); const c = config()[era];
    let x = parseFloat(c.pointX); let y = parseFloat(c.pointY);
    const bouger = (e) => {
      const b = img.getBoundingClientRect();
      x = Math.min(100, Math.max(0, (e.clientX - b.left) / b.width * 100)); y = Math.min(100, Math.max(0, (e.clientY - b.top) / b.height * 100));
      for (const n of [point, coord]) { if (!n) continue; n.style.left = `${x}%`; n.style.top = `${y}%`; }
      if (coord) coord.textContent = libelleCoord(c, x, y);
    };
    const lacher = async () => {
      window.removeEventListener("pointermove", bouger); window.removeEventListener("pointerup", lacher);
      point.classList.remove("prise");
      const all = config(); all[era].pointX = x.toFixed(2); all[era].pointY = y.toFixed(2);
      await game.settings.set(ID, "config", all);
    };
    point.classList.add("prise");
    window.addEventListener("pointermove", bouger); window.addEventListener("pointerup", lacher);
  }

  static async afficher(vue = EcranUne.vue) {
    EcranUne.vue = vue;
    const el = EcranUne.el; if (!el) return;
    const era = epoque();
    el.className = era === "modern" ? "cau-2026" : "cau-1933";
    el.style.setProperty("--cau-taille", String((Number(game.settings.get(ID, "taille")) || 80) / 100));
    const page = vue === "une" ? "" : `<div class="cau-voile" data-cau="une"></div><article class="cau-page">${await EcranUne.#page(vue, era)}</article>`;
    el.innerHTML = `<div class="cau-scene">${EcranUne.#une(era)}${page}${EcranUne.vision ? EcranUne.#vision(era) : ""}</div>`;
    EcranUne.echelle();
    EcranUne.#placer();
    EcranUne.fil();
    EcranUne.#zoom();
    el.querySelector(".cau-page")?.scrollTo?.(0, 0);
  }

  /* ---------------- La une ---------------- */

  static #une(era) {
    const c = config()[era]; const gm = game.user.isGM; const m = era === "modern";
    const perso = gm ? null : monPersonnage(era);
    const nom = perso?.name ?? game.user.name;
    const date = (c.date ?? "").trim() || dateDuJour(era); // date libre des réglages, sinon celle du calendrier
    const cp = (cle, pos, contenu, extra = "") => `<button type="button" class="cau-cp ${extra}" data-cau="${cle}" style="${pos}"><i class="cau-pin"></i>${contenu}</button>`;

    // Ma fiche (ou, pour le Gardien, les investigateurs de l'époque)
    let fiche;
    if (gm) {
      const ps = personnagesEpoque(era).slice(0, 4);
      fiche = cp("investigateurs", "left:80px;top:205px;width:250px;--r:-4deg", `<small>${m ? "Les descendants" : "L'expédition"}</small><b>Les investigateurs</b>
        <span class="cau-trombi">${ps.map((a) => `<img src="${esc(a.img)}" alt="">`).join("")}</span><span>Voir leurs fiches</span>`, "photo");
    } else if (perso) {
      const s = stats(perso);
      fiche = m
        ? cp("fiche", "left:80px;top:200px;width:230px;--r:-3deg", `<span class="cau-badge"><span class="cau-badge-tete">HARTFORD HERITAGE TRUST · INVITÉ</span>
            <span class="cau-badge-corps"><img src="${esc(perso.img)}" alt=""><span><b>${esc(perso.name)}</b><em>${esc(s.occ)}</em><code>PV ${s.pv} · SAN ${s.san}<br>CHANCE ${s.chance}</code></span></span>
            <span class="cau-badge-pied">Ouvrir ma fiche ›</span></span>`, "nu")
        : cp("fiche", "left:80px;top:205px;width:230px;--r:-4deg", `<img class="cau-portrait" src="${esc(perso.img)}" alt=""><b>${esc(perso.name)}</b><em>${esc(s.occ || "investigateur")} — ouvrir ma fiche</em>
            <code>PV ${s.pv} · SAN ${s.san} · CHANCE ${s.chance}</code>`, "photo");
    } else {
      fiche = cp("bascule", "left:80px;top:205px;width:230px;--r:-4deg", `<span class="cau-portrait vide">${SILHOUETTE}</span><b>Aucun personnage</b><em>Le Gardien n'a pas encore réglé ton personnage pour cette époque</em>`, "photo");
    }

    // Mon carnet de bord (ou, pour le Gardien, tous les carnets de l'époque)
    let carnet;
    if (gm) {
      carnet = cp("carnets", "left:95px;top:600px;width:210px;--r:3deg", `<span class="cau-carnet"><span class="cau-etiquette">${esc(c.carnet)}<br>${carnets(era).length} carnets</span></span><b class="cau-legende">Les carnets de bord</b>`, "nu");
    } else {
      const j = monCarnet(era, perso);
      const n = pagesNouvelles(j);
      carnet = j
        ? cp("carnet", "left:95px;top:600px;width:210px;--r:3deg", `<span class="cau-carnet" data-id="${j.id}"><span class="cau-etiquette">${esc(c.carnet)}<br>${esc((j.name.match(/\[(.*)\]/)?.[1]) ?? j.name)}</span>${n ? `<span class="cau-nouveau">${n} ${m ? (n > 1 ? "nouvelles notes" : "nouvelle note") : (n > 1 ? "pages nouvelles" : "page nouvelle")}</span>` : ""}</span><b class="cau-legende">Mon carnet de bord</b>`, "nu")
        : "";
    }

    const dramatis = c.dramatis && game.scenes.get(c.dramatis)
      ? (m ? cp("dramatis", "left:1120px;top:200px;width:310px;--r:-2deg", `<b class="cau-sans">Personnes d'intérêt</b><span>Dramatis personae : qui est qui dans l'affaire — à voir sans changer de scène</span>`, "postit")
           : cp("dramatis", "left:1120px;top:200px;width:330px;--r:-1.5deg", `<b>TÉLÉGRAMME</b><span>DRAMATIS PERSONAE STOP LES VISAGES DE L'EXPÉDITION STOP À VOIR SANS QUITTER LA SALLE STOP</span>`, "telegramme"))
      : "";
    const cartes = (c.cartes ?? []).some((id) => game.scenes.get(id))
      ? cp("cartes", "left:590px;top:300px;width:230px;--r:-3deg", m ? `<small>Cartes</small><b>Les cartes de l'enquête</b><span>${esc(c.cartes.map((id) => joliNom(game.scenes.get(id)?.name ?? "")).filter(Boolean).slice(0, 3).join(", "))}…</span>`
                                                                   : `<small>Cartographie</small><b>Les cartes de l'expédition</b><span>À voir en vision, sans quitter la salle</span>`)
      : "";
    const wiki = cp("wiki", "left:880px;top:645px;width:250px;--r:2deg", m ? `<small>Enquête</small><b>Tout comprendre de l'affaire</b><span>Le wiki des joueurs, lu sur place</span>` : `<small>Dossier</small><b>Tout savoir sur l'expédition</b><span>Le wiki des joueurs, lu sur place</span>`);
    const resume = outilResume() ? cp("resume", "left:1200px;top:410px;width:270px;--r:3deg", m ? `<small>Précédemment</small><b>Le récap de la dernière séance</b><span>Ce qu'il faut retenir avant de reprendre</span>` : `<small>Édition précédente</small><b>La dernière séance</b><span>Le résumé, pour se remettre dans l'ambiance</span>`) : "";
    const theme = actif(FICHES) && (gm || perso) ? cp("theme", "left:1250px;top:640px;width:210px;--r:-2deg", m ? `<small>Style</small><b>Mon apparence</b><span>Thème de ma fiche</span>` : `<small>Mode</small><b>La mode de 1933</b><span>Thème de ma fiche</span>`) : "";
    const prepa = gm ? cp("prepa", "left:340px;top:800px;width:270px;--r:1.5deg", `<small>${m ? "Rédaction · " : ""}Gardien</small><b>Préparer la partie</b><span>Compendiums à importer, en dossiers</span>`) : "";
    const bureau = gm ? cp("bureau", "left:990px;top:800px;width:270px;--r:2.5deg", `<small>Gardien</small><b>Le bureau du Gardien</b><span>Wiki du Gardien, outils, réglages</span>`, m ? "" : "jaune") : "";
    const nbOutils = (() => { const d = modulesDisponibles(); return d.tous.length + d.gardien.length; })();
    const outils = nbOutils ? cp("outils", "left:1285px;top:800px;width:230px;--r:-2.5deg", m ? `<small>Applis</small><b>La boîte à outils</b><span>${nbOutils} modules à portée de main</span>` : `<small>Matériel</small><b>La malle à outils</b><span>${nbOutils} modules à portée de main</span>`, m ? "" : "telegramme") : "";
    const entrer = cp("entrer", "left:680px;top:800px;width:250px;--r:-2deg", `<b class="cau-gros">${m ? "Se connecter ›" : "Embarquer ›"}</b><span>La séance commence</span>`, "sombre");

    // Carte de l'Antarctique : l'image choisie dans les réglages, sinon la carte dessinée
    // Point rouge 76°15′S 168°42′E (position en % de l'image, réglable)
    const px = parseFloat(c.pointX); const py = parseFloat(c.pointY);
    const point = c.carte && Number.isFinite(px) && Number.isFinite(py) ? `<i class="cau-point${gm ? " deplacable" : ""}" style="left:${px}%;top:${py}%"${gm ? ` title="Glisser pour déplacer le point rouge"` : ""}></i><em class="cau-coord" style="left:${px}%;top:${py}%">${esc(libelleCoord(c, px, py))}</em>` : "";
    const ctr = c.centre ?? CENTRE_DEFAUT;
    const centre = (gm && EcranUne.modeFil) || (c.fils ?? []).some((f) => f.includes("centre")) ? `<i class="cau-centre${gm && EcranUne.modeFil ? " modifiable" : ""}" style="left:${ctr.x}px;top:${ctr.y}px" title="${gm && EcranUne.modeFil ? "Punaise centrale : glisser pour la déplacer" : ""}"></i>` : "";
    const carte = c.carte ? `<div class="cau-carte-img"><span class="cau-carte-cadre"><img src="${esc(c.carte)}" alt="" draggable="false">${point}</span></div>` : (m ? CARTE_2026 : CARTE_1933);
    return `${carte}${FIL}
      <header class="cau-une"><i class="cau-pin"></i>${gm ? `<button type="button" class="cau-editer" data-cau="editer-une" title="Changer le titre du journal"><i class="fa-solid fa-pen"></i></button><button type="button" class="cau-editer cau-bouton-fil${EcranUne.modeFil ? " actif" : ""}" data-cau="mode-fil" title="Mise en place : déplacer les étiquettes et disposer le fil rouge"><i class="fa-solid fa-diagram-project"></i></button>` : ""}
        <div class="cau-filet"><span>${esc(m ? (c.lieu + (date ? " · " + date : "")).toUpperCase() : c.lieu)}</span><span>${esc(m ? c.edition.toUpperCase() : (date ? date + " · " : "") + c.edition)}</span></div>
        <h1>${esc(c.journal)}</h1><p>${esc(c.une)}</p>
        <div class="cau-filet bas"><span>${esc(m ? `BIENVENUE, ${nom.toUpperCase()}` : `Bienvenue, ${nom}`)}</span><span>${esc(m ? c.campagne.toUpperCase() : c.campagne)}</span></div></header>
      ${gm && EcranUne.editionUne ? EcranUne.#editionUne(era) : ""}
      ${centre}${gm && EcranUne.modeFil ? `<div class="cau-mode-fil"><span><b>Mise en place</b> · fais glisser une étiquette, le journal ou la carte pour les placer · fil rouge : clique une étiquette puis une autre pour les relier (la chaîne continue), clique un fil pour le couper · la grosse punaise centrale se déplace aussi</span>
        <span class="cau-actions"><button type="button" class="cau-bouton" data-cau="fil-etoile">Tout relier au centre</button><button type="button" class="cau-bouton" data-cau="fil-defaut">Fils d'origine</button><button type="button" class="cau-bouton" data-cau="fil-vider">Effacer les fils</button><button type="button" class="cau-bouton" data-cau="pos-defaut">Places d'origine</button><button type="button" class="cau-bouton principal" data-cau="fil-fin"><i class="fa-solid fa-check"></i> Terminer</button></span></div>` : ""}
      ${fiche}${carnet}${dramatis}${cartes}${wiki}${resume}${theme}${prepa}${entrer}${bureau}${outils}
      <p class="cau-aide"><span>Cet écran revient à chaque séance · ${m ? "bouton journal" : "bouton journal"} de la barre de gauche pour le rouvrir · Échap pour ${m ? "se connecter" : "embarquer"}</span></p>`;
  }

  /** Panneau du Gardien pour changer la une sur place. */
  static #editionUne(era) {
    const c = config()[era]; const cal = dateDuJour(era);
    const champ = (cle, label, aide = "") => `<label>${label}<input type="text" data-cau-une="${cle}" value="${esc(c[cle] ?? "")}"${aide ? ` placeholder="${esc(aide)}"` : ""}></label>`;
    return `<div class="cau-edition-une"><h3>La une ${era === "modern" ? "de 2026" : "de 1933"}</h3>
      <div class="cau-reglages">${champ("journal", "Nom du journal")}${champ("edition", "Édition")}</div>
      <div class="cau-reglages un">${champ("une", "Gros titre")}</div>
      <div class="cau-reglages">${champ("date", "Date (vide = celle du calendrier)", cal || "pas de calendrier")}${champ("lieu", "Lieu")}</div>
      <p class="cau-consigne">Les joueurs voient le changement tout de suite.</p>
      <div class="cau-actions"><button type="button" class="cau-bouton" data-cau="annuler-une">Annuler</button><button type="button" class="cau-bouton principal" data-cau="enregistrer-une"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button></div></div>`;
  }

  /* ---------------- Les pages ---------------- */

  static async #page(vue, era) {
    const m = era === "modern";
    const tete = (titre, sous) => `<header class="cau-p-tete"><button type="button" class="cau-retour" data-cau="une"><i class="fa-solid fa-arrow-left"></i> Retour à la une</button>
      <span class="cau-filet"><span>${esc(config()[era].journal)}</span><span>${m ? "Dossier" : "Supplément"}</span></span><h2>${titre}</h2>${sous ? `<p class="cau-sous">${sous}</p>` : ""}</header>`;
    if (vue === "wiki") return tete(m ? "Tout comprendre de l'affaire" : "Tout savoir sur l'expédition", "Le wiki, page après page") + await EcranUne.#wiki(era);
    if (vue === "bureau") return tete("Le bureau du Gardien", "Ton wiki et tes outils") + EcranUne.#outils() + await EcranUne.#wiki(era, "gardien");
    if (vue === "outils") return tete(m ? "La boîte à outils" : "La malle à outils", game.user.isGM ? "Les modules de la table, pour les joueurs et pour toi" : "Les modules que tu peux utiliser pendant la partie") + EcranUne.#modules();
    if (vue === "theme") return tete(m ? "Mon apparence" : "La mode de 1933", "Le thème habille ta fiche d'investigateur") + EcranUne.#themes(era);
    if (vue === "prepa") return tete("Préparer la partie", "Coche les compendiums à importer : chacun arrive dans son dossier") + EcranUne.#prepa();
    if (vue === "investigateurs") return tete("Les investigateurs", m ? "Les descendants, en 2025-2026" : "L'expédition de 1933") + EcranUne.#investigateurs(era);
    if (vue === "carnets") return tete("Les carnets de bord", config()[era].carnet) + EcranUne.#listeCarnets(era);
    if (vue === "reglages") return tete("Réglages de l'écran d'accueil", m ? "Époque 2025-2026" : "Époque 1933") + EcranUne.#reglages(era);
    return "";
  }

  static async #wiki(era, quel = "joueur") {
    const c = config()[era]; const gm = game.user.isGM;
    let docs;
    if (quel === "gardien") {
      const motif = sansAccent(c.wikiGardien);
      docs = motif ? game.journal.filter((j) => sansAccent(j.name).includes(motif)) : [];
    } else {
      const racine = game.folders.get(c.wiki);
      const dans = (f) => { while (f) { if (f.id === racine?.id) return true; f = f.folder; } return false; };
      docs = racine ? game.journal.filter((j) => dans(j.folder) && (gm || j.testUserPermission(game.user, "OBSERVER"))) : [];
    }
    docs.sort((a, b) => a.name.localeCompare(b.name, "fr"));
    if (!docs.length) return `<p class="cau-vide">${quel === "gardien" ? "Aucun journal ne correspond au wiki du Gardien (réglages)." : "Le wiki des joueurs est vide pour l'instant."}</p>`;
    const w = EcranUne.wiki;
    if (w.quel !== quel) { w.quel = quel; w.entree = null; w.page = null; }
    const entree = docs.find((d) => d.id === w.entree) ?? docs[0]; w.entree = entree.id;
    const pages = entree.pages.contents.filter((p) => gm || p.testUserPermission(game.user, "OBSERVER")).sort((a, b) => a.sort - b.sort);
    const page = pages.find((p) => p.id === w.page) ?? pages[0]; w.page = page?.id;
    let contenu = "";
    if (page?.type === "image") contenu = `<figure><img src="${esc(page.src)}" alt=""><figcaption>${esc(page.image?.caption ?? page.name)}</figcaption></figure>`;
    else if (page) contenu = await foundry.applications.ux.TextEditor.implementation.enrichHTML(page.text?.content ?? "", { relativeTo: page, secrets: gm });
    return `<div class="cau-wiki"><nav>${docs.map((d) => `<button type="button" data-cau="wiki-entree" data-id="${d.id}" class="${d.id === entree.id ? "on" : ""}">${esc(d.name)}</button>`).join("")}</nav>
      <div class="cau-wiki-texte">${pages.length > 1 ? `<div class="cau-puces">${pages.map((p) => `<button type="button" class="cau-puce ${p.id === page?.id ? "on" : ""}" data-cau="wiki-page" data-id="${p.id}">${esc(p.name)}</button>`).join("")}</div>` : ""}
      <div class="cau-article journal-entry-page text"><div class="journal-page-content">${contenu}</div></div>
      <button type="button" class="cau-lien" data-cau="wiki-fenetre" data-id="${entree.id}"><i class="fa-solid fa-up-right-from-square"></i> Ouvrir dans une fenêtre</button></div></div>`;
  }

  static #outils() {
    const o = [["outils", "fa-toolbox", "La boîte à outils (tous les modules)"], ["reglages", "fa-sliders", "Réglages de cet écran"]];
    return `<div class="cau-outils">${o.map(([a, i, t]) => `<button type="button" class="cau-bouton" data-cau="${a}"><i class="fa-solid ${i}"></i> ${t}</button>`).join("")}</div><h3>Le wiki du Gardien</h3>`;
  }

  static #modules() {
    const d = modulesDisponibles(); const gm = game.user.isGM;
    const oeil = (x) => gm && x.qui === "tous" ? `<button type="button" class="cau-oeil${x.pourJoueurs ? " vu" : ""}" data-cau="module-voir" data-i="${x.i}" title="${x.pourJoueurs ? "Visible par les joueurs : cliquer pour le cacher" : "Caché aux joueurs : cliquer pour le montrer"}"><i class="fa-solid ${x.pourJoueurs ? "fa-eye" : "fa-eye-slash"}"></i></button>` : "";
    const fin = (x) => x.joueurSeul ? `<small>Joueurs</small>` : x.action ? `<button type="button" class="cau-bouton" data-cau="module" data-i="${x.i}">Ouvrir</button>` : `<small>Automatique</small>`;
    const carte = (x) => `<div class="cau-module${x.action ? "" : " auto"}${gm && x.qui === "tous" && !x.pourJoueurs ? " cache" : ""}"><i class="fa-solid ${x.icone}"></i><span><b>${esc(x.nom)}</b><em>${esc(x.desc)}</em></span>${fin(x)}${oeil(x)}</div>`;
    const bloc = (titre, l) => l.length ? `<h3>${titre}</h3><div class="cau-modules">${l.map(carte).join("")}</div>` : "";
    const aide = gm ? `<p class="cau-sous">L'œil choisit ce que les joueurs voient dans leur boîte à outils (barré = caché aux joueurs).</p>` : "";
    return aide + (bloc(gm ? "Pour les joueurs (et toi)" : "À ouvrir", d.tous) + bloc("Pour le Gardien", d.gardien) + bloc("Ce qui marche tout seul", d.auto)
      || `<p class="cau-sous">Aucun module de la campagne n'est activé.</p>`);
  }

  static #themes(era) {
    const perso = game.user.isGM ? null : monPersonnage(era);
    const themes = game.modules.get(FICHES)?.api?.themes ?? {};
    if (!perso) return `<p class="cau-vide">${game.user.isGM ? "Chaque joueur choisit ici le thème de sa propre fiche. Les thèmes par époque se règlent dans les réglages du module Fiches thématiques." : "Aucun personnage pour cette époque."}</p>`;
    const actuel = perso.getFlag(FICHES, "theme") ?? "";
    const choix = [["", "Automatique (celui de l'époque)"], ...Object.entries(themes)];
    return `<div class="cau-themes">${choix.map(([k, l]) => `<button type="button" class="cau-theme ${k === actuel ? "on" : ""}" data-cau="choisir-theme" data-cle="${esc(k)}"><span class="cau-pastille t-${esc(k || "auto")}"></span>${esc(l)}</button>`).join("")}</div>
      <p class="cau-consigne">Le thème s'applique à la fiche de ${esc(perso.name)} dès qu'elle est ouverte.</p>`;
  }

  static #prepa() {
    const packs = game.packs.filter((p) => p.metadata.packageType !== "system" && CONST.FOLDER_DOCUMENT_TYPES.includes(p.documentName));
    const groupes = {};
    for (const p of packs) {
      const titre = p.metadata.packageType === "world" ? "Ce monde" : (game.modules.get(p.metadata.packageName)?.title ?? p.metadata.packageName);
      (groupes[titre] ??= []).push(p);
    }
    const deja = (p) => game.folders.some((f) => f.getFlag(ID, "pack") === p.collection);
    const html = Object.entries(groupes).sort(([a], [b]) => (a === "Ce monde" ? -1 : b === "Ce monde" ? 1 : a.localeCompare(b, "fr"))).map(([g, ps]) =>
      `<fieldset><legend>${esc(g)}</legend>${ps.map((p) => `<label><input type="checkbox" data-pack="${esc(p.collection)}"> ${esc(p.title)} <small>${esc(game.i18n.localize(`DOCUMENT.${p.documentName}s`) || p.documentName)} · ${p.index.size}</small>${deja(p) ? " <em>déjà dans le monde</em>" : ""}</label>`).join("")}</fieldset>`).join("");
    return `<div class="cau-prepa">${html || "<p class='cau-vide'>Aucun compendium à importer.</p>"}</div>
      <div class="cau-actions"><button type="button" class="cau-bouton principal" data-cau="importer"><i class="fa-solid fa-file-import"></i> Importer la sélection</button></div><p class="cau-message"></p>`;
  }

  static #investigateurs(era) {
    const ps = personnagesEpoque(era);
    if (!ps.length) return `<p class="cau-vide">Aucun personnage joueur pour cette époque.</p>`;
    return `<div class="cau-galerie">${ps.map((a) => { const s = stats(a); return `<button type="button" class="cau-vignette" data-cau="acteur" data-id="${a.id}"><img src="${esc(a.img)}" alt=""><b>${esc(a.name)}</b><code>PV ${s.pv} · SAN ${s.san} · CH ${s.chance}</code></button>`; }).join("")}</div>`;
  }

  static #listeCarnets(era) {
    const js = carnets(era);
    if (!js.length) return `<p class="cau-vide">Aucun carnet dont le nom commence par « ${esc(config()[era].carnet)} ».</p>`;
    return `<div class="cau-galerie">${js.map((j) => `<button type="button" class="cau-vignette carnet" data-cau="journal" data-id="${j.id}"><span class="cau-carnet petit"><span class="cau-etiquette">${esc((j.name.match(/\[(.*)\]/)?.[1]) ?? j.name)}</span></span><b>${esc(j.name)}</b><code>${j.pages.size} page(s)</code></button>`).join("")}</div>`;
  }

  static #reglages(era) {
    const c = config()[era];
    const scenes = [...game.scenes].sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const dossiers = game.folders.filter((f) => f.type === "JournalEntry").sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const opt = (liste, sel, nom = (x) => x.name) => `<option value="">—</option>` + liste.map((x) => `<option value="${x.id}" ${x.id === sel ? "selected" : ""}>${esc(nom(x))}</option>`).join("");
    const lieu = (s) => `${s.name}${s.folder ? ` (${s.folder.name})` : ""}`;
    const champ = (cle, label) => `<label>${label}<input type="text" data-cau-reglage="${cle}" value="${esc(c[cle])}"></label>`;
    return `<p class="cau-consigne">Ces réglages valent pour l'époque en cours (${era === "modern" ? "2025-2026" : "1933"}) ; change d'époque avec la Bascule pour régler l'autre.</p>
      <div class="cau-reglages">
        ${champ("journal", "Nom du journal")}${champ("une", "Gros titre")}${champ("date", "Date de la une (vide = celle du calendrier)")}${champ("lieu", "Lieu")}${champ("edition", "Édition")}${champ("campagne", "Campagne")}
        <label>Image de la carte de l'Antarctique (vide : carte dessinée)<span class="cau-fichier"><input type="text" data-cau-reglage="carte" value="${esc(c.carte)}"><button type="button" class="cau-bouton" data-cau="choisir-carte" aria-label="Choisir l'image"><i class="fa-solid fa-folder-open"></i></button></span></label>
        ${champ("pointX", "Point rouge sur la carte : position horizontale (%)")}${champ("pointY", "Point rouge : position verticale (%, vide = pas de point)")}${champ("coord", "Texte du point rouge (vide = latitude et longitude calculées)")}
        ${champ("carnet", "Les carnets de bord commencent par")}${champ("wikiGardien", "Wiki du Gardien : journaux dont le nom contient")}
        <label>Wiki des joueurs : dossier<select data-cau-reglage="wiki">${opt(dossiers, c.wiki)}</select></label>
        <label>Dramatis personae : scène<select data-cau-reglage="dramatis">${opt(scenes, c.dramatis, lieu)}</select></label>
      </div>
      <h3>Les cartes (onglets de la vision)</h3>
      <div class="cau-cartes-liste">${scenes.map((s) => `<label><input type="checkbox" data-cau-carte="${s.id}" ${c.cartes.includes(s.id) ? "checked" : ""}> ${esc(lieu(s))}</label>`).join("")}</div>
      <div class="cau-actions"><button type="button" class="cau-bouton" data-cau="deviner"><i class="fa-solid fa-wand-magic-sparkles"></i> Retrouver d'après les tuiles</button><button type="button" class="cau-bouton principal" data-cau="enregistrer"><i class="fa-solid fa-floppy-disk"></i> Enregistrer</button></div><p class="cau-message"></p>`;
  }

  /* ---------------- La vision (une scène dans un encadré) ---------------- */

  static ouvrirVision(titre, scenes) {
    const ids = scenes.filter((id) => game.scenes.get(id));
    if (!ids.length) return ui.notifications.warn("Aucune scène à montrer : vois les réglages de l'écran d'accueil.");
    EcranUne.vision = { titre, scenes: ids, i: 0 };
    EcranUne.afficher();
  }

  static fermerVision() { EcranUne.vision = null; EcranUne.afficher(); }

  static #vision(era) {
    const v = EcranUne.vision; const m = era === "modern";
    const s = game.scenes.get(v.scenes[v.i]); if (!s) return "";
    const onglets = v.scenes.length > 1 ? `<div class="cau-onglets">${v.scenes.map((id, i) => `<button type="button" data-cau="onglet" data-i="${i}" class="${i === v.i ? "on" : ""}">${esc(joliNom(game.scenes.get(id)?.navName || game.scenes.get(id)?.name))}</button>`).join("")}</div>` : "";
    return `<div class="cau-vision-voile" data-cau="fermer-vision"></div><div class="cau-vision">
      <div class="cau-vision-tete"><b>${esc(m ? v.titre.toUpperCase() : v.titre)}</b><span>${m ? "aperçu · sans changer de scène" : "vue sans quitter la salle"}</span></div>${onglets}
      <div class="cau-cadre">${EcranUne.#plateau(s)}</div>
      <div class="cau-vision-pied"><span>Molette : zoom · glisser : déplacer · double-clic : recentrer</span>
        ${game.user.isGM ? `<button type="button" class="cau-bouton" data-cau="amener" data-scene="${s.id}"><i class="fa-solid fa-people-arrows"></i> Amener les joueurs</button>` : ""}
        <button type="button" class="cau-bouton" data-cau="aller" data-scene="${s.id}">Aller sur la scène (pour moi seul)</button>
        <button type="button" class="cau-bouton principal" data-cau="fermer-vision">Fermer${m ? "" : " la vision"}</button></div></div>`;
  }

  /** La scène telle qu'elle est : fond + tuiles visibles aux mêmes places (en v14, x / y d'une tuile = son centre). */
  static #plateau(ps) {
    const d = ps.dimensions ?? {};
    const SW = d.sceneWidth || ps.width || 1920; const SH = d.sceneHeight || ps.height || 1080;
    const X0 = d.sceneX ?? 0; const Y0 = d.sceneY ?? 0;
    const pc = (v, t) => `${((v / t) * 100).toFixed(3)}%`;
    const media = (src, style = "") => /\.(webm|mp4|m4v|ogv)(\?|$)/i.test(src)
      ? `<video src="${esc(src)}" autoplay loop muted playsinline style="${style}"></video>` : `<img src="${esc(src)}" alt="" draggable="false" style="${style}">`;
    const tuiles = [...ps.tiles].filter((t) => !t.hidden && t.texture?.src).sort((a, b) => (a.elevation ?? 0) - (b.elevation ?? 0) || (a.sort ?? 0) - (b.sort ?? 0)).map((t) => {
      const gx = t.x - t.width * (t.texture?.anchorX ?? 0.5); const gy = t.y - t.height * (t.texture?.anchorY ?? 0.5);
      const style = `left:${pc(gx - X0, SW)};top:${pc(gy - Y0, SH)};width:${pc(t.width, SW)};height:${pc(t.height, SH)};${t.rotation ? `transform:rotate(${t.rotation}deg);` : ""}`;
      const im = media(t.texture.src, `opacity:${t.alpha ?? 1};`);
      const actions = (t.flags?.["monks-active-tiles"]?.actions ?? []).filter((a) => ["scene", "openactor", "openjournal"].includes(a.action));
      if (!actions.length || t.flags?.["monks-active-tiles"]?.active === false) return `<span class="cau-tuile" style="${style}" aria-hidden="true">${im}</span>`;
      const nom = joliNom(actions.map((a) => a.data?.sceneid?.name ?? a.data?.entity?.name).find(Boolean) ?? "Ouvrir");
      return `<button type="button" class="cau-tuile active" data-cau="tuile" data-scene="${ps.id}" data-tuile="${t.id}" style="${style}" aria-label="${esc(nom)}" data-tooltip="${esc(nom)}">${im}</button>`;
    }).join("");
    return `<div class="cau-plateau" data-w="${SW}" data-h="${SH}">${media(fondScene(ps))}${tuiles}</div>`;
  }

  static #zoom() {
    const cadre = EcranUne.el?.querySelector(".cau-cadre"); const pl = cadre?.querySelector(".cau-plateau");
    if (!pl) return;
    const r0 = { w: cadre.clientWidth, h: cadre.clientHeight };
    const k = Math.min(r0.w / Number(pl.dataset.w), r0.h / Number(pl.dataset.h)) || 0;
    pl.style.width = `${Math.round(Number(pl.dataset.w) * k)}px`; pl.style.height = `${Math.round(Number(pl.dataset.h) * k)}px`;
    const v = { s: 1, x: 0, y: 0 };
    const appliquer = () => { pl.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.s})`; cadre.classList.toggle("zoom", v.s > 1); };
    cadre.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const s = Math.min(6, Math.max(1, v.s * (ev.deltaY < 0 ? 1.2 : 1 / 1.2)));
      v.x *= s / v.s; v.y *= s / v.s; v.s = s; if (s === 1) { v.x = 0; v.y = 0; }
      appliquer();
    }, { passive: false });
    let prise = null;
    cadre.addEventListener("pointerdown", (ev) => { if (v.s <= 1 || ev.target.closest(".cau-tuile.active")) return; prise = { x: ev.clientX - v.x, y: ev.clientY - v.y }; cadre.setPointerCapture(ev.pointerId); });
    cadre.addEventListener("pointermove", (ev) => { if (prise) { v.x = ev.clientX - prise.x; v.y = ev.clientY - prise.y; appliquer(); } });
    cadre.addEventListener("pointerup", () => { prise = null; });
    cadre.addEventListener("dblclick", () => { v.s = 1; v.x = 0; v.y = 0; appliquer(); });
  }

  /* ---------------- Actions ---------------- */

  static async marquerVu(j) {
    if (!j) return;
    const vus = foundry.utils.deepClone(game.user.getFlag(ID, "vus") ?? {});
    vus[j.id] = j.pages.map((p) => p.id);
    await game.user.setFlag(ID, "vus", vus);
  }

  static #ouvrirActeur(a) {
    if (!a) return;
    if (a.testUserPermission(game.user, "LIMITED")) return a.sheet.render(true);
    return new foundry.applications.apps.ImagePopout({ src: a.img, window: { title: a.name } }).render(true);
  }

  static async #tuile(sceneId, tuileId) {
    const t = game.scenes.get(sceneId)?.tiles.get(tuileId);
    for (const a of t?.flags?.["monks-active-tiles"]?.actions ?? []) {
      const d = a.data ?? {};
      if (a.action === "scene") {
        const cible = idDe(d.sceneid); if (!game.scenes.get(cible)) continue;
        const v = EcranUne.vision; const i = v.scenes.indexOf(cible);
        if (i >= 0) v.i = i; else { v.scenes.push(cible); v.i = v.scenes.length - 1; }
        return EcranUne.afficher();
      }
      if (a.action === "openactor") EcranUne.#ouvrirActeur(game.actors.get(idDe(d.entity)));
      if (a.action === "openjournal") {
        const j = game.journal.get(idDe(d.entity));
        if (j?.testUserPermission(game.user, "LIMITED")) j.sheet.render(true, d.page ? { pageId: d.page } : {});
      }
    }
  }

  static async #clic(ev) {
    if (EcranUne.modeFil && game.user.isGM && !ev.target.closest(".cau-page, .cau-edition-une, .cau-editer, .cau-voile")) return EcranUne.#clicFil(ev);
    const b = ev.target.closest("[data-cau]"); if (!b) return;
    ev.preventDefault(); ev.stopPropagation();
    const a = b.dataset.cau; const era = epoque(); const c = config()[era];
    const api = (id) => game.modules.get(id)?.api;
    switch (a) {
      case "une": return EcranUne.afficher("une");
      case "entrer": return EcranUne.fermer();
      case "fiche": return EcranUne.#ouvrirActeur(monPersonnage(era));
      case "acteur": return EcranUne.#ouvrirActeur(game.actors.get(b.dataset.id));
      case "bascule": return ui.notifications.info("Le Gardien règle les personnages de chaque époque dans la Bascule d'époque.");
      case "carnet": { const j = game.journal.get(b.querySelector("[data-id]")?.dataset.id); if (!j) return; j.sheet.render(true); await EcranUne.marquerVu(j); return EcranUne.afficher(); }
      case "journal": return game.journal.get(b.dataset.id)?.sheet.render(true);
      case "dramatis": return EcranUne.ouvrirVision("Dramatis personae", [c.dramatis]);
      case "cartes": return EcranUne.ouvrirVision(era === "modern" ? "Cartes" : "Les cartes de l'expédition", c.cartes);
      case "onglet": EcranUne.vision.i = Number(b.dataset.i); return EcranUne.afficher();
      case "tuile": return EcranUne.#tuile(b.dataset.scene, b.dataset.tuile);
      case "fermer-vision": return EcranUne.fermerVision();
      case "aller": { const s = game.scenes.get(b.dataset.scene); EcranUne.fermer(); return s?.view(); }
      case "amener": {
        const id = b.dataset.scene; const joueurs = game.users.filter((u) => u.active && !u.isGM);
        for (const u of joueurs) game.socket.emit("pullToScene", id, u.id);
        ui.notifications.info(`${joueurs.length} joueur(s) amené(s) sur « ${game.scenes.get(id)?.name} ».`);
        EcranUne.fermer(); return game.scenes.get(id)?.view();
      }
      case "resume": { const t = outilResume(); return t?.onChange?.(); }
      case "module": return lancerModule(Number(b.dataset.i));
      case "mode-fil": EcranUne.modeFil = !EcranUne.modeFil; EcranUne.filChoix = null; EcranUne.editionUne = false; return EcranUne.afficher("une");
      case "editer-une": EcranUne.editionUne = !EcranUne.editionUne; return EcranUne.afficher();
      case "annuler-une": EcranUne.editionUne = false; return EcranUne.afficher();
      case "enregistrer-une": {
        if (!game.user.isGM) return;
        const all = config();
        for (const i of EcranUne.el.querySelectorAll("[data-cau-une]")) all[era][i.dataset.cauUne] = i.value.trim();
        EcranUne.editionUne = false;
        await game.settings.set(ID, "config", all);
        return EcranUne.afficher();
      }
      case "module-voir": {
        if (!game.user.isGM) return;
        const k = cleModule(MODULES[Number(b.dataset.i)]); const v = new Set(vusParJoueurs());
        v.has(k) ? v.delete(k) : v.add(k);
        await game.settings.set(ID, "outilsJoueurs", [...v]); return EcranUne.afficher();
      }
      case "wiki": case "theme": case "prepa": case "bureau": case "outils": case "investigateurs": case "carnets": case "reglages":
        if (a === "wiki") EcranUne.wiki.quel = "";
        return EcranUne.afficher(a);
      case "wiki-entree": EcranUne.wiki.entree = b.dataset.id; EcranUne.wiki.page = null; return EcranUne.afficher();
      case "wiki-page": EcranUne.wiki.page = b.dataset.id; return EcranUne.afficher();
      case "wiki-fenetre": return game.journal.get(b.dataset.id)?.sheet.render(true);
      case "choisir-theme": {
        const p = monPersonnage(era); if (!p) return;
        if (b.dataset.cle) await p.setFlag(FICHES, "theme", b.dataset.cle); else await p.unsetFlag(FICHES, "theme");
        return EcranUne.afficher();
      }
      case "importer": return EcranUne.#importer();
      case "choisir-carte": {
        const champ = EcranUne.el.querySelector('[data-cau-reglage="carte"]');
        const FP = foundry.applications.apps.FilePicker.implementation;
        return new FP({ type: "image", current: champ.value, callback: (chemin) => { champ.value = chemin; } }).render(true);
      }
      case "deviner": {
        const g = deviner(era); const all = config(); Object.assign(all[era], g);
        await game.settings.set(ID, "config", all); return EcranUne.afficher();
      }
      case "enregistrer": {
        const all = config(); const r = EcranUne.el;
        for (const i of r.querySelectorAll("[data-cau-reglage]")) all[era][i.dataset.cauReglage] = i.value;
        all[era].cartes = [...r.querySelectorAll("[data-cau-carte]")].filter((i) => i.checked).map((i) => i.dataset.cauCarte);
        await game.settings.set(ID, "config", all);
        ui.notifications.info("Écran d'accueil enregistré.");
        return EcranUne.afficher();
      }
    }
  }

  static #champ() { /* les réglages s'enregistrent avec le bouton */ }

  static async #importer() {
    const r = EcranUne.el; const msg = r.querySelector(".cau-message");
    const choix = [...r.querySelectorAll("[data-pack]")].filter((i) => i.checked).map((i) => game.packs.get(i.dataset.pack)).filter(Boolean);
    if (!choix.length) { msg.textContent = "Coche au moins un compendium."; return; }
    msg.textContent = "Import en cours…";
    let n = 0;
    for (const p of choix) {
      let f = game.folders.find((x) => x.getFlag(ID, "pack") === p.collection);
      f ??= await Folder.implementation.create({ name: p.title, type: p.documentName, flags: { [ID]: { pack: p.collection } } });
      const docs = await p.importAll({ folderId: f.id });
      n += docs?.length ?? 0;
    }
    ui.notifications.info(`${n} élément(s) importé(s), chacun dans le dossier de son compendium.`);
    return EcranUne.afficher();
  }
}

/* ================================================================== */
/*  Branchements                                                       */
/* ================================================================== */

Hooks.once("init", () => {
  game.settings.register(ID, "config", { scope: "world", config: false, type: Object, default: {}, onChange: () => { if (EcranUne.el && EcranUne.vue === "une" && !EcranUne.vision && !EcranUne.editionUne) EcranUne.afficher(); } });
  game.settings.register(ID, "ecranAccueil", {
    name: "Écran d'accueil à chaque session", hint: "L'écran « À la une » s'ouvre au lancement pour les joueurs et le Gardien. Il se rouvre à tout moment par le bouton journal de la barre de gauche.",
    scope: "world", config: true, type: Boolean, default: true
  });
  game.settings.register(ID, "outilsJoueurs", { scope: "world", config: false, type: Array, default: null });
  game.settings.register(ID, "taille", {
    name: "Taille des étiquettes de l'accueil", hint: "Réduit ou agrandit les coupures de presse et le titre de l'écran « À la une » (en %), pour ton écran seulement.",
    scope: "client", config: true, type: Number, range: { min: 50, max: 100, step: 5 }, default: 80,
    onChange: () => { if (EcranUne.el) EcranUne.afficher(); }
  });
  game.keybindings.register(ID, "basculer", { name: "Ouvrir / fermer l'écran « À la une »", editable: [{ key: "KeyU", modifiers: ["Alt"] }], onDown: () => { EcranUne.basculer(); return true; } });
});

Hooks.once("ready", async () => {
  if (game.user === game.users.activeGM) {
    const c = game.settings.get(ID, "config") ?? {};
    if (!c["1933"] && !c.modern) {
      try { await game.settings.set(ID, "config", { "1933": { ...DEFAUTS["1933"], ...deviner("1933") }, modern: { ...DEFAUTS.modern, ...deviner("modern") } }); } catch (err) { console.error(`${ID} | premier réglage`, err); }
    }
  }
  // Le journal de 2026 s'appelle désormais « The Times » (ancien nom enregistré : « The Arkham Times »)
  if (game.user === game.users.activeGM) {
    const c = foundry.utils.deepClone(game.settings.get(ID, "config") ?? {}); let maj = false;
    if (c["1933"]?.pointX === "63.4" && c["1933"]?.pointY === "64.8") { c["1933"].pointX = "63.44"; c["1933"].pointY = "64.36"; maj = true; }
    if ((c.modern?.pointX === "55" && c.modern?.pointY === "74.7") || (c.modern?.pointX === "54.77" && c.modern?.pointY === "73.19")) { c.modern.pointX = "54.76"; c.modern.pointY = "73.19"; maj = true; }
    if (c.modern?.journal === "The Arkham Times") { c.modern.journal = "The Times"; maj = true; }
    if (maj) await game.settings.set(ID, "config", c);
  }
  const mod = game.modules.get(ID);
  if (mod) mod.api = { ouvrir: (vue) => EcranUne.ouvrir(vue), fermer: () => EcranUne.fermer(), basculer: () => EcranUne.basculer(), vision: (titre, scenes) => { EcranUne.ouvrir(); EcranUne.ouvrirVision(titre, scenes); } };
  if (game.settings.get(ID, "ecranAccueil")) EcranUne.ouvrir();
});

Hooks.on("getSceneControlButtons", (controls) => {
  const outils = controls?.tokens?.tools; if (!outils) return;
  outils["cau-accueil"] = { name: "cau-accueil", title: "À la une (écran d'accueil)", icon: "fa-solid fa-newspaper", order: 86, toggle: true, visible: true, active: !!EcranUne.el, onChange: (event, on) => (on ? EcranUne.ouvrir() : EcranUne.fermer()) };
});

window.addEventListener("resize", foundry.utils.debounce(() => { if (EcranUne.el) EcranUne.vision ? EcranUne.afficher() : EcranUne.echelle(); }, 200));
Hooks.on("updateSetting", (s) => { if (EcranUne.el && [`${BASCULE}.currentEra`, `${BASCULE}.characters`, `${ID}.config`].includes(s.key)) EcranUne.afficher(); });
for (const h of ["updateActor", "createJournalEntryPage", "deleteJournalEntryPage", "calendrierEpoques.dateChanged"]) Hooks.on(h, () => { if (EcranUne.el && EcranUne.vue === "une" && !EcranUne.vision && !EcranUne.editionUne) EcranUne.afficher(); });
