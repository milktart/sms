# Use Node.js official image
FROM node:18

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source files
COPY . .

# Expose port and start app
EXPOSE 8080
CMD [ "npm", "start" ]
