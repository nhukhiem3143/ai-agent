FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5000
# Lưu ý: server.js của bạn nằm trong src/ nên phải trỏ đúng đường dẫn
CMD ["node", "server.js"]