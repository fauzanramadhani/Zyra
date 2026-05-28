FROM node:18-alpine

WORKDIR /app

# Install system dependencies needed for some node packages if any
RUN apk add --no-cache openssl python3 make g++

# Copy package descriptors
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy prisma schema first to generate client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy source code
COPY . .

EXPOSE 5000

CMD ["npm", "run", "dev"]
