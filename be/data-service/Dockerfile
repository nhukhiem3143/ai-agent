FROM node:20-alpine
WORKDIR /app
# Cài đặt docker-cli để Node.js có thể ra lệnh bật web
RUN apk add --no-cache docker-cli docker-compose
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 5000
CMD ["node", "server.js"]