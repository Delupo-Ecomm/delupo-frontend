# Delupo Stats Frontend

Frontend para dashboards de ecommerce consumindo a API do backend Delupo.

## Stack
- React + Vite
- Tailwind CSS
- Recharts
- TanStack Query

## Como rodar
```bash
npm install
npm run dev
```

## Configuracao
Defina a base da API com a variavel `VITE_API_BASE`.

Exemplo:
```bash
VITE_API_BASE=http://localhost:3000 npm run dev
```

## Estrutura
- `src/App.jsx`: grafico de vendas diarias
- `src/lib/api.js`: cliente de API
- `src/components/*`: cards e filtros
