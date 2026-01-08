# Order Service Frontend

A modern React + TypeScript + Vite frontend application for the Order Management System.

## Features

- ✅ Create new orders with multiple items
- ✅ View orders by account ID
- ✅ View detailed order information
- ✅ Cancel orders (when allowed)
- ✅ Update order status
- ✅ Beautiful, responsive UI with Tailwind CSS
- ✅ Type-safe API integration with TypeScript
- ✅ React Query for efficient data fetching and caching

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **React Query (TanStack Query)** - Data fetching and state management
- **Axios** - HTTP client
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **Tailwind CSS** - Utility-first CSS framework

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Order Service backend running on `http://localhost:8080`

## Installation

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

The Vite dev server is configured to proxy API requests to `http://localhost:8080`, so you don't need to worry about CORS issues during development.

## Building for Production

Build the application:

```bash
npm run build
```

The production build will be in the `dist` directory.

Preview the production build:

```bash
npm run preview
```

## Environment Variables

Create a `.env` file in the frontend directory (optional):

```env
VITE_API_URL=http://localhost:8080/api/v1
```

If not set, it defaults to `http://localhost:8080/api/v1`.

## Project Structure

```
frontend/
├── src/
│   ├── api/           # API client and React Query hooks
│   ├── components/    # Reusable React components
│   ├── pages/         # Page components
│   ├── types/         # TypeScript type definitions
│   ├── utils/         # Utility functions
│   ├── App.tsx        # Main App component
│   └── main.tsx       # Application entry point
├── public/            # Static assets
├── index.html         # HTML template
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── vite.config.ts     # Vite configuration
└── tailwind.config.js # Tailwind CSS configuration
```

## API Integration

The frontend communicates with the Order Service backend through REST API endpoints:

- `POST /api/v1/orders` - Create a new order
- `GET /api/v1/orders/{id}` - Get order by ID
- `GET /api/v1/orders/account/{accountId}` - Get orders by account
- `POST /api/v1/orders/{id}/cancel` - Cancel an order
- `PUT /api/v1/orders/{id}/status?status={status}` - Update order status

## CORS Configuration

If you encounter CORS issues, make sure the Spring Boot backend has CORS configured. You can add this to your Spring Boot configuration:

```java
@Configuration
public class CorsConfig {
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:3000")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true);
            }
        };
    }
}
```

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, Vite will automatically try the next available port.

### API Connection Issues
- Ensure the backend service is running on `http://localhost:8080`
- Check browser console for CORS errors
- Verify the API URL in `.env` or `vite.config.ts`

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## License

Apache 2.0














