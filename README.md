# Meu Dashboard

Painel pessoal de clientes, financeiro, outros gastos e prospecção.

## Estrutura

```
Meu Dashboard/
├── frontend/                  # o site (HTML + CSS + JS puro, sem build)
│   ├── index.html             # estrutura das telas e formulários
│   ├── css/
│   │   └── styles.css         # tema claro/escuro, layout, componentes
│   └── js/                    # carregados nesta ordem pelo index.html
│       ├── armazenamento.js   # estado, localStorage, arquivo de sincronização, IndexedDB
│       ├── planilhas-automaticas.js  # importa sozinho as planilhas da pasta Prospec Automatico
│       ├── utilidades.js      # formatação de dinheiro, datas, helpers
│       ├── regras.js          # regras de negócio (cobranças, status, totais do mês)
│       ├── render.js          # desenha cada aba (visão geral, clientes, financeiro…)
│       ├── importar-planilha.js  # leitura de .xlsx/.csv (cores → situação), mescla sem duplicar
│       ├── formularios.js     # diálogos de cadastro e edição
│       ├── eventos.js         # cliques, filtros, menu Dados, backup, desfazer
│       └── main.js            # inicialização
├── backend/                   # Supabase (próxima etapa) — ver backend/README.md
├── backups/                   # cópias locais (fora do Git)
└── .claude/launch.json        # servidor de preview (localhost:5178)
```

## Rodar

Abra `frontend/index.html` no navegador, ou sirva a pasta:

```bash
python3 -m http.server 5178 --directory frontend
```

A ordem dos `<script>` no `index.html` importa: `main.js` precisa ser o último.
