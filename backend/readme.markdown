# KITM Backend API
## Introduction
This is the backend API for the KITM (Kathmandu Institute of Technology and Management) website. It provides a comprehensive set of endpoints for managing the college website content, student applications, user authentication, and more.

## Project Structure
```
├── controllers/       # Business logic for handling requests
├── lib/               # Utility functions and configurations
├── middleware/        # Express middleware functions
├── prisma/            # Database schema and migrations
├── routes/            # API route definitions
├── uploads/           # File storage for uploaded content
└── server.js          # Main application entry point
```
## Getting Started
### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL database
- Redis server (for token storage)
### Installation
1. Clone the repository
```
git clone <repository-url>
cd kitm-backend
```
2. Install dependencies
```
npm install
```
3. Set up environment variables
   Create a .env file in the root directory with the following variables:
```
DATABASE_URL="postgresql://username:password@localhost:5432/kitm_db"
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
UPSTASH_REDIS_URL=your_redis_url
BREVO_API_KEY=your_brevo_api_key
FRONTEND_URL=http://localhost:3000
```
4. Run database migrations
```
npx prisma migrate dev
```
5. Seed the database (optional)
```
npx prisma db seed
```
6. Start the development server
```
npm run dev
```
## Database Schema
The application uses Prisma ORM with PostgreSQL. Here's an overview of the main models:

### Users Model
```
model users {
  id                    String    @id @default(cuid())
  username              String    @unique
  email                 String    @unique
  password              String
  role                  users_role @default(user)
  isTemporaryPassword   Boolean   @default(true)
  password_reset_token  String?   @unique
  is_active             Boolean   @default(true)
  last_login            DateTime?
  created_at            DateTime  @default(now())
  updated_at            DateTime  @updatedAt
  // Relations to other models
}
```
### Applications Model
```
model applications {
  id                      String                  @id @default(cuid())
  // Personal Information
  full_name               String
  gender                  applications_gender
  date_of_birth           DateTime
  marital_status          applications_marital_status
  nationality             String
  // Contact Information
  email                   String
  phone                   String
  address                 String
  city                    String
  state                   String?
  postal_code             String?
  country                 String
  // Family Information
  father_name             String
  father_occupation       String?
  father_contact          String?
  mother_name             String
  mother_occupation       String?
  mother_contact          String?
  guardian_name           String?
  guardian_relation       String?
  guardian_contact        String?
  // Program Information
  program_id              String
  program_name            String
  intake                  String
  // Application Status
  status                  applications_status     @default(pending)
  // Agreements
  terms_agreed            Boolean                 @default(false)
  privacy_policy_agreed   Boolean                 @default(false)
  // Admin/Audit Fields
  ip_address              String?
  user_agent              String?
  created_at              DateTime                @default(now())
  updated_at              DateTime                @updatedAt
  // Relations
  education_records       education_records[]
  application_documents   application_documents[]
  status_history          application_status_history[]
  user                    users?                  @relation(fields: [user_id], references: [id])
  user_id                 String?
}
```
### Other Content Models
- education_records: Educational background of applicants
- application_documents: Documents uploaded by applicants
- application_status_history: History of application status changes
- posts: Blog posts and news articles
- pages: Static website pages
- events: College events and activities
- faculty: Faculty member profiles
- galleries: Photo galleries
- gallery_items: Individual items in galleries
- media: Uploaded media files
- notices: College notices and announcements
- partners: Partner organizations
- programs: Academic programs offered
- testimonials: Student testimonials
- settings: System settings and configurations
- contact_inquiries: Contact form submissions
## API Endpoints
### Authentication
- POST /api/auth/login - User login
- POST /api/auth/register - User registration (admin only)
- POST /api/auth/refresh-token - Refresh access token
- POST /api/auth/logout - User logout
- POST /api/auth/reset-password - Request password reset
- POST /api/auth/reset-password/:token - Reset password with token
- POST /api/auth/change-password - Change password (authenticated)
### Applications
- POST /api/applications - Submit new application
- GET /api/applications - List all applications (admin)
- GET /api/applications/:id - Get application details
- PUT /api/applications/:id - Update application
- PATCH /api/applications/:id/status - Update application status
- POST /api/applications/:id/documents - Upload application documents
### Content Management
- Posts, Pages, Events, Faculty, Galleries, Notices, Partners, Programs, Testimonials
  - Each follows RESTful conventions with CRUD operations
  - Example: GET /api/posts, POST /api/posts, GET /api/posts/:id, etc.
