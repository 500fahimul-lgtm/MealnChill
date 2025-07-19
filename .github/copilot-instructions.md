<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# MealNChill - Meal Management System

This is a comprehensive web-based meal management system built with Next.js, TypeScript, and MongoDB. The application provides authentication, mess management, and meal planning features.

## Technology Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with Express-style handlers
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based authentication with bcryptjs
- **Styling**: Tailwind CSS with custom color schemes

## Project Structure

- `/src/app` - Next.js app router pages and API routes
- `/src/components` - Reusable React components
- `/src/models` - Mongoose database models
- `/src/lib` - Utility functions and configurations
- `/src/types` - TypeScript type definitions

## Key Features

1. **Authentication Module**:

   - User registration with validation
   - User login with JWT tokens
   - Protected routes and middleware

2. **Mess Management**:

   - Create new mess facilities
   - Join existing mess with codes
   - Admin and member roles

3. **Dashboard System**:
   - Universal dashboard for all users
   - Role-based access control
   - Quick stats and overview

## Development Guidelines

- Follow Next.js 15 best practices with App Router
- Use TypeScript for type safety
- Implement proper error handling and validation
- Follow REST API conventions for backend routes
- Use Tailwind CSS for consistent styling
- Implement proper authentication middleware
- Use MongoDB aggregation pipelines for complex queries

## Environment Variables

Required environment variables in `.env.local`:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token signing
- `NODE_ENV` - Environment (development/production)
