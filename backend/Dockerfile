# Backend Dockerfile
FROM node:20-bookworm

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production

COPY src ./src
COPY .env.example ./.env
RUN mkdir -p data logs

EXPOSE 3001
CMD ["node","src/index.js"]
