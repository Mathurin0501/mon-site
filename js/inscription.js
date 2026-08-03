import { supabase } from './supabaseClient.js';

document.getElementById('formInscription').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const nom = document.getElementById('nom').value;
  const prenom = document.getElementById('prenom').value;
  const age = document.getElementById('age').value;

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    document.getElementById('message').innerText = "Erreur : " + error.message;
    return;
  }

  const { error: errorProfil } = await supabase.from('profils').insert({
    id: data.user.id,
    nom,
    prenom,
    age
  });

  if (errorProfil) {
    document.getElementById('message').innerText = "Compte créé, mais erreur profil : " + errorProfil.message;
    return;
  }

  document.getElementById('message').innerText = "Compte créé ! Tu peux te connecter.";
});
