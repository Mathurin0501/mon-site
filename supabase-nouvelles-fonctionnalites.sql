-- 1. Photo de profil : colonne pour stocker l'URL de l'avatar
alter table profils add column if not exists avatar_url text;

-- 2. Liste des membres : autoriser tout le monde a lire tous les profils
create policy "Lecture publique des profils"
on profils for select
using (true);

-- 3. Stockage des avatars : lecture publique, upload uniquement dans son propre dossier
create policy "Lecture publique des avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Upload de son propre avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Mise a jour de son propre avatar"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

-- 4. Reactions sur les messages du salon
create table reactions (
  id uuid default gen_random_uuid() primary key,
  message_id uuid references messages(id) on delete cascade,
  user_id uuid references auth.users not null,
  emoji text not null default '❤️',
  unique(message_id, user_id)
);

alter table reactions enable row level security;

create policy "Lecture publique des reactions"
on reactions for select using (true);

create policy "Chacun ajoute sa propre reaction"
on reactions for insert with check (auth.uid() = user_id);

create policy "Chacun supprime sa propre reaction"
on reactions for delete using (auth.uid() = user_id);
