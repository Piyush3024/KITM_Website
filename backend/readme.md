# KITM Backend API
## Introduction
This is the backend API for the KITM (Kantipur Institute of Technology and Management) website. It provides a comprehensive set of endpoints for managing the college website content, student applications, user authentication, and more.

## Project Structure
```
├── controllers/       # Business logic 
for handling requests
├── lib/               # Utility 
functions and configurations
├── middleware/        # Express 
middleware functions
├── prisma/            # Database 
schema and migrations
├── routes/            # API route 
definitions
├── uploads/           # File storage 
for uploaded content
└── server.js          # Main 
application entry point
```
## Getting Started
### Prerequisites
- Node.js (v14 or higher)
- MySQL database
- Redis server (for token storage)
### Installation
1. Clone the repository
```
git clone <https://github.com/Piyush3024/KITM_Website.git>
cd kitm-backend
```
2. Install dependencies
```
npm install
```
3. Set up environment variables
   Create a .env file in the root directory with the following variables:
```
DATABASE_URL="mysql://
username:password@localhost:5432/
kitm_db"
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
npx prisma migrate dev
```
5. Seed the database (optional)
```
npx prisma db seed
```
6. Start the development server
```
npm run dev
```
## Database Schema
The application uses Prisma ORM with MySQL. Here's an overview of the main models:

### Users Model
```
model users {
  id                     Int        @id @default(autoincrement()) @db.UnsignedInt
  username               String     @unique(map: "username") @db.VarChar(50)
  email                  String     @unique(map: "User_email_key") @db.VarChar(100)
  password               String     @db.VarChar(255)
  role                   users_role @default(author)
  isTemporaryPassword    Boolean    @default(false)
  password_reset_token   String?    @db.Text
  password_reset_expires DateTime?
  is_active              Boolean    @default(true)
  last_login             DateTime?  @db.Timestamp(0)
  created_at             DateTime   @default(now()) @db.Timestamp(0)
  updated_at             DateTime   @default(now()) @db.Timestamp(0)

  events_events_created_byTousers events[]       @relation("events_created_byTousers")
  events_events_updated_byTousers events[]       @relation("events_updated_byTousers")
  galleries                       galleries[]
  media                           media[]
  notices                         notices[]
  pages_pages_created_byTousers   pages[]        @relation("pages_created_byTousers")
  pages_pages_updated_byTousers   pages[]        @relation("pages_updated_byTousers")
  posts                           posts[]
  testimonials                    testimonials[]

  reviewed_applications applications[]               @relation("applications_reviewed_by")
  verified_documents    application_documents[]      @relation("document_verified_by")
  status_changes        application_status_history[] @relation("status_changed_by")

  @@index([role, is_active], map: "idx_role_active")
}
```
### Applications Model
```
model applications {
  id                 Int    @id @default(autoincrement()) @db.UnsignedInt
  application_number String @unique(map: "application_number") @db.VarChar(20)

  // Personal Information
  full_name      String                       @db.VarChar(100)
  date_of_birth  DateTime                     @db.Date
  gender         applications_gender
  nationality    String?                      @default("Nepali") @db.VarChar(50)
  religion       String?                      @db.VarChar(50)
  blood_group    String?                      @db.VarChar(5)
  marital_status applications_marital_status? @default(single)

  // Contact Information
  phone             String  @db.VarChar(20)
  email             String  @db.VarChar(100)
  permanent_address String  @db.Text
  temporary_address String? @db.Text

  // Family Information
  father_name  String? @db.VarChar(100)
  father_phone String? @db.VarChar(20)
  mother_name  String? @db.VarChar(100)
  mother_phone String? @db.VarChar(20)

  // Program Information
  program_applied String @db.VarChar(50)

  // Application Status & Process
  status                   applications_status? @default(draft)
  entrance_test_rollNumber String?              @db.VarChar(20)
  entrance_test_date       DateTime?            @db.Date
  entrance_test_score      Decimal?             @db.Decimal(5, 2)

  // Agreements
  declaration_agreed Boolean @default(false)
  terms_agreed       Boolean @default(false)

  // Admin Fields
  admin_notes      String?   @db.Text
  rejection_reason String?   @db.Text
  reviewed_by      Int?      @db.UnsignedInt
  reviewed_at      DateTime? @db.Timestamp(0)

  // Audit Fields
  created_at DateTime  @default(now()) @db.Timestamp(0)
  deleted_at DateTime? @db.Timestamp(0)

  // Relations
  education_records education_records[]
  documents         application_documents[]
  status_history    application_status_history[]
  reviewer          users?                       @relation("applications_reviewed_by", fields: [reviewed_by], references: [id])

  @@index([created_at(sort: Desc)], map: "idx_created_at")
  @@index([email], map: "idx_email")
  @@index([phone], map: "idx_phone")
  @@index([status, program_applied], map: "idx_status_program")
  @@index([deleted_at], map: "idx_deleted_at")
}
```
### Other Content Models
- education_records : Educational background of applicants
- application_documents : Documents uploaded by applicants
- application_status_history : History of application status changes
- posts : Blog posts and news articles
- pages : Static website pages
- events : College events and activities
- faculty : Faculty member profiles
- galleries : Photo galleries
- gallery_items : Individual items in galleries
- media : Uploaded media files
- notices : College notices and announcements
- partners : Partner organizations
- programs : Academic programs offered
- testimonials : Student testimonials
- settings : System settings and configurations
- contact_inquiries : Contact form submissions
## API Endpoints
### Authentication
- POST /api/auth/login - User login
- POST /api/auth/register - User registration (admin only)
- POST /api/auth/refresh-token - Refresh access token
- POST /api/auth/logout - User logout
- POST /api/auth/setPassword - Request password reset
- POST /api/auth/reset-password/:token - Reset password with token
- POST /api/auth/forgot - forgot password 
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
  - Example: GET /api/posts , POST /api/posts , GET /api/posts/:id , etc.
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

