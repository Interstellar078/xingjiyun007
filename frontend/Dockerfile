# Build Stage
FROM node:20-alpine as build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config (we will mount this via compose or copy here if we want self-contained)
# For now, we rely on the default or an external config in compose, 
# BUT best practice is to copy it. We'll expect nginx.conf to be provided.
# Let's actually copy a default one for the frontend specific routing if needed, 
# but usually the main nginx handles it. 
# Actually, for a single container frontend, we need a default.conf.

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
