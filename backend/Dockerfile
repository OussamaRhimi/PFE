FROM node:22-alpine

WORKDIR /opt/app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 1337

CMD ["npm", "run", "develop"]
