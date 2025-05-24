FROM oven/bun:1.0

# Set working directory
WORKDIR /app

# Copy package.json and lockfile
COPY package.json ./
COPY bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source files
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Command to run the application
CMD ["bun", "run", "start"]
