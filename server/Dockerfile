FROM node:22-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/data
ENV DB_PATH=/app/data/wave.db

EXPOSE 3001
CMD ["node", "index.js"]
