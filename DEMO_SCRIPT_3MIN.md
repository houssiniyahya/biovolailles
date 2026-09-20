# BIOVOLAILLES — Script de démonstration · 3 minutes (repli)

À utiliser quand le temps est réduit. **Six étapes, ~30 s chacune.** On sacrifie la ferme, le
bâtiment, la prise en compte de l'alerte et les rôles — **jamais** l'anomalie ni le QR.

**Préparation** : identique à la version 5 minutes (`DEMO_RUNBOOK.md` §0).
**Compte** : Responsable coopérative suffit — aucune action n'est effectuée dans cette version.

---

| # | MONTRER | DIRE | MESSAGE CLÉ |
|---|---|---|---|
| **1** | **Tableau de bord** (badge DÉMO visible) | « Le poste de pilotage d'une production avicole. Données simulées, et le produit le dit lui-même. » | Un système, étiqueté honnêtement |
| **2** | **Lot BU-2026-001** | « L'objet central : 12 000 sujets à la mise en place, 11 920 aujourd'hui. Données, capteurs, indicateurs, historique, traçabilité — tout pend à ce lot. » | Le lot est le pivot |
| **3** | **IoT → DEV-B01-001** | « Cinq capteurs. Le badge dit *Simulation* : nous n'avons pas de matériel déployé. Ce qui est construit, c'est le chemin complet de la mesure jusqu'à l'alerte. » | IoT simulé, chaîne réelle |
| **4** | **Alerte critique** — valeurs + explication | « Aliment à +25,3 % au-dessus de la référence, croissance en retrait de 32,8 %. Le système explique pourquoi, avec les valeurs. Ce sont des règles explicites, pas une boîte noire. » | Explicable, pas « IA » |
| **5** | **Traçabilité complète** | « Du lot au produit : 13 708 kg collectés, 9 596 kg de carcasses, 8 636 kg de produit. Le graphe est calculé depuis les relations en base, pas codé en dur. » | Traçabilité calculée |
| **6** | **Passeport public QR** *(faire scanner la salle)* | « Voici ce que voit le consommateur. Et voici ce qu'il ne voit pas : aucun identifiant interne, aucun coût, aucune alerte. Une seule fonction décide de ce qui est public. » | Séparation structurelle |

---

## Phrase de clôture (obligatoire, 10 s)

> « L'architecture, la base, les règles et les workflows sont réels et testés. Les données et
> les capteurs sont simulés, et étiquetés partout. Ce que le MVP prouve, c'est que la chaîne
> complète tient dans un seul système. »

## À sauter explicitement

Ferme · bâtiment · prise en compte de l'alerte · événements · rôles · audit · intégrité ·
provenance détaillée.

Si on vous demande l'un de ces points, répondez « je peux vous le montrer tout de suite » et
ouvrez-le — mais seulement sur demande.
