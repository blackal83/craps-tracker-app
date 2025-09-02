#!/bin/bash

# --- Configuration ---
# The URL to your GitHub repository.
# IMPORTANT: Replace this with your actual repository URL.
REPO_URL="https://github.com/your-username/craps-tracker-app.git"

# The name of the Dockerfile.
DOCKERFILE_NAME="Dockerfile"
LOCAL_BUILD_NAME="craps-tracker-app-build"
CREDENTIALS_FILE_PATH="${HOME}/.git-credentials"

# --- Script Start ---

echo "Starting deployment process..."

# Step 1: Check for and copy the git-credentials file
echo "Checking for Git credentials..."
if [ ! -f "${CREDENTIALS_FILE_PATH}" ]; then
    echo "Error: Git credentials file not found at ${CREDENTIALS_FILE_PATH}"
    echo "Please ensure you have run 'git config --global credential.helper store' and authenticated at least once."
    exit 1
fi

echo "Copying credentials to build context..."
# Copy credentials to a temporary file in the current directory
cp "${CREDENTIALS_FILE_PATH}" ./.git-credentials-temp

# Step 2: Create the Dockerfile
echo "Creating the Dockerfile..."
cat > ${DOCKERFILE_NAME} <<EOL
# Stage 1: Clone the repository and build the React application
FROM node:18-alpine AS build
RUN apk add --no-cache git

# Copy the credentials file from the build context and configure git to use it
COPY .git-credentials-temp /root/.git-credentials
RUN git config --global credential.helper store

# Clone the repository (it will now use the stored credentials for authentication)
RUN git clone ${REPO_URL} /app

WORKDIR /app
RUN npm install
RUN npm run build

# Stage 2: Serve the application using a lightweight web server
FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOL

echo "Dockerfile created."

# Step 3: Build the Docker image
echo "Building the Docker image... This will pull the latest code from GitHub."
sudo docker build -t ${LOCAL_BUILD_NAME} .

# After the build, immediately remove the copied credentials file for security
rm ./.git-credentials-temp

if [ $? -ne 0 ]; then
    echo "Docker build failed. Aborting."
    exit 1
fi

# Step 4: Extract the version from the built image
echo "Extracting version number from the built image..."
VERSION=$(sudo docker run --rm ${LOCAL_BUILD_NAME} cat /app/package.json | grep version | awk -F '"' '{print $4}')

if [ -z "$VERSION" ]; then
    echo "Could not determine version from package.json. Aborting."
    sudo docker rmi ${LOCAL_BUILD_NAME}
    exit 1
fi

echo "Detected version: ${VERSION}"

# Step 5: Tag and Push to Docker Hub
read -p "Please enter your Docker Hub username: " DOCKER_HUB_USERNAME

IMAGE_NAME="${DOCKER_HUB_USERNAME}/craps-tracker-app"
TAGGED_IMAGE="${IMAGE_NAME}:${VERSION}"

echo "Tagging image as ${TAGGED_IMAGE}..."
sudo docker tag ${LOCAL_BUILD_NAME} ${TAGGED_IMAGE}

echo "Tagging image as latest..."
sudo docker tag ${LOCAL_BUILD_NAME} ${IMAGE_NAME}:latest

echo "Pushing images to Docker Hub..."
sudo docker push ${TAGGED_IMAGE}
sudo docker push ${IMAGE_NAME}:latest

if [ $? -ne 0 ]; then
    echo "Docker push failed. Make sure you are logged in to Docker Hub. Aborting."
    exit 1
fi

# Clean up the local build image
sudo docker rmi ${LOCAL_BUILD_NAME}

# Step 6: Provide Portainer Instructions
echo ""
echo "--------------------------------------------------"
echo "Deployment successful!"
echo ""
echo "To update your stack in Portainer:"
echo "1. Go to your stack."
echo "2. Click 'Editor'."
echo "3. Ensure your docker-compose.yml uses the image:"
echo "   image: ${TAGGED_IMAGE}"
echo "4. Click 'Update the stack' and ensure 'Pull latest image' is enabled."
echo "--------------------------------------------------"
