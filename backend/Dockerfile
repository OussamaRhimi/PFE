FROM node:22-bookworm-slim

WORKDIR /opt/app

COPY package*.json ./
RUN npm install
RUN npx playwright install --with-deps chromium

COPY . .

EXPOSE 1337

CMD ["npm", "run", "develop"]
