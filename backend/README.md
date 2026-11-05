# Backend

Por enquanto o dashboard roda 100% no navegador (dados no `localStorage`).

Esta pasta vai receber o backend no **Supabase**:

```
backend/
└── supabase/
    ├── migrations/   # tabelas (clientes, gastos, outros gastos, prospecções) e regras de acesso (RLS)
    └── seed.sql      # dados de exemplo para testes (nunca dados reais)
```

O frontend fala com o Supabase direto do navegador, usando a chave pública
("anon key"). Quem protege os dados são as regras de RLS: cada linha só pode ser
lida e alterada pelo usuário logado que é dono dela.
