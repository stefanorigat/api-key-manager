# Docker Setup Guide

This guide explains how to run the API Key Manager application using Docker.

## Prerequisites

- Docker installed on your system ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose (included with Docker Desktop)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/stefanorigat/api-key-manager.git
cd api-key-manager
```

### 2. Set Up Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual configuration:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Keycloak SSO Configuration
NEXT_PUBLIC_KEYCLOAK_ISSUER=https://your-keycloak-domain/realms/your-realm
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=your_client_id
KEYCLOAK_CLIENT_SECRET=your_client_secret

# Application URL (update for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Build and Run with Docker Compose

```bash
docker-compose up -d
```

This will:
- Build the Docker image
- Start the container
- Expose the application on port 3000

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Docker Commands

### Build the Image

```bash
docker-compose build
```

### Start the Container

```bash
docker-compose up -d
```

### Stop the Container

```bash
docker-compose down
```

### View Logs

```bash
docker-compose logs -f
```

### Restart the Container

```bash
docker-compose restart
```

### Rebuild and Restart

```bash
docker-compose up -d --build
```

## Using Docker Without Compose

If you prefer to use Docker commands directly:

### Build

```bash
docker build -t api-key-manager .
```

### Run

```bash
docker run -p 3000:3000 \
  --env-file .env.local \
  --name api-key-manager \
  api-key-manager
```

### Stop

```bash
docker stop api-key-manager
docker rm api-key-manager
```

## Production Deployment

### Update Environment Variables

For production, update `.env.local` or create `.env.production`:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Build for Production

```bash
docker-compose -f docker-compose.yml build
```

### Run in Production

```bash
docker-compose -f docker-compose.yml up -d
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, change it in `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Change 3001 to any available port
```

### Environment Variables Not Loading

Make sure `.env.local` exists and is in the same directory as `docker-compose.yml`.

### Container Crashes

Check the logs:

```bash
docker-compose logs app
```

### Rebuild After Code Changes

```bash
docker-compose down
docker-compose up -d --build
```

## Docker Image Details

- **Base Image**: Node.js 20 Alpine (lightweight)
- **Multi-stage Build**: Optimized for production
- **Image Size**: ~200MB (optimized with standalone output)
- **User**: Runs as non-root user for security

## Health Checks

To add health checks, uncomment the following in `docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## Scaling

To run multiple instances:

```bash
docker-compose up -d --scale app=3
```

Note: You'll need to configure a load balancer to distribute traffic.

## Monitoring

View resource usage:

```bash
docker stats api-key-manager
```

## Backup

To backup your environment configuration:

```bash
cp .env.local .env.backup
```

## Support

For issues or questions:
- Check the logs: `docker-compose logs -f`
- Review the [main README](./README.md)
- Open an issue on GitHub

