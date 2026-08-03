import { supabase } from './supabaseClient.js';
import { construireSidebar, initSidebar, exigerConnexion, marquerConversationLue } from './sidebar.js';

const session = await exigerConnexion();
const monId = session.user.id;

document.getElementById('app').innerHTML = `
  ${construireSidebar('messages')}
  <main class="contenu" style="max-width: 760px;">
    <p class="eyebrow">Messagerie privée</p>
    <h1>Messages</h1>
    <div class="messagerie" style="margin-top: 24px;">
      <div class="liste-conversations" id="listeConv"></div>
      <div>
        <div id="filPrive"><p style="color:var(--muted); font-size:13px;">Sélectionne une conversation à gauche.</p></div>
        <form id="formMessagePrive" style="display:none;">
          <input type="text" id="contenuPrive" placeholder="Écris un message..." autocomplete="off">
          <button type="submit">Envoyer</button>
        </form>
      </div>
    </div>
  </main>
`;

initSidebar();

let conversationActive = null;
let canalRealtime = null;

async function nomAffiche(userId) {
  const { data } = await supabase.from('profils').select('nom, prenom').eq('id', userId).single();
  return data ? `${data.prenom} ${data.nom}` : 'Utilisateur';
}

async function compterNonLus(conversationId) {
  const map = JSON.parse(localStorage.getItem('dernierLuMessages') || '{}');
  const seuil = map[conversationId] || '1970-01-01T00:00:00.000Z';
  const { count } = await supabase
    .from('messages_prives')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', monId)
    .gt('created_at', seuil);
  return count || 0;
}

function afficherBadgeConv(conversationId, nombre) {
  const div = document.querySelector(`.conv-item[data-conv-id="${conversationId}"]`);
  if (!div) return;
  const badge = div.querySelector('.badge');
  if (nombre > 0) {
    if (badge) {
      badge.textContent = nombre > 9 ? '9+' : String(nombre);
    } else {
      const span = document.createElement('span');
      span.className = 'badge';
      span.textContent = nombre > 9 ? '9+' : String(nombre);
      div.appendChild(span);
    }
  } else if (badge) {
    badge.remove();
  }
}

async function chargerConversations() {
  const { data: convs, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user1.eq.${monId},user2.eq.${monId}`)
    .order('created_at', { ascending: false });

  const liste = document.getElementById('listeConv');
  liste.innerHTML = '';

  if (error || !convs || convs.length === 0) {
    liste.innerHTML = '<p style="padding:14px; font-size:13px; color:var(--muted);">Aucune conversation pour l\'instant.</p>';
    return;
  }

  for (const conv of convs) {
    const autreId = conv.user1 === monId ? conv.user2 : conv.user1;
    const nom = await nomAffiche(autreId);
    const nonLus = await compterNonLus(conv.id);

    const div = document.createElement('div');
    div.className = 'conv-item';
    div.dataset.convId = conv.id;

    const spanNom = document.createElement('span');
    spanNom.className = 'conv-nom';
    spanNom.textContent = nom;
    div.appendChild(spanNom);

    if (nonLus > 0) {
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = nonLus > 9 ? '9+' : String(nonLus);
      div.appendChild(badge);
    }

    div.addEventListener('click', () => ouvrirConversation(conv.id, nom));
    liste.appendChild(div);
  }

  return convs;
}

async function trouverOuCreerConversation(autreUserId) {
  const { data: existantes } = await supabase
    .from('conversations')
    .select('*')
    .or(`and(user1.eq.${monId},user2.eq.${autreUserId}),and(user1.eq.${autreUserId},user2.eq.${monId})`);

  if (existantes && existantes.length > 0) {
    return existantes[0];
  }

  const { data: nouvelle, error } = await supabase
    .from('conversations')
    .insert({ user1: monId, user2: autreUserId })
    .select()
    .single();

  if (error) {
    console.error('Erreur création conversation :', error.message);
    return null;
  }
  return nouvelle;
}

async function ouvrirConversation(conversationId, nomAutre) {
  conversationActive = conversationId;

  document.querySelectorAll('.conv-item').forEach(el => el.classList.remove('actif'));
  const match = document.querySelector(`.conv-item[data-conv-id="${conversationId}"]`);
  if (match) match.classList.add('actif');

  afficherBadgeConv(conversationId, 0);

  const fil = document.getElementById('filPrive');
  fil.innerHTML = '';
  document.getElementById('formMessagePrive').style.display = 'flex';

  const { data: msgs, error } = await supabase
    .from('messages_prives')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (!error) {
    msgs.forEach(afficherMessagePrive);
  }

  marquerConversationLue(conversationId);

  if (canalRealtime) supabase.removeChannel(canalRealtime);

  canalRealtime = supabase
    .channel(`messages-prives-${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages_prives', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        afficherMessagePrive(payload.new);
        marquerConversationLue(conversationId);
      }
    )
    .subscribe();
}

function afficherMessagePrive(msg) {
  const fil = document.getElementById('filPrive');
  const div = document.createElement('div');
  div.className = 'msg-prive';
  const estMoi = msg.sender_id === monId;
  div.innerHTML = `<div class="auteur"></div><div class="texte"></div>`;
  div.querySelector('.auteur').textContent = estMoi ? 'Moi' : '...';
  div.querySelector('.texte').textContent = msg.contenu;
  fil.appendChild(div);
  fil.scrollTop = fil.scrollHeight;

  if (!estMoi) {
    nomAffiche(msg.sender_id).then(nom => {
      div.querySelector('.auteur').textContent = nom;
    });
  }
}

document.getElementById('formMessagePrive').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!conversationActive) return;

  const input = document.getElementById('contenuPrive');
  const contenu = input.value.trim();
  if (!contenu) return;

  const { error } = await supabase.from('messages_prives').insert({
    conversation_id: conversationActive,
    sender_id: monId,
    contenu
  });

  if (error) {
    console.error("Erreur d'envoi :", error.message);
    return;
  }
  input.value = '';
});

// Met à jour le badge d'une conversation quand un message arrive alors
// qu'elle n'est pas actuellement ouverte
supabase
  .channel('badges-conversations')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages_prives' },
    async (payload) => {
      const msg = payload.new;
      if (msg.sender_id === monId) return;
      if (msg.conversation_id === conversationActive) return;
      const nonLus = await compterNonLus(msg.conversation_id);
      afficherBadgeConv(msg.conversation_id, nonLus);
    }
  )
  .subscribe();

// Si on arrive depuis "Envoyer un message" sur la page Membres
const params = new URLSearchParams(window.location.search);
const cibleId = params.get('user');

await chargerConversations();

if (cibleId && cibleId !== monId) {
  const conv = await trouverOuCreerConversation(cibleId);
  if (conv) {
    await chargerConversations();
    const nom = await nomAffiche(cibleId);
    ouvrirConversation(conv.id, nom);
  }
}
