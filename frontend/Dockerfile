# ── Stage 1: build Angular ────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifesto de dependências primeiro para aproveitar cache de camadas.
# Se apenas o código mudar (sem alterar package.json), esta camada é reutilizada.
COPY package*.json ./

# Usamos npm install em vez de npm ci por dois motivos:
# 1. npm ci exige package-lock.json existente — que deve ser gerado localmente
#    com 'npm install' antes do primeiro build.
# 2. --legacy-peer-deps resolve conflitos de peer deps do Angular Material 17
#    com pacotes que ainda declaram peer dep no Angular 16.
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# ── Stage 2: runtime com nginx ────────────────────────────────────────────────
FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Angular 17 com application builder gera os arquivos em dist/<nome>/browser/
COPY --from=builder /app/dist/korp-frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]