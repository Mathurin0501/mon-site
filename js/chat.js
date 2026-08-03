import { supabase } from './supabaseClient.js';
import { marquerSalonLu } from './sidebar.js';

export async function initChat(session) {
  const { data: profil } = await supabase
    .from('profils')
    .select('prenom')
    .eq('id', session.user.id)
    .single();

  const monPrenom = profil ? profil.prenom : 'Anonyme';
  const fil = document.getElementById('fil');

  function formaterHeure(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  async function chargerReactions(messageId) {
    const { data } = await supabase
      .from('reactions')
      .select('user_id')
      .eq('message_id', messageId);
    return data || [];
  }

  async function afficherMessage(msg) {
    const reactions = await chargerReactions(msg.id);
    const dejaReagi = reactions.some(r => r.user_id === session.user.id);

    const div = document.createElement('div');
    div.className = 'msg';
    div.dataset.messageId = msg.id;
    div.innerHTML = `
      <div class="auteur"></div>
      <div class="texte"></div>
      <button class="reaction-btn" style="background:none;border:none;cursor:pointer;font-size:13px;margin-top:4px;color:${dejaReagi ? 'var(--gold)' : 'var(--muted)'};padding:0;width:auto;display:block;text-align:left;">
        ❤️ <span class="compteur">${reactions.length}</span>
      </button>
    `;
    div.querySelector('.auteur').textContent = `${msg.prenom} · ${formaterHeure(msg.created_at)}`;
    div.querySelector('.texte').textContent = msg.contenu;

    const btn = div.querySelector('.reaction-btn');
    btn.addEventListener('click', async () => {
      const aReagi = btn.style.color === 'var(--gold)' || btn.dataset.reagi === 'true';

      if (btn.dataset.reagi === 'true') {
        await supabase.from('reactions').delete()
          .eq('message_id', msg.id)
          .eq('user_id', session.user.id);
        btn.dataset.reagi = 'false';
        btn.style.color = 'var(--muted)';
        btn.querySelector('.compteur').textContent =
          parseInt(btn.querySelector('.compteur').textContent) - 1;
      } else {
        await supabase.from('reactions').insert({
          message_id: msg.id,
          user_id: session.user.id
        });
        btn.dataset.reagi = 'true';
        btn.style.color = 'var(--gold)';
        btn.querySelector('.compteur').textContent =
          parseInt(btn.querySelector('.compteur').textContent) + 1;
      }
    });
    btn.dataset.reagi = dejaReagi ? 'true' : 'false';

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
    for (const m of messages) await afficherMessage(m);
  }

  marquerSalonLu();

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
