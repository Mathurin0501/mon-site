import { supabase } from './supabaseClient.js';

export async function initChat(session) {
  const { data: profil } = await supabase
    .from('profils')
    .select('prenom')
    .eq('id', session.user.id)
    .single();

  const monPrenom = profil ? profil.prenom : 'Anonyme';
  const fil = document.getElementById('fil');

  function afficherMessage(msg) {
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = `<div class="auteur"></div><div class="texte"></div>`;
    div.querySelector('.auteur').textContent = msg.prenom;
    div.querySelector('.texte').textContent = msg.contenu;
    fil.appendChild(div);
    fil.scrollTop = fil.scrollHeight;
  }

  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) {
    console.error('Erreur de chargement des messages :', error.message);
  } else {
    messages.forEach(afficherMessage);
  }

  supabase
    .channel('messages-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => afficherMessage(payload.new)
    )
    .subscribe();

  document.getElementById('formMessage').addEventListener('submit', async (e) => {
    e.preventDefault();
    const contenuInput = document.getElementById('contenu');
    const contenu = contenuInput.value.trim();
    if (!contenu) return;

    const { error } = await supabase.from('messages').insert({
      user_id: session.user.id,
      prenom: monPrenom,
      contenu
    });

    if (error) {
      console.error("Erreur d'envoi :", error.message);
      return;
    }
    contenuInput.value = '';
  });
}
