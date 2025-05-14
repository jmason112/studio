# syntax=docker/dockerfile:1

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install Python and pip
RUN apk add --no-cache python3 py3-pip

# Copy package files and setup script
COPY package*.json setup-env.js ./
COPY src/lib/scripts/requirements.txt ./src/lib/scripts/

# Create Python virtual environment
RUN python3 -m venv .venv && \
    .venv/bin/pip install --upgrade pip && \
    .venv/bin/pip install -r src/lib/scripts/requirements.txt

# Install Node dependencies
RUN npm ci

# Copy all files
COPY . .

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
