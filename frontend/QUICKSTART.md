# Quick Start Guide

## Prerequisites

1. **Backend Service Running**
   - Make sure the Order Service backend is running on `http://localhost:8080`
   - Start it with: `mvn spring-boot:run -Dspring-boot.run.profiles=dev`

2. **Node.js Installed**
   - Node.js 18+ required
   - Check with: `node --version`

## Setup Steps

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open browser**
   - The app will be available at `http://localhost:3000` (or the next available port)

## Testing the Application

### 1. Create an Order
- Navigate to "Create Order" from the home page
- Fill in:
  - Account ID: `acc-123`
  - Add items (Product ID, Quantity, Price)
  - Shipping Address
  - Payment Method (optional)
- Click "Create Order"

### 2. View Orders
- Navigate to "Orders" from the navigation
- Enter an Account ID (e.g., `acc-123`)
- Click "Search Orders"
- View the list of orders

### 3. View Order Details
- Click on any order card to view details
- You can:
  - See all order information
  - Update order status
  - Cancel order (if allowed)

## Troubleshooting

### CORS Errors
If you see CORS errors in the browser console:
- Make sure the backend CORS configuration is in place (see `CorsConfig.java`)
- Restart the backend service after adding CORS config

### Connection Refused
- Verify backend is running: `curl http://localhost:8080/actuator/health`
- Check backend logs for errors
- Ensure backend is on port 8080

### Port Already in Use
- Vite will automatically try the next available port
- Or change the port in `vite.config.ts`

## Next Steps

- Customize the UI styling in `tailwind.config.js`
- Add authentication when backend JWT is implemented
- Deploy to production (build with `npm run build`)














