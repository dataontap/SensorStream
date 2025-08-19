# Real-Time Sensor Data Collection System

## Overview

This is a real-time sensor data collection and monitoring system that enables mobile devices to stream sensor data (accelerometer, magnetometer, orientation, light, air pressure) to a centralized dashboard. The system consists of a React frontend for both device registration/streaming and dashboard visualization, with an Express backend that handles WebSocket connections for real-time data transmission and stores sensor readings.

The application allows users to register their mobile devices as sensor nodes, stream live sensor data, and monitor multiple devices simultaneously through a comprehensive dashboard with real-time charts and device status indicators.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React with TypeScript**: Single-page application using React 18 with TypeScript for type safety
- **Wouter Router**: Lightweight client-side routing for navigation between dashboard and device pages
- **Shadcn/ui Components**: Modern UI component library built on Radix UI primitives with Tailwind CSS styling
- **TanStack Query**: Server state management for API calls with caching and background updates
- **Custom Hooks**: Modular sensor access (`useSensors`), WebSocket management (`useWebSocket`), and mobile detection

### Backend Architecture
- **Express.js Server**: RESTful API server with middleware for request logging and error handling
- **WebSocket Integration**: Real-time bidirectional communication using `ws` library for live sensor data streaming
- **Memory Storage**: In-memory data storage implementation with interface abstraction for future database integration
- **Vite Development Integration**: Hot module replacement and development server integration for seamless development experience

### Data Models
- **Device Schema**: Tracks device ID, name, user agent, connection status, battery level, and last seen timestamp
- **Sensor Reading Schema**: Stores timestamped sensor data including accelerometer, magnetometer, orientation, light level, and air pressure readings
- **Validation**: Zod schemas for runtime type validation and data integrity

### Real-Time Communication
- **WebSocket Server**: Dedicated WebSocket endpoint (`/ws`) for device registration and sensor data streaming
- **Client Connection Management**: Server maintains active client connections mapped by device ID
- **Broadcast System**: Real-time data distribution to all connected dashboard clients when new sensor readings arrive
- **Connection Status Tracking**: Automatic device status updates based on WebSocket connection state

### Sensor Integration
- **Device APIs**: Direct integration with browser device APIs (DeviceMotionEvent, DeviceOrientationEvent, Ambient Light Sensor, etc.)
- **Permission Management**: Proper handling of sensor permission requests for iOS/Android devices
- **Fingerprinting**: Unique device identification using canvas fingerprinting and device characteristics
- **Cross-Platform Support**: Responsive design and sensor compatibility across mobile browsers

### UI/UX Features
- **Real-Time Charts**: Custom canvas-based charts for live sensor data visualization
- **Device Management**: Visual device selector with connection status, battery level, and last seen indicators
- **Data Export**: CSV export functionality for collected sensor data
- **Toast Notifications**: User feedback system for device registration, connection status, and error handling
- **Responsive Design**: Mobile-first design with proper scaling for both device streaming and dashboard monitoring

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, ReactDOM, React Hook Form with Zod validation resolvers
- **TypeScript**: Full TypeScript support with strict type checking and modern ES modules
- **Vite**: Modern build tool with Hot Module Replacement and optimized production builds
- **Express.js**: Web framework for REST API and static file serving

### UI and Styling
- **Tailwind CSS**: Utility-first CSS framework with custom color variables and responsive design
- **Radix UI**: Headless UI component library for accessible and customizable components
- **Shadcn/ui**: Pre-built component system based on Radix UI with consistent styling
- **Lucide React**: Icon library for consistent iconography throughout the application

### Real-Time Communication
- **WebSocket (ws)**: WebSocket library for real-time bidirectional communication
- **TanStack React Query**: Server state management with intelligent caching and background synchronization

### Data Management
- **Drizzle ORM**: Type-safe ORM with PostgreSQL dialect configuration (prepared for future database integration)
- **Zod**: Runtime type validation and schema definition for both frontend and backend
- **Date-fns**: Date manipulation and formatting utilities

### Development Tools
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind and Autoprefixer plugins
- **TSX**: TypeScript execution for development server
- **Replit Integration**: Development environment integration with error overlay and cartographer plugins

### Database Integration (Configured)
- **PostgreSQL Support**: Drizzle configuration ready for Neon Database integration
- **Migration System**: Database migration support through Drizzle Kit
- **Connection Management**: Environment-based database URL configuration for seamless deployment