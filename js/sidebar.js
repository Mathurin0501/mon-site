import { supabase } from './supabaseClient.js';

export function construireSidebar(pageActive) {
  const pages = [
    { id: 'accueil', href: 'index.html', label: 'Accueil' },
    { id: 'profil', href: 'profil.html', label: 'Mon profil' },
    { id: 'membres', href: 'membres.html', label: 'Membres' },
    { id: 'messages', href: 'messages.html', label: 'Messages' },
    { id: 'chat', href: 'chat.html', label: 'Salon' }
  ];

  const stations = pages.map(p => `
    <a href="${p.href}" class="station ${p.id === pageActive ? 'actif' : ''}">
      ${p.label}
      ${(p.id === 'chat' || p.id === 'messages') ? `<span class="badge" id="badge-${p.id}" style="display:none;"></span>` : ''}
    </a>
  `).join('');

  return `
    <button class="menu-toggle" id="menuToggle">☰ Menu</button>
    <aside class="sidebar" id="sidebar">
      <div class="logo">Mon Site</div>
      <nav class="ligne">${stations}</nav>
      <div class="sidebar-bas">
        <button class="bouton-texte" id="btnDeconnexion">Déconnexion</button>
      </div>
    </aside>
  `;
}

export function initSidebar() {
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('ouvert');
  });

  document.getElementById('btnDeconnexion')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'connexion.html';
  });

  actualiserBadges();
  ecouterNouveauxMessages();
}

export async function exigerConnexion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'connexion.html';
  }
  return session;
}

/* ---------- Gestion des badges de notification ---------- */

function cleLuSalon() { return 'dernierLuSalon'; }
function cleLuMessages() { return 'dernierLuMessages'; }

function lireDate(cle) {
  return localStorage.getItem(cle) || '1970-01-01T00:00:00.000Z';
}

function afficherBadge(id, nombre) {
  const badge = document.getElementById(`badge-${id}`);
  if (!badge) return;
  if (nombre > 0) {
    badge.textContent = nombre > 9 ? '9+' : String(nombre);
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

async function actualiserBadges() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  const monId = session.user.id;

  // Salon commun
  const { count: countSalon } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .neq('user_id', monId)
    .gt('created_at', lireDate(cleLuSalon()));

  afficherBadge('chat', countSalon || 0);

  // Messages prives : somme sur toutes les conversations
  const dernierLuMap = JSON.parse(localStorage.getItem(cleLuMessages()) || '{}');

  const { data: convs } = await supabase
    .from('conversations')
    .select('id')
    .or(`user1.eq.${monId},user2.eq.${monId}`);

  let totalNonLus = 0;
  if (convs) {
    for (const c of convs) {
      const seuil = dernierLuMap[c.id] || '1970-01-01T00:00:00.000Z';
      const { count } = await supabase
        .from('messages_prives')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', c.id)
        .neq('sender_id', monId)
        .gt('created_at', seuil);
      totalNonLus += count || 0;
    }
  }

  afficherBadge('messages', totalNonLus);
}

function ecouterNouveauxMessages() {
  const surSalon = window.location.pathname.includes('chat.html');
  const surMessages = window.location.pathname.includes('messages.html');

  supabase
    .channel('badges-notifications')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
      if (!surSalon) actualiserBadges();
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages_prives' }, () => {
      if (!surMessages) actualiserBadges();
    })
    .subscribe();
}

export function marquerSalonLu() {
  localStorage.setItem(cleLuSalon(), new Date().toISOString());
  afficherBadge('chat', 0);
}

export function marquerConversationLue(conversationId) {
  const map = JSON.parse(localStorage.getItem(cleLuMessages()) || '{}');
  map[conversationId] = new Date().toISOString();
  localStorage.setItem(cleLuMessages(), JSON.stringify(map));
  actualiserBadges();
}
