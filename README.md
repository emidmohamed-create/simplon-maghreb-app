# Simplon Maghreb — Application de Gestion des Formations

Application métier complète pour gérer les campus, projets de formation, cohortes, candidats, apprenants, suivi pédagogique, présence/absence, insertion professionnelle et planification de projets.

## 🚀 Démarrage rapide

```bash
# Installer les dépendances
npm install

# Initialiser la base de données + générer le client Prisma
npx prisma db push
npx prisma generate

# Charger les données de démonstration
npx tsx prisma/seed.ts

# Démarrer le serveur de développement
npm run dev
```

Ouvrir **http://localhost:3000**

### Compte de démonstration
| Email | Mot de passe | Rôle |
|-------|-------------|------|
| `admin@simplon.ma` | `password123` | Super Admin |
| `pm@simplon.ma` | `password123` | Chargé de projet |
| `formateur1@simplon.ma` | `password123` | Formateur |
| `admin.casa@simplon.ma` | `password123` | Admin Campus |

## 🏗️ Stack technique

| Composant | Technologie |
|-----------|------------|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript |
| BDD | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma |
| Auth | NextAuth.js (credentials + JWT) |
| UI | CSS custom design system |
| Graphiques | Recharts |
| Dates | date-fns (Africa/Casablanca) |

## 📁 Structure du projet

```
├── prisma/
│   ├── schema.prisma     # 25+ entités
│   └── seed.ts           # Données de démo
├── src/
│   ├── app/
│   │   ├── (auth)/login/      # Page de connexion
│   │   ├── (dashboard)/       # Routes protégées
│   │   │   ├── admin/         # Dashboard, CRUD, projets
│   │   │   ├── trainer/       # Saisie présence
│   │   │   └── me/            # Portail apprenant
│   │   └── api/               # 20 endpoints API
│   ├── components/layout/     # Sidebar
│   └── lib/                   # Auth, RBAC, utils
```

## 🔒 Rôles (RBAC)

- **Super Admin** — Accès complet
- **Admin Campus** — Limité à son campus
- **Chargé de projet** — Pilotage projets et cohortes
- **Formateur** — Saisie présence, ses cohortes
- **Apprenant** — Portail personnel

## ✅ MVP livré

- [x] Auth sécurisée (login/logout/session/RBAC)
- [x] CRUD Campus / Programmes / Cohortes
- [x] CRUD Projets de formation + Partenaires
- [x] Gestion candidats + évaluation sourcing
- [x] Conversion candidat → apprenant
- [x] Fiches apprenants + statuts + historique
- [x] Suivi insertion professionnelle
- [x] Saisie présence/absence par demi-journée (AM/PM)
- [x] Dashboard global de pilotage (KPIs + graphiques + tableau cohortes)
- [x] Dashboard cohorte
- [x] Dashboard apprenant
- [x] Module planning projet (timeline + phases + éléments)
- [x] 25+ entités de données
- [x] 20 endpoints API
- [x] 16 pages frontend

## 📊 Dashboard global

- 6 cartes KPI (apprenants, actifs, cohortes, taux absence/retard, insertions)
- Pipeline candidats → apprenants → insérés
- Répartition statuts (pie chart)
- Statuts par programme (stacked bar)
- Absences par cohorte (bar chart coloré par risque)
- Types d'insertion (donut)
- Top 10 apprenants à risque
- Tableau interactif suivi cohortes

## 🗺️ Next steps (Priorité 2)

- [ ] Workflow justificatifs d'absence complet
- [ ] Calendrier officiel avancé (jours fériés, vacances)
- [ ] Activités pédagogiques hebdomadaires (formateur)
- [ ] Import CSV candidats
- [ ] Vue Gantt avancée avec dépendances
- [ ] Export CSV des données
- [ ] Notifications et alertes
- [ ] Upload de documents apprenants
- [ ] Migration vers PostgreSQL

## 📜 Licence

Application métier interne pour Simplon Maghreb.
