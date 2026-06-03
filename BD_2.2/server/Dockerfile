# Backend de autenticação — protótipo (roda TS direto via tsx)
FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (cache de camada)
COPY package.json ./
RUN npm install

# Código-fonte
COPY tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
