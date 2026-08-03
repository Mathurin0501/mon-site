import { supabase } from './supabaseClient.js';

document.getElementById('formConnexion').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    document.getElementById('message').innerText = "Erreur : " + error.message;
    return;
  }

  window.location.href = 'index.html';
});
