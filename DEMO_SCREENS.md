# BIOVOLAILLES — Manifeste des écrans de démonstration

Document interne, généré depuis le serveur de production local.

> **Ce ne sont pas des captures d'écran.** L'environnement de génération n'a pas de
> navigateur, et fabriquer des images aurait été trompeur. Chaque bloc ci-dessous liste ce
> que la page **rend réellement** — titres, badges, valeurs — extrait du HTML servi. Le
> présentateur s'en sert pour confirmer que l'écran devant lui est le bon. Une passe
> humaine avec captures reste à faire si un support visuel est nécessaire.

Rôle indiqué = compte utilisé pour obtenir cet écran.

---

## Tableau de bord

- **Chemin** : `/dashboard`
- **Rôle** : FARM_MANAGER
- **À quoi ça sert** : Le poste de pilotage. Périmètre en haut, cartes d'état, sections par priorité de rôle.
- **Titre affiché (H1)** : Tableau de bord opérationnel
- **Sections** : Alertes actives · Performance — alimentation · Tendances de performance · Vue IoT · À surveiller · Qualité des données · Activité récente
- **Badges visibles** : DÉMO, En ligne, Simulation
- **Repères chiffrés** : 12000, BAT-01, BU-2026-001, DEV-B01-001

## Ferme

- **Chemin** : `/fermes/<ferme>`
- **Rôle** : FARM_MANAGER
- **À quoi ça sert** : Ferme Al Baraka, Kénitra — 2 bâtiments.
- **Titre affiché (H1)** : Ferme Al Baraka
- **Sections** : Bâtiments
- **Badges visibles** : DÉMO
- **Repères chiffrés** : 12 000, BAT-01

## Bâtiment

- **Chemin** : `/fermes/<ferme>/batiments/<bâtiment>`
- **Rôle** : FARM_MANAGER
- **À quoi ça sert** : BAT-01, son état environnemental et le lot qu'il héberge.
- **Titre affiché (H1)** : BAT-01 — Bâtiment 1
- **Sections** : Lots hébergés · IoT — Environnement du bâtiment
- **Badges visibles** : Clôturé, DÉMO, En ligne, Simulation
- **Repères chiffrés** : 11 920, 12 000, BAT-01, BU-2026-001, DEV-B01-001

## IoT — appareil

- **Chemin** : `/iot/<appareil>`
- **Rôle** : FARM_MANAGER
- **À quoi ça sert** : DEV-B01-001, 5 capteurs, lecture en direct + historique + provenance.
- **Titre affiché (H1)** : DEV-B01-001
- **Sections** : Température · Humidité · CO₂ · Luminosité · Poids
- **Badges visibles** : DÉMO, En ligne, Simulation
- **Repères chiffrés** : BAT-01, BU-2026-001, DEV-B01-001

## Lot — vue d'ensemble

- **Chemin** : `/lots/<lot>`
- **Rôle** : FARM_MANAGER
- **À quoi ça sert** : BU-2026-001 : identité, population, statut de données, onglets.
- **Titre affiché (H1)** : BU-2026-001
- **Sections** : Identité · Planification
- **Badges visibles** : Clôturé, DÉMO, Simulation
- **Repères chiffrés** : 11 920, 12 000, BAT-01, BU-2026-001

## Lot — traçabilité

- **Chemin** : `/lots/<lot>/tracabilite`
- **Rôle** : FARM_MANAGER
- **À quoi ça sert** : Chaîne complète amont → lot → aval, chronologie et contrôles.
- **Titre affiché (H1)** : Traçabilité — BU-2026-001
- **Sections** : Origine · État de vérification · Chaîne de lignage · Détail des maillons · Collecte COL-2026-001 · Chronologie · Abattage AB-2026-001 · Transformation TR-2026-001
- **Badges visibles** : Clôturé, DÉMO, Simulation
- **Repères chiffrés** : 11 920, 12 000, 12000, 13708, 8636, 9596, BAT-01, BU-2026-001, BVU-PROD-2026-001

## Alerte — détail

- **Chemin** : `/alertes/<alerte>`
- **Rôle** : FARM_MANAGER
- **À quoi ça sert** : Sévérité, valeurs observée/référence/écart, explication en 8 points, prise en compte.
- **Titre affiché (H1)** : Déviation d'alimentation
- **Sections** : Explication · Valeurs · Preuve KPI associée · Traiter cette alerte · Historique des actions
- **Badges visibles** : Avertissement, Calculé, DÉMO, Ouverte
- **Repères chiffrés** : 14 844, 14844, BAT-01, BU-2026-001

## Anomalies

- **Chemin** : `/anomalies`
- **Rôle** : FARM_MANAGER
- **À quoi ça sert** : Liste des anomalies détectées dans le périmètre.
- **Titre affiché (H1)** : Anomalies
- **Badges visibles** : Avertissement, Critique, DÉMO
- **Repères chiffrés** : BAT-01, BU-2026-001

## Audit

- **Chemin** : `/audit`
- **Rôle** : AUDITOR
- **À quoi ça sert** : Journal des mutations : acteur, avant/après, motif.
- **Titre affiché (H1)** : Journal d'audit
- **Badges visibles** : DÉMO
- **Repères chiffrés** : 13708, 8636, 9596, BU-2026-001, BVU-PROD-2026-001

## Intégrité

- **Chemin** : `/integrite`
- **Rôle** : AUDITOR
- **À quoi ça sert** : Contrôles automatiques de cohérence sur toute la base.
- **Titre affiché (H1)** : Centre d'intégrité
- **Sections** : Problèmes détectés
- **Badges visibles** : Avertissement, DÉMO
- **Repères chiffrés** : DEV-B01-001

## Commandes présentateur

- **Chemin** : `/administration/demo`
- **Rôle** : SUPER_ADMIN
- **À quoi ça sert** : État du système, parcours, rejeu d'anomalie, réinitialisation.
- **Titre affiché (H1)** : État du système / démonstration
- **Sections** : Chaîne de bout en bout · Parcours de démonstration · Rejouer le scénario d'anomalie · Réinitialiser la démonstration
- **Badges visibles** : DÉMO
- **Repères chiffrés** : 11 920, BAT-01, BU-2026-001

## Passeport public (QR)

- **Chemin** : `/tracabilite/<jeton>`
- **Rôle** : aucun (public)
- **À quoi ça sert** : Ce que voit le consommateur après un scan. Aucun identifiant interne.
- **Titre affiché (H1)** : Poulet découpé — Ross 308
- **Sections** : Informations produit · Parcours · Étapes de traçabilité
- **Repères chiffrés** : BU-2026-001, BVU-PROD-2026-001

---

Généré par un parcours réel du serveur ; régénérer après tout changement de jeu de données.
