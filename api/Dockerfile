FROM node:20.18.2-alpine3.20

RUN apk add --no-cache bash postgresql-client

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3300

CMD ["node", "src/app.js"]
