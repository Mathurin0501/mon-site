const { createClient } = require('@supabase/supabase-js');

// Ici on peut utiliser la clé "service_role" (secrète, jamais exposée au client)
// definie dans les variables d'environnement Netlify
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

exports.handler = async (event) => {
  const question = event.queryStringParameters.q;

  const { data, error } = await supabase
    .from('ta_table')
    .select('*')
    .ilike('question', `%${question}%`);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify(data)
  };
};
