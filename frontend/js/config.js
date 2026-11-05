/* Configuração do Supabase.
   Estes dois valores são PÚBLICOS por natureza (ficam no navegador de qualquer forma).
   Quem protege os dados são as regras de RLS em backend/supabase/migrations.
   NUNCA coloque aqui a "service_role" / "secret key".
   Se ficarem vazios, o dashboard funciona só neste navegador, como antes. */
window.SUPABASE_CONFIG = {
  url: '',
  key: ''
};
