# Stage 1: Clone the repository and build the React application
FROM node:18-alpine AS build

# Install git
RUN apk add --no-cache git

# Clone your repository from GitHub
# IMPORTANT: Replace this URL with your actual repository URL
RUN git clone https://github.com/your-username/craps-tracker-app.git /app

WORKDIR /app

# Install dependencies and build the application
RUN npm install
RUN npm run build

# Stage 2: Serve the application using a lightweight web server
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
