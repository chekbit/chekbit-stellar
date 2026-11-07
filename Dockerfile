# Use official Node.js image
FROM node:20

# Set the working directory inside the container
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install PM2 globally
RUN npm install pm2 -g

# Copy all the app files into the container
COPY . .

# Build the NestJS app
RUN npm run build

# Expose port 5000 (custom NestJS port)
EXPOSE 5000

# Use PM2 to start the app in production mode
CMD ["pm2-runtime", "dist/main.js"]
