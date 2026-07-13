FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . . 

# for prod
# RUN npm run buildCMD ["npm", "run", "dev"]

EXPOSE 4000

CMD ["npm", "run", "dev"]

# for prod

# CMD ["node", "dist/index.js"]