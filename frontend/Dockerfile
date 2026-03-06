# Use Node.js 18 for the Vite project
FROM node:18

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your React code
COPY . .

# Expose port 5173 for Vite
EXPOSE 5173

# IMPORTANT: --host 0.0.0.0 is required for DigitalOcean access
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]