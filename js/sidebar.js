import { supabase } from './supabaseClient.js';

export function construireSidebar(pageActive) {
  const pages = [
    { id: 'accueil', href: 'index.html', label: 'Accueil' },
    { id: 'profil', href: 'profil.html', label: 'Mon profil' },
    { id: 'chat', href: 'chat.html', label: 'Salon' }
  ];

  const stations = pages.map(p => `
    <a href="${p.href}" class="station ${p.id === pageActive ? 'actif' : ''}">${p.label}</a>
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
}

export async function exigerConnexion() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'connexion.html';
  }
  return session;
}
