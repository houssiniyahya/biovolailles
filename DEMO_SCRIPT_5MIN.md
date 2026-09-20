# BIOVOLAILLES — Script de démonstration · 5 minutes (version principale)

**Avant d'entrer en salle** : voir `DEMO_RUNBOOK.md` §0. En particulier `DEMO_MODE="true"` dans
`.env.local`, et `/administration/demo` doit afficher **13/13 « Conforme »**.

**Compte** : voir `DEMO_RUNBOOK.md` §1. Ouvrir en **Responsable coopérative** (recommandé —
son tableau de bord montre une exploitation vivante) puis passer en **Responsable ferme** à
l'étape 10. Voir `DEMO_RUNBOOK.md` §2 pour le choix.

**Règle d'or** : ne jamais taper d'URL. Les identifiants changent à chaque réamorçage, les
chemins de clics non.

**Budget** : ~20 s par étape. Si vous dépassez, sautez les étapes 3 et 4 — pas les autres.

---

| # | MONTRER | DIRE | MESSAGE CLÉ |
|---|---|---|---|
| **1** | Écran de connexion, puis **Tableau de bord** | « Voici le poste de pilotage. En haut, le périmètre de l'utilisateur. Tout ce que je vais montrer vient de la base — rien n'est en dur. » | C'est un système, pas une maquette |
| **2** | Badge **DÉMO** en haut à gauche | « Cet environnement est étiqueté comme démonstration. Les données sont simulées, et le produit le dit lui-même. » | Honnêteté par construction |
| **3** | **Fermes → Ferme Al Baraka** | « L'exploitation physique : une ferme à Kénitra, deux bâtiments. » | Le réel avant le numérique |
| **4** | **BAT-01** | « Le bâtiment, son état environnemental, et le lot qu'il héberge. » | La hiérarchie est le modèle |
| **5** | **IoT → DEV-B01-001** | « Cinq capteurs : température, humidité, CO₂, luminosité, poids. Regardez le badge : *Simulation*. Nous ne prétendons pas avoir du matériel déployé. Ce qui est construit, c'est le chemin de la mesure jusqu'à l'alerte. » | IoT simulé, chaîne réelle |
| **6** | **Lot BU-2026-001** — en-tête | « Voici l'objet central. 12 000 sujets à la mise en place, 11 920 aujourd'hui. Tout va s'accrocher à lui. » | Le lot est le pivot |
| **7** | Onglet **Performance** | « La donnée devient indicateur. Cinq KPI se calculent. Le sixième, l'indice de consommation, affiche *donnée insuffisante* — le système préfère dire qu'il ne sait pas plutôt qu'afficher un chiffre non fondé. » | Le système sait ce qu'il ignore |
| **8** | Onglet **Alertes** → ouvrir l'alerte critique | « Observée : 14 844 kg. Référence : 11 844,7. Écart : +25,3 %. Et la croissance est en retrait de 32,8 %. » | Des valeurs, pas une impression |
| **9** | Même page, bloc **Explication** | « Le système explique *pourquoi* : quoi, où, quand, ce qui a changé, comparé à quoi, de combien, sur quelles données, et pourquoi la règle s'est déclenchée. Les deux conditions réunies font passer l'alerte en critique — le seuil est dans le code. Ce n'est pas une boîte noire. » | **Explicable, pas « IA »** |
| **10** | *(basculer en Responsable ferme)* → **Prendre en compte** + commentaire | « C'est le responsable de la ferme qui décide. L'alerte devient une action humaine, datée et signée. » | La boucle se ferme sur un humain |
| **11** | Onglet **Événements** | « Et cette action est entrée dans l'histoire du lot. » | Rien ne se perd |
| **12** | Onglet **Traçabilité → Voir la traçabilité complète** | « Amont, lot, aval — reconstitué depuis les relations réelles en base. 13 708 kg collectés, 9 596 kg de carcasses à 70 % de rendement, 8 636 kg de produit à 90 %. Bilan matière exact. » | Traçabilité calculée, pas déclarée |
| **13** | Cliquer le nœud **Produit** | « Le lot est devenu `BVU-PROD-2026-001`. » | Du vivant au produit |
| **14** | Onglet **QR / Passeport** → ouvrir le lien public *(ou faire scanner la salle)* | « Voici ce que voit le consommateur en scannant. » | Le public touche le produit |
| **15** | Rester sur la page publique | « Et voici ce qu'il **ne voit pas** : aucun identifiant interne, aucun coût, aucune mesure IoT, aucune alerte. Une seule fonction dans tout le code décide de ce qui est public. » | Séparation structurelle |
| **16** | Pointer « Traçabilité non vérifiée » | « La page dit *non vérifiée*, parce que les données sont simulées. Le statut public reflète l'état réel du système — il n'est pas décoratif. » | Le produit ne se ment pas à lui-même |

---

## Points de pause

Deux, et deux seulement :

- **Après l'étape 9** (l'explication de l'alerte) — laisser 3 secondes de silence. C'est là que
  le jury comprend que ce n'est pas un tableau de bord décoratif.
- **Après l'étape 15** (ce que le public ne voit pas) — c'est l'argument de confiance.

## À ne pas faire pendant ces 5 minutes

- Ouvrir l'audit ou l'intégrité (réservés à la version 10 minutes).
- Expliquer l'architecture technique, Drizzle, les dépôts — sauf question.
- Prononcer « intelligence artificielle » ou « machine learning ».
- Détailler les seuils du moteur de règles. Dire « règles explicites et versionnées ».

## Si ça dérape

Ne pas déboguer devant le jury. Revenir au tableau de bord, reprendre le récit, réinitialiser
à la pause. Table de récupération complète : `DEMO_RUNBOOK.md` §10.
