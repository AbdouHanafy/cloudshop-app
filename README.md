# CloudShop Learn

CloudShop Learn is a microservices-based learning platform focused on course discovery, saved learning lists, enrollment tracking, and authentication.

## Product Direction

This repository is no longer a generic e-commerce demo.
The backend already reflects an e-learning domain, so the product direction is now officially:

- Discover courses
- Save courses to a personal learning list
- Enroll in courses
- Track enrollment progress
- Authenticate learners

## Current Architecture

- `frontend`
  React + Vite client application
- `services/catalog`
  FastAPI service for course discovery
- `services/cart`
  FastAPI service for saved courses and learning-list state in Redis
- `services/orders`
  Express + PostgreSQL service for enrollments and progress tracking
- `services/auth`
  Express service for registration, login, and token verification
- `docker-compose.yml`
  Local orchestration for app services, Redis, and Postgres

## Runtime Configuration

### Frontend

- `VITE_CATALOG_API_URL`
- `VITE_LEARNING_LIST_API_URL`
- `VITE_ENROLLMENTS_API_URL`
- `VITE_AUTH_API_URL`

### Backend

- `CORS_ORIGINS`
  Comma-separated list of allowed frontend origins
- `JWT_SECRET`
- `REDIS_HOST`
- `REDIS_PORT`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

## Service Contract

### Catalog Service

- `GET /`
  Service metadata
- `GET /health`
  Health check
- `GET /courses`
  All courses with optional `category`, `level`, `featured`, `search`, and `limit` filters
- `GET /courses/featured`
  Featured courses
- `GET /categories`
  Course categories
- `GET /courses/{course_id}`
  Course details
- `GET /courses/slug/{slug}`
  Course details by slug

### Learning List Service

The service folder is still named `cart` for now, but its product role is `learning-list`.

- `GET /`
  Service metadata
- `GET /health`
  Health check with Redis dependency status
- `GET /learning-list/{user_id}`
  Fetch saved courses with totals
- `POST /learning-list/{user_id}`
  Save a course
- `DELETE /learning-list/{user_id}/{course_id}`
  Remove a saved course
- `DELETE /learning-list/{user_id}`
  Clear saved courses

### Enrollments Service

The service folder is still named `orders` for now, but its product role is `enrollments`.

- `GET /`
  Service metadata
- `GET /health`
  Health check with Postgres dependency status
- `GET /enrollments/{userId}`
  User enrollments with summary counts
- `POST /enrollments`
  Create or reactivate an enrollment
- `PATCH /enrollments/{id}/progress`
  Update progress

### Auth Service

- `GET /`
  Service metadata
- `GET /health`
  Health check with auth configuration metadata
- `POST /auth/register`
  Register user
- `POST /auth/login`
  Login user
- `GET /auth/verify`
  Verify JWT token
- `GET /auth/me`
  Read current authenticated user

## Frontend Target Experience

The frontend should align with the service contract above and be rebuilt around these pages:

- Landing page
- Course catalog
- Course detail experience
- Learning list
- Learner dashboard and enrollments
- Authentication flow

## Known Gaps From Analysis

- The frontend still calls old e-commerce endpoints like `/products` and `/cart`
- Service folder names (`cart`, `orders`) do not match the current product language
- The current UI is demo-level and not yet aligned with the new product vision
- There is no shared frontend API layer yet

## Delivery Plan

1. Product alignment and contract cleanup
2. Backend foundation and API consistency
3. Frontend structure and data integration
4. Creative UI/UX implementation
5. Verification and polish