1. Login Process :
   
   - User provides username/email and password
   - Server validates credentials
   - Server generates access token and refresh token
   - Tokens are set as HTTP-only cookies
   - Refresh token is stored in Redis for validation
2. Token Validation :
   
   - Access token is validated on protected routes
   - If expired, client can use refresh token to get a new access token
   - Refresh tokens are validated against Redis storage
3. Middleware :
   
   - protectRoute : Ensures route is accessible only to authenticated users
   - checkAdmin : Ensures route is accessible only to admin users
## File Upload Handling
The application uses Multer for handling file uploads:

1. Files are stored in the uploads/ directory
2. Subdirectories are created based on entity type (e.g., programs , faculty , etc.)
3. Further subdirectories categorize by file type (e.g., featured_images , brochures , etc.)
4. File metadata is stored in the database via the media model
## Error Handling
The API uses consistent error response formats:

- HTTP status codes indicate the type of error
- Response body includes:
  - success : Boolean indicating success/failure
  - message : Human-readable error message
  - errors : Detailed validation errors (when applicable)
## Environment Variables
Variable Description Required DATABASE_URL PostgreSQL connection string Yes PORT Server port No (default: 5000) NODE_ENV Environment (development/production) No (default: development) JWT_SECRET Secret for signing access tokens Yes JWT_REFRESH_SECRET Secret for signing refresh tokens Yes JWT_EXPIRES_IN Access token expiration time No (default: 1h) JWT_REFRESH_EXPIRES_IN Refresh token expiration time No (default: 7d) UPSTASH_REDIS_URL Redis connection string Yes BREVO_API_KEY Brevo (SendinBlue) API key for emails Yes FRONTEND_URL Frontend application URL Yes

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
const response = await fetch('/api/auth/
login', {
  method: 'POST',
  headers: { 'Content-Type': 
  'application/json' },
  body: JSON.stringify({ email: 
  'user@example.com', password: 
  'password' }),
  credentials: 'include' // Important 
  for cookies
});
```
Protected Request:

```
const response = await fetch('/api/
applications', {
  method: 'GET',
  credentials: 'include' // Important 
  for cookies
});

// Handle token expiration
if (response.status === 401) {
  // Try to refresh token
  const refreshResponse = await fetch('/
  api/auth/refresh-token', {
    method: 'POST',
    credentials: 'include'
  });
  
  if (refreshResponse.ok) {
    // Retry original request
  } else {
    // Redirect to login
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