# Stage 1 - Build
FROM node:20-slim AS builder
WORKDIR /app
COPY package.json .
RUN npm install --production

# Stage 2 - Runtime
FROM node:20-slim
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY index.js .
COPY package.json .

EXPOSE 8002

CMD ["node", "index.js"]