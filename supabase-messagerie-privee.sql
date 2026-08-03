-- Table des conversations (une ligne = un duo de personnes)
create table conversations (
  id uuid default gen_random_uuid() primary key,
  user1 uuid references auth.users not null,
  user2 uuid references auth.users not null,
  created_at timestamp default now()
);

alter table conversations enable row level security;

create policy "Voir ses propres conversations"
on conversations for select
using (auth.uid() = user1 or auth.uid() = user2);

create policy "Creer une conversation dont on fait partie"
on conversations for insert
with check (auth.uid() = user1 or auth.uid() = user2);

-- Table des messages prives, lies a une conversation
create table messages_prives (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender_id uuid references auth.users not null,
  contenu text not null,
  created_at timestamp default now()
);

alter table messages_prives enable row level security;

create policy "Voir les messages de ses conversations"
on messages_prives for select
using (
  exists (
    select 1 from conversations c
    where c.id = messages_prives.conversation_id
    and (c.user1 = auth.uid() or c.user2 = auth.uid())
  )
);

create policy "Envoyer un message dans sa conversation"
on messages_prives for insert
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from conversations c
    where c.id = messages_prives.conversation_id
    and (c.user1 = auth.uid() or c.user2 = auth.uid())
  )
);
