#!/bin/bash

# Build and Push Docker Images Script
# Usage: ./build-and-push.sh [registry] [tag] [--push]
# Example: ./build-and-push.sh myregistry.io/order-service v1.0.0 --push

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
REGISTRY="${1:-order-service}"
TAG="${2:-latest}"
PUSH="${3:-}"

# Image names
BACKEND_IMAGE="${REGISTRY}-backend:${TAG}"
FRONTEND_IMAGE="${REGISTRY}-frontend:${TAG}"

echo -e "${GREEN}=== Building Docker Images ===${NC}"
echo "Registry: ${REGISTRY}"
echo "Tag: ${TAG}"
echo ""

# Build backend image
echo -e "${YELLOW}Building backend image: ${BACKEND_IMAGE}${NC}"
docker build -t "${BACKEND_IMAGE}" \
  -f Dockerfile \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
  .

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Backend image built successfully${NC}"
else
  echo -e "${RED}✗ Backend image build failed${NC}"
  exit 1
fi

# Build frontend image
echo -e "${YELLOW}Building frontend image: ${FRONTEND_IMAGE}${NC}"
docker build -t "${FRONTEND_IMAGE}" \
  -f frontend/Dockerfile \
  --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
  --build-arg VCS_REF=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
  frontend/

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Frontend image built successfully${NC}"
else
  echo -e "${RED}✗ Frontend image build failed${NC}"
  exit 1
fi

# Push images if --push flag is set
if [ "$PUSH" == "--push" ]; then
  echo ""
  echo -e "${YELLOW}=== Pushing Images to Registry ===${NC}"
  
  echo -e "${YELLOW}Pushing ${BACKEND_IMAGE}${NC}"
  docker push "${BACKEND_IMAGE}"
  
  echo -e "${YELLOW}Pushing ${FRONTEND_IMAGE}${NC}"
  docker push "${FRONTEND_IMAGE}"
  
  echo -e "${GREEN}✓ All images pushed successfully${NC}"
else
  echo ""
  echo -e "${YELLOW}To push images, run:${NC}"
  echo "  docker push ${BACKEND_IMAGE}"
  echo "  docker push ${FRONTEND_IMAGE}"
  echo ""
  echo "Or use: ./build-and-push.sh ${REGISTRY} ${TAG} --push"
fi

echo ""
echo -e "${GREEN}=== Build Complete ===${NC}"
echo "Backend:  ${BACKEND_IMAGE}"
echo "Frontend: ${FRONTEND_IMAGE}"

