# Mon site - Netlify + Supabase

## 1. Configurer Supabase

1. Crée un projet sur https://supabase.com
2. Dans **Authentication -> Providers**, active **Email**.
3. Dans **SQL Editor**, exécute :

```sql
create table profils (
  id uuid references auth.users primary key,
  nom text,
  prenom text,
  age int2,
  created_at timestamp default now()
);

alter table profils enable row level security;

create policy "Chacun voit son propre profil"
on profils for select
using (auth.uid() = id);

create policy "Chacun modifie son propre profil"
on profils for update
using (auth.uid() = id);

create policy "Chacun cree son propre profil"
on profils for insert
with check (auth.uid() = id);
```

4. Dans **Project Settings -> API**, note :
   - Project URL
   - anon public key
   - service_role key (secrète, pour les fonctions Netlify uniquement)

## 2. Configurer le projet

Ouvre `js/supabaseClient.js` et remplace :
- `SUPABASE_URL` par ton Project URL
- `SUPABASE_KEY` par ta clé anon public

## 3. Variables d'environnement Netlify (pour les fonctions serveur)

Sur app.netlify.com -> Site settings -> Environment variables, ajoute :
- `SUPABASE_URL`
- `SUPABASE_KEY` (ici, tu peux utiliser la clé service_role pour les fonctions)

## 4. Tester en local

```bash
npm install -g netlify-cli
netlify dev
```

## 5. Déployer

1. Pousse ce dossier sur un dépôt GitHub.
2. Sur app.netlify.com -> Add new site -> Import an existing project.
3. Connecte ton dépôt GitHub, Netlify détecte automatiquement `netlify/functions`.

## Structure du projet

```
mon-site/
├── netlify.toml
├── index.html
├── inscription.html
├── connexion.html
├── profil.html
├── js/
│   ├── supabaseClient.js
│   ├── inscription.js
│   ├── connexion.js
│   └── profil.js
└── netlify/
    └── functions/
        ├── recherche.js
        └── package.json
```
