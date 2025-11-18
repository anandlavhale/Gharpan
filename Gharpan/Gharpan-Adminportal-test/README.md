# Gharpan Admin Portal

A full-stack application for managing residents with separate frontend and backend services.

## Project Structure

```
/
├── frontend/          # React + Vite frontend application
│   ├── src/          # React components and source code
│   ├── public/       # Static assets
│   ├── package.json  # Frontend dependencies
│   └── vite.config.js # Vite configuration
├── backend/          # Node.js + Express backend API
│   ├── server.js     # Main server file
│   ├── uploads/      # File upload storage
│   └── package.json  # Backend dependencies
├── start-frontend.sh # Script to start frontend dev server
└── start-backend.sh  # Script to start backend server
```

## Quick Start

### Option 1: Using Start Scripts (Recommended)

1. **Start Backend Server:**
   ```bash
   ./start-backend.sh
   ```

2. **Start Frontend Development Server:**
   ```bash
   ./start-frontend.sh
   ```

### Option 2: Manual Start

1. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

## Servers

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

## Features

- ✅ Resident registration and management
- ✅ Search and filtering
- ✅ Excel export functionality
- ✅ File upload support
- ✅ No required fields - flexible form submission
- ✅ Responsive design

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/residents` - Get all residents (with pagination, search, filters)
- `GET /api/residents/export` - Export residents to Excel
- `GET /api/residents/:id` - Get single resident by ID
- `POST /api/residents` - Create new resident
- `PUT /api/residents/:id` - Update resident
- `DELETE /api/residents/:id` - Delete resident

## Development

- Frontend uses React + Vite with hot module replacement
- Backend uses Express.js with in-memory storage (can be configured for MongoDB)
- CORS enabled for frontend-backend communication
- File uploads handled with Multer
