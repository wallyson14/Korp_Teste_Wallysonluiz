#  Stage 1: build Angular
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifesto de dependências primeiro para aproveitar cache de camadas.
COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: runtime com nginx
FROM nginx:1.25-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist/korp-frontend/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
