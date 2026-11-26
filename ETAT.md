# État — coc7-accueil-une

## v0.1.0 (22/11/2026)
- Consigne de Stéphane (écran d'accueil sur le modèle des Miaulements d'Ulthar), adaptée à CoC7 et au monde Montagnes Hallucinées. Module **séparé** de `coc7-ecran-accueil` (navigation des pages d'accueil) pour comparer les deux.
- Style A retenu, décliné pour les deux époques ; fond transparent (seuls la une, la carte, le fil rouge et les coupures restent). Pas de création de personnage (les personnages existent).
- Pages dans l'écran : investigateurs (Gardien), carnets (Gardien), wiki des joueurs / du Gardien, thème de la fiche (drapeau `coc7-fiches-thematiques.theme` sur le personnage), préparer la partie (`importAll` dans un dossier marqué du drapeau `coc7-accueil-une.pack`), bureau (outils des modules actifs), réglages (par époque : textes de la une, préfixe des carnets, dossier du wiki joueurs, motif du wiki Gardien, scène Dramatis personae, scènes des cartes).
- Premier lancement (Gardien) : Dramatis personae et cartes retrouvés d'après les tuiles Monk's Active Tiles des pages d'accueil de la Bascule ; wiki des joueurs = dossier « LES REGLES DE JEUX » ; wiki du Gardien = journaux contenant « Guide du module ».
- Pages nouvelles des carnets : drapeau utilisateur `coc7-accueil-une.vus` (la première fois, tout est marqué vu).
- Visions : fond + tuiles (x / y d'une tuile v14 = centre), zoom, onglets, tuiles « scene / openactor / openjournal » cliquables, « aller sur la scène (pour moi seul) », « amener les joueurs » (Gardien).
- Calque à z-index 70 : au-dessus de l'interface, sous les fenêtres (les fiches et journaux s'ouvrent par-dessus).
- Tests FoundyTest : `s-accueil-une.mjs` — gardien (15), gardien2 (10), joueur (7) : tout OK (lisibilité de la carte SVG contrôlée sur capture).
- Non fait : dépôt GitHub (à créer par Stéphane) ; fiche atelier-foundry et 09-suivi (dépôt non accessible depuis cette session).

## v0.1.1 (22/11/2026)
- Cartes de l'Antarctique fournies par Stéphane : `assets/antarctique-1933.webp` (National Geographic, *The Antarctic Regions*) et `assets/antarctique-2026.webp` (carte physique, © club-des-voyages.com : usage privé à la table uniquement, ne pas publier).
- Nouveau réglage par époque « Image de la carte de l'Antarctique » (sélecteur de fichiers de Foundry) ; vide = carte dessinée en SVG. Cadre papier en 1933, bord blanc en 2026, même inclinaison.
- Le point rouge 76°15′S 168°42′E n'est pas reporté sur les images.

## v0.1.2 (22/11/2026)
- Le journal de 2026 s'appelle « The Times » (demande de Stéphane ; ancien nom enregistré remplacé automatiquement au lancement).
- Point rouge 76°15′S 168°42′E remis sur les images (réglages « Point rouge » en %), par époque : île Franklin sur la carte National Geographic 1933 (63,4 % / 64,8 %), mer de Ross ouest sur la carte 2026 (55 % / 74,7 %, calculé sur la projection polaire).
- Coupure « wiki » descendue pour ne plus cacher les coordonnées.

## v0.1.3 (23/11/2026)
- Étiquettes plus petites (demande de Stéphane, pour les petits écrans) : les coupures et la une sont réduites à 80 % (propriété CSS `scale`, ancrée en haut au centre pour que les punaises restent sur le fil rouge).
- Nouveau réglage **client** « Taille des étiquettes de l'accueil » (50 à 100 %, pas de 5) : chaque joueur règle la taille pour son écran.

## v0.1.4 (23/11/2026)
- **Boîte à outils** (demande de Stéphane) : nouvelle étiquette sur la une (« La malle à outils » en 1933, « La boîte à outils » en 2026) qui ouvre une page listant les modules CoC7 activés dans le monde, avec un bouton « Ouvrir » pour chacun. Trois sections : pour les joueurs (et le Gardien), pour le Gardien (cachée aux joueurs), et ce qui marche tout seul (sans bouton, juste expliqué).
- Le catalogue (`MODULES` dans main.js) passe par le bouton de la barre de gauche du module (sa visibilité décide si le joueur le voit), un raccourci clavier, un compendium ou une fonction. Pour un joueur, « Ma fiche en ligne » ouvre sa fiche sur le site (Fiches en ligne). Les éléments affichés sur la scène (HUD, jauge, barres, carrousel, calendrier, Critiques) ferment d'abord l'accueil.
- Le bureau du Gardien renvoie vers la boîte à outils au lieu de répéter sa propre liste d'outils.
- Tests FoundyTest `s-outils.mjs` : Gardien (19 boutons) et joueur (13 boutons), tous ouverts sans erreur ; lisibilité et mise en page OK.

## v0.1.5 (23/11/2026)
- Boîte à outils des joueurs allégée (demande de Stéphane) : par défaut, les joueurs ne voient que l'essentiel (messages secrets, résumés, calendrier, ma fiche en ligne, thème de la fiche, Combat Cthulhu HUD, conteneurs).
- Côté Gardien, un œil sur chaque module de la partie joueurs le montre ou le cache aux joueurs (réglage monde `outilsJoueurs`, liste des clés `id:action`) ; les modules cachés aux joueurs sont estompés dans la page du Gardien.
- Tests `s-outils.mjs` : Gardien 8 ✅, joueur 7 ✅.

## v0.1.6 (23/11/2026)
- Fil rouge recalculé (demande de Stéphane) : il n'est plus dessiné à des coordonnées fixes. Après chaque affichage, un fil part de la punaise de **chaque** étiquette (et de la une) et rejoint le point rouge 76°15′S 168°42′E de la carte (centre de la carte s'il n'y a pas de point). Il suit donc le réglage « Taille des étiquettes ». Recalcul aussi au chargement de l'image de la carte. Le fil pend légèrement (courbe) et a une ombre ; dessin fixe, aucune animation.
- Test `s-fil.mjs` : 1933 et 2026, à 80 % et 55 % : 12 fils pour 12 punaises, écart < 1 px.

## v0.1.7 (23/11/2026)
- **Changer la une sur place** (Gardien) : crayon à droite du titre du journal → panneau avec nom du journal, édition, gros titre, date et lieu, pour l'époque en cours. Les joueurs voient le changement aussitôt (réglage `config` avec onChange). Les mêmes champs restent dans la page Réglages.
- **Date de la une** : celle du calendrier des deux époques (`calendrier-epoques` api.getDate) ; la une se redessine au crochet `calendrierEpoques.dateChanged`. Un champ « Date » permet de mettre une date libre (vide = calendrier).
- **Point rouge déplaçable** (Gardien, glisser à la souris) ; la position est enregistrée au lâcher, le fil rouge suit. Latitude / longitude calculées d'après la projection de chaque carte fournie (`PROJECTIONS` : 1933 azimutale équidistante relevée sur le cadre du National Geographic ; 2026 ajustée sur le cercle polaire, le massif Vinson et le dôme Argus, précision ≈ 1°). Champ « Texte du point rouge » pour écrire autre chose (vide = calculé) ; pour une autre image de carte, sans projection connue, le texte par défaut reste 76°15′S 168°42′E. Positions par défaut recalculées pour afficher exactement 76°15′S 168°42′E (anciennes valeurs migrées).
- Punaise du carnet de bord (et du badge 2026) au-dessus du dessin (z-index).
- Tests `s-une-titre.mjs` (ERA=1933 / ERA=modern) : 9 ✅ par époque, lisibilité et mise en page du panneau OK.

## v0.1.8 (23/11/2026)
- Précision de Stéphane : le point rouge sert à montrer où sont les joueurs ; il ne doit pas être relié au fil. Le point reste déplaçable par le Gardien (coordonnées recalculées), sans fil.
- Moins de fil rouge : seulement 4 fils entre étiquettes (`LIENS` : fiche / investigateurs → cartes, cartes → Dramatis personae, Dramatis personae → dernière séance, wiki → thème de la fiche), de punaise à punaise ; les autres étiquettes restent épinglées seules.
- Tests : `s-fil.mjs` (4 fils, aucun vers le point, 1933 / 2026, 80 % / 55 %) et `s-une-titre.mjs` (1933) OK.

## v0.1.9 (23/11/2026)
- Fil rouge en deux chaînes (choix de Stéphane), dans les deux époques (`CHAINES`) :
  1. le journal (The Arkham Advertiser / The Times) → investigateurs (ou ma fiche) → cartes → Dramatis personae (télégramme / personnes d'intérêt) → carnet(s) de bord ;
  2. thème de la fiche (La mode de 1933 / Mon apparence) → boîte à outils → bureau du Gardien → wiki (Tout savoir / Tout comprendre) → préparer la partie.
  Une étiquette absente (bureau et préparer la partie chez un joueur) est sautée : la chaîne passe à la suivante.
- Seconde punaise sur le journal, au bord bas gauche, pour y accrocher le fil (la punaise du haut est cachée par le papier).
- Test `s-fil.mjs` : 8 fils, accrochés aux punaises, aucun vers le point rouge (1933 / 2026, 80 % / 55 %).

## v0.2.0 (23/11/2026)
- **Le Gardien dispose lui-même le fil rouge** (demande de Stéphane) : bouton « fil » (sous le crayon, à droite du journal) → mode fil rouge avec un bandeau. Clic sur une punaise ou une étiquette puis sur une autre = un fil (la chaîne continue depuis la dernière ; refaire le même lien le défait) ; clic sur un fil = le couper ; une **punaise centrale** se fait glisser où l'on veut et sert de point de départ ; boutons « Tout relier au centre », « Fils d'origine », « Tout effacer », « Terminer » (ou Échap). En mode fil, les étiquettes n'ouvrent pas leur page.
- Enregistré par époque dans le réglage `config` (`fils` : paires de clés, `centre` : position en px de l'écran 1600 × 1000) ; les joueurs voient le résultat aussitôt. Clés identiques Gardien / joueur (`perso` = fiche ou investigateurs, `carnet` = carnet ou carnets) ; un fil vers une étiquette absente chez un joueur n'est pas dessiné.
- Plus de punaise esseulée en bas à gauche du journal : le fil du journal part de sa punaise du haut.
- Test `s-fil-gardien.mjs` (ERA=1933 / modern) : 10 ✅ par époque.

## v0.2.1 (23/11/2026)
- **Mise en place** (demande de Stéphane) : dans le même mode que le fil rouge (bouton sous le crayon), le Gardien fait glisser les étiquettes, le journal et la carte où il veut ; un simple clic (sans mouvement) sert toujours au fil rouge, et le fil suit les étiquettes déplacées. Bouton « Places d'origine ». Hors de ce mode, rien ne bouge.
- Positions enregistrées par époque dans `config` (`positions` : { clé: {x, y} } en px de l'écran 1600 × 1000 ; clés communes Gardien / joueurs), appliquées après chaque affichage, chez tout le monde.
- Test `s-disposer.mjs` (ERA=1933 / modern) : 7 ✅ par époque.

## v0.4.0 (25/11/2026)
- **Disposer mon écran** (demande de Stéphane, sur le modèle de l'accueil D&D) : bouton à flèches en croix à droite du journal, pour **chaque joueur** (et le Gardien, sous le bouton de mise en place). On fait glisser les étiquettes, le journal et la carte où l'on veut ; cela ne change que son propre écran. Boutons « Revenir aux places d'origine » et « Terminer » (ou Échap).
- Réglage client `dispo` (par époque, positions en px de l'écran 1600 × 1000). Mes places passent avant celles que le Gardien a données à tous (« Mise en place », réglage monde `config.positions`), qui restent les places par défaut des joueurs. Le fil rouge suit.
- En mode « disposer », les étiquettes n'ouvrent pas leur page.
- Non testé dans FoundyTest (dossier non connecté à cette session) : à tester à la main (`node --check` OK).

## v0.4.1 (26/11/2026)
- Réglages, « Les cartes (onglets de la vision) » : la liste des scènes était écrasée (14 px de haut, réduite à une barre de défilement horizontale) — la page la comprimait et les colonnes de type journal (`columns: 2`) débordaient sur le côté. Désormais grille à deux colonnes de 300 px de haut qui défile vers le bas, scènes cochées en tête, compteur de scènes cochées et champ « Chercher une scène… ».
- Test FoundyTest `s-reglages-cartes.mjs` (ERA=1933 / modern) : 5 ✅ par époque (grille sans défilement horizontal, cochées en tête, filtre, lisibilité, mise en page).

## v0.4.2 (26/11/2026)
- **Notes de carte (épinglettes) dans la vision** (demande de Stéphane : les hôtels de New York épinglés sur la « Carte générale » n'apparaissaient que sur la scène). La vision dessine maintenant les notes de la scène par-dessus le fond et les tuiles : icône et teinte de la note (icônes SVG teintées par masque CSS, chemin absolu via `foundry.utils.getRoute`), taille d'après `iconSize` (20 px minimum à l'écran), nom au survol. Mêmes règles que sur la scène : le Gardien les voit toutes ; un joueur seulement celles dont le journal (ou la page) lui est au moins partiellement visible. Clic : ouvre le journal à la bonne page si on peut le lire.
- Test FoundyTest `s-vision-notes.mjs` : Gardien (2 notes visibles, clic ouvre le journal) et joueur (seulement la note autorisée) : OK.