### Media
- POST /api/media - Upload media files
- GET /api/media - List all media
- GET /api/media/:id - Get media details
- DELETE /api/media/:id - Delete media
### Settings
- GET /api/settings - Get all settings
- GET /api/settings/:key - Get setting by key
- PUT /api/settings/:key - Update setting
### Contact
- POST /api/contact - Submit contact inquiry
- GET /api/contact - List all inquiries (admin)
- GET /api/contact/:id - Get inquiry details
- PUT /api/contact/:id/respond - Respond to inquiry
## Authentication Flow
The application uses JWT (JSON Web Tokens) for authentication:

1. Login Process:
   - User provides username/email and password
   - Server validates credentials
   - Server generates access token and refresh token
   - Tokens are set as HTTP-only cookies
   - Refresh token is stored in Redis for validation
2. Token Validation:
   - Access token is validated on protected routes
   - If expired, client can use refresh token to get a new access token
   - Refresh tokens are validated against Redis storage
3. Middleware:
   - protectRoute: Ensures route is accessible only to authenticated users
   - checkAdmin: Ensures route is accessible only to admin users
## File Upload Handling
The application uses Multer for handling file uploads:

1. Files are stored in the uploads/ directory
2. Subdirectories are created based on entity type (e.g., programs, faculty, etc.)
3. Further subdirectories categorize by file type (e.g., featured_images, brochures, etc.)
4. File metadata is stored in the database via the media model
## Error Handling
The API uses consistent error response formats:

- HTTP status codes indicate the type of error
- Response body includes:
  - success: Boolean indicating success/failure
  - message: Human-readable error message
  - errors: Detailed validation errors (when applicable)
## Environment Variables
| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | Yes |
| PORT | Server port | No (default: 5000) |
| NODE_ENV | Environment (development/production) | No (default: development) |
| JWT_SECRET | Secret for signing access tokens | Yes |
| JWT_REFRESH_SECRET | Secret for signing refresh tokens | Yes |
| JWT_EXPIRES_IN | Access token expiration time | No (default: 1h) |
| JWT_REFRESH_EXPIRES_IN | Refresh token expiration time | No (default: 7d) |
| UPSTASH_REDIS_URL | Redis connection string | Yes |
| BREVO_API_KEY | Brevo (SendinBlue) API key for emails | Yes |
| FRONTEND_URL | Frontend application URL | Yes |

## Guidelines for AI Integration with Frontend
When integrating with the frontend, consider the following:

### API Structure
- All endpoints follow RESTful conventions
- Base URL: /api/{resource}
- Authentication required for most endpoints (except public content)
- Responses are JSON with consistent structure
### Data Models
- Review the Prisma schema for complete data models
- Use TypeScript interfaces that match the backend models
- Pay attention to enums for fields with predefined values
### Authentication
- Use HTTP-only cookies for token storage
- Implement token refresh mechanism
- Handle authentication state in frontend
### File Uploads
- Use multipart/form-data for file uploads
- Follow entity-specific upload paths
- Handle file size limits and validation
### Error Handling
- Check for success field in responses
- Display appropriate error messages to users
- Implement form validation matching backend requirements
### Example Requests
Login Request:
```
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'user@example.com', password: 'password' }),
  credentials: 'include' // Important for cookies
});
```
Protected Request:
```
const response = await fetch('/api/applications', {
  method: 'GET',
  credentials: 'include' // Important for cookies
});

// Handle token expiration
if (response.status === 401) {
  // Try to refresh token
  const refreshResponse = await fetch('/api/auth/refresh-token', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (refreshResponse.ok) {
    // Retry original request
  } else {
    // Redirect to login
  }
}
```
### Pagination and Filtering
- List endpoints support pagination with page and limit query parameters
- Filtering options vary by resource
- Sort options typically use sort_by and sort_order parameters
### Real-time Considerations
- The API is primarily RESTful and doesn't include WebSocket endpoints
- For real-time features, consider implementing polling or adding Socket.io
### Testing
- Use the development environment for testing
- Create test accounts with different roles
- Test file uploads with various file types and sizes
### Security Best Practices
- Never store tokens in localStorage
- Implement proper CSRF protection
- Validate all user inputs
- Use HTTPS in production
- Implement rate limiting for sensitive endpoints