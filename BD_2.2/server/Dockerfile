# Imagem autocontida da API de autenticação (protótipo).
# IMPORTANTE: o build context é a RAIZ do projeto (cadastrodemaquina/),
# definido no docker-compose.yml, para que a imagem copie tanto o backend
# (BD_2.2/server) quanto o frontend estático (pasta client/).
FROM node:20-alpine

WORKDIR /app

# 1) Dependências primeiro (camada cacheável).
COPY BD_2.2/server/package.json ./
RUN npm install

# 2) Código do backend (TypeScript, rodado via tsx — sem build separado).
COPY BD_2.2/server/tsconfig.json ./
COPY BD_2.2/server/src ./src

# 3) Frontend estático servido pela própria API (mesma origem, sem CORS).
COPY client/ /frontend/

ENV NODE_ENV=production \
    PORT=3001 \
    FRONTEND_DIR=/frontend

EXPOSE 3001
CMD ["npm", "start"]
