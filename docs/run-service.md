# Order Service - Configuration and Setup Guide

This document provides step-by-step instructions for configuring and running the Order Service, including Cursor IDE setup for Java development.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Configuration](#project-configuration)
3. [IDE Configuration](#ide-configuration)
   - [IntelliJ IDEA Setup](#intellij-idea-setup)
   - [Cursor IDE Configuration for Java](#cursor-ide-configuration-for-java)
4. [Running the Service](#running-the-service)
5. [Verification](#verification)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Java Development Kit (JDK) 17 or higher**
   ```bash
   # Check Java version
   java -version
   
   # If not installed, download from:
   # - macOS: brew install openjdk@17
   # - Linux: sudo apt-get install openjdk-17-jdk
   # - Windows: Download from Oracle or Adoptium
   ```

2. **Apache Maven 3.6+**
   ```bash
   # Check Maven version
   mvn -version
   
   # If not installed:
   # - macOS: brew install maven
   # - Linux: sudo apt-get install maven
   # - Windows: Download from https://maven.apache.org
   ```

3. **Docker and Docker Compose** (Optional, for containerized setup)
   ```bash
   # Check Docker version
   docker --version
   docker-compose --version
   ```

4. **PostgreSQL 12+** (Optional, if not using Docker)
   ```bash
   # Check PostgreSQL version
   psql --version
   ```

---

## Project Configuration

### Step 1: Clone/Navigate to Project

```bash
cd /Users/mac/Documents/DEVOPS-PORTFOLIOS/order-service-java
```

### Step 2: Verify Project Structure

Ensure you have the following structure:
```
order-service-java/
├── pom.xml
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── main/
│   │   ├── java/com/example/order/
│   │   └── resources/
│   └── test/
└── README.md
```

### Step 3: Configure Database (Choose One Option)

#### Option A: Use H2 In-Memory Database (Development - No Setup Required)
- No configuration needed
- Database is created automatically in memory
- Data is lost when application stops

#### Option B: Use PostgreSQL with Docker Compose
```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Wait for PostgreSQL to be ready (about 10 seconds)
sleep 10

# Create database schema
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE orderdb;"
psql -h localhost -U postgres -d orderdb -f src/main/resources/db/schema-postgres.sql
```

#### Option C: Use Local PostgreSQL Installation
```bash
# Create database
createdb orderdb

# Run schema script
psql -d orderdb -f src/main/resources/db/schema-postgres.sql
```

### Step 4: Configure Application Properties

Edit `src/main/resources/application.yml` if needed:

**For H2 (Development):**
```yaml
spring:
  profiles:
    active: dev
```

**For PostgreSQL:**
```yaml
spring:
  profiles:
    active: prod  # or remove to use default
  datasource:
    url: jdbc:postgresql://localhost:5432/orderdb
    username: postgres
    password: your_password
```

### Step 5: Build the Project

```bash
# Clean and build
mvn clean install

# Or skip tests
mvn clean install -DskipTests
```

---

## IDE Configuration

### IntelliJ IDEA Setup

IntelliJ IDEA provides excellent Java and Spring Boot support out of the box. Follow these steps to configure and run the Order Service.

#### Step 1: Open Project in IntelliJ IDEA

1. **Open IntelliJ IDEA**
2. **File → Open** (or `Cmd+O` on macOS, `Ctrl+O` on Windows/Linux)
3. Navigate to: `/Users/mac/Documents/DEVOPS-PORTFOLIOS/order-service-java`
4. Select the folder and click **OK**
5. IntelliJ will detect it as a Maven project automatically

#### Step 2: Configure JDK

1. **File → Project Structure** (or `Cmd+;` on macOS, `Ctrl+Alt+Shift+S` on Windows/Linux)
2. Go to **Project** section
3. Set **Project SDK** to **Java 17** (or higher)
   - If not listed, click **New** → **JDK** → Select your JDK installation path
4. Set **Project language level** to **17 - Sealed types, always-strict floating-point semantics**
5. Click **Apply** and **OK**

#### Step 3: Import Maven Project

1. IntelliJ should automatically detect the `pom.xml` file
2. If prompted, click **Import Maven Project**
3. Wait for Maven to download dependencies (check bottom-right progress bar)
4. If not auto-imported:
   - Right-click on `pom.xml` → **Maven → Reload Project**
   - Or: **View → Tool Windows → Maven** → Click refresh icon

#### Step 4: Configure Spring Boot Run Configuration

1. **Run → Edit Configurations** (or click dropdown next to Run button)
2. Click **+** → **Spring Boot**
3. Configure:
   - **Name**: `Order Service (Dev)`
   - **Main class**: `com.example.order.OrderServiceApplication`
   - **Active profiles**: `dev`
   - **Working directory**: `$PROJECT_DIR$`
4. Click **Apply** and **OK**

5. **Create Production Configuration** (optional):
   - Click **+** → **Spring Boot**
   - **Name**: `Order Service (Prod)`
   - **Main class**: `com.example.order.OrderServiceApplication`
   - **Active profiles**: `prod`
   - Click **Apply** and **OK**

#### Step 5: Enable Annotation Processing

1. **File → Settings** (or `Cmd+,` on macOS, `Ctrl+Alt+S` on Windows/Linux)
2. Navigate to: **Build, Execution, Deployment → Compiler → Annotation Processors**
3. Check **Enable annotation processing**
4. Click **Apply** and **OK**

This is required for Lombok and MapStruct to work properly.

#### Step 6: Install Lombok Plugin (if not already installed)

1. **File → Settings → Plugins**
2. Search for **"Lombok"**
3. Install **Lombok** plugin by Michail Plushnikov
4. Restart IntelliJ when prompted

#### Step 7: Configure Code Style (Optional)

1. **File → Settings → Editor → Code Style → Java**
2. Import or configure your preferred code style
3. Recommended: Use **Google Java Style** or **IntelliJ Default**

#### Step 8: Run the Application

**Method 1: Using Run Configuration**
1. Select **Order Service (Dev)** from the run configuration dropdown (top-right)
2. Click **Run** button (green play icon) or press `Shift+F10`
3. Service will start on http://localhost:8080

**Method 2: Run from Main Class**
1. Open `OrderServiceApplication.java`
2. Click the green arrow next to `main` method
3. Select **Run 'OrderServiceApplication'**
4. Or right-click → **Run 'OrderServiceApplication.main()'**

**Method 3: Using Maven**
1. Open **Maven** tool window (View → Tool Windows → Maven)
2. Expand **order-service → Plugins → spring-boot**
3. Double-click **spring-boot:run**
4. Or run in terminal: `mvn spring-boot:run -Dspring-boot.run.profiles=dev`

#### Step 9: Debug the Application

1. Set breakpoints by clicking left margin in code editor
2. Select **Order Service (Dev)** from run configuration
3. Click **Debug** button (bug icon) or press `Shift+F9`
4. Application will pause at breakpoints
5. Use debug toolbar to step through code

#### Step 10: View Application Logs

1. **View → Tool Windows → Run** (or `Alt+4`)
2. Logs appear in the **Run** window at the bottom
3. Filter logs using search box
4. Right-click logs for copy/export options

#### IntelliJ IDEA Tips

- **Quick Actions**: `Alt+Enter` for quick fixes and suggestions
- **Navigate to Class**: `Cmd+O` (macOS) or `Ctrl+N` (Windows/Linux)
- **Find Usages**: `Alt+F7`
- **Refactor**: `Shift+F6` to rename
- **Generate Code**: `Cmd+N` (macOS) or `Alt+Insert` (Windows/Linux)
- **Reformat Code**: `Cmd+Alt+L` (macOS) or `Ctrl+Alt+L` (Windows/Linux)
- **Optimize Imports**: `Ctrl+Alt+O`

#### IntelliJ IDEA Run Configurations Summary

You should have these run configurations available:
- ✅ **Order Service (Dev)** - Runs with H2 in-memory database
- ✅ **Order Service (Prod)** - Runs with PostgreSQL
- ✅ **Debug Order Service** - Debug mode with breakpoints

---

## Cursor IDE Configuration for Java

### Step 1: Install Java Extension Pack

1. Open Cursor IDE
2. Press `Cmd+Shift+X` (macOS) or `Ctrl+Shift+X` (Windows/Linux) to open Extensions
3. Search for "Extension Pack for Java" by Microsoft
4. Click "Install"
5. This installs:
   - Language Support for Java by Red Hat
   - Debugger for Java
   - Test Runner for Java
   - Maven for Java
   - Project Manager for Java

### Step 2: Configure Java Home

1. Open Cursor Settings:
   - `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux)
   - Or: Cursor → Preferences → Settings

2. Search for "java.home"

3. Set Java Home path:
   ```json
   {
     "java.home": "/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home"
   }
   ```
   
   **Find your Java path:**
   ```bash
   # macOS/Linux
   /usr/libexec/java_home -V
   
   # Or check JAVA_HOME
   echo $JAVA_HOME
   ```

### Step 3: Configure Maven Settings

1. In Cursor Settings, search for "maven"

2. Configure Maven executable:
   ```json
   {
     "java.configuration.maven.userSettings": "~/.m2/settings.xml",
     "maven.executable.path": "/usr/local/bin/maven"
   }
   ```

3. Find Maven path:
   ```bash
   which mvn
   ```

### Step 4: Configure Java Formatting

1. Search for "java.format" in settings

2. Recommended settings:
   ```json
   {
     "java.format.settings.url": "",
     "java.format.settings.profile": "",
     "java.format.enabled": true,
     "editor.formatOnSave": true
   }
   ```

### Step 5: Configure Java Linting

1. Search for "java.errors" in settings

2. Enable error reporting:
   ```json
   {
     "java.errors.incompleteClasspath.severity": "warning",
     "java.configuration.updateBuildConfiguration": "automatic"
   }
   ```

### Step 6: Create Cursor Workspace Settings

Create `.vscode/settings.json` in project root:

```json
{
  "java.configuration.runtimes": [
    {
      "name": "JavaSE-17",
      "path": "/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home",
      "default": true
    }
  ],
  "java.compile.nullAnalysis.mode": "automatic",
  "java.configuration.maven.userSettings": null,
  "maven.executable.path": "mvn",
  "java.format.settings.url": null,
  "java.format.settings.profile": null,
  "files.exclude": {
    "**/target": true,
    "**/.classpath": true,
    "**/.project": true,
    "**/.settings": true,
    "**/.factorypath": true
  }
}
```

### Step 7: Create Launch Configuration for Running

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "java",
      "name": "Run Order Service (Dev Profile)",
      "request": "launch",
      "mainClass": "com.example.order.OrderServiceApplication",
      "projectName": "order-service",
      "args": "--spring.profiles.active=dev",
      "vmArgs": "-Dspring.profiles.active=dev"
    },
    {
      "type": "java",
      "name": "Run Order Service (Prod Profile)",
      "request": "launch",
      "mainClass": "com.example.order.OrderServiceApplication",
      "projectName": "order-service",
      "args": "--spring.profiles.active=prod",
      "vmArgs": "-Dspring.profiles.active=prod"
    },
    {
      "type": "java",
      "name": "Debug Order Service",
      "request": "launch",
      "mainClass": "com.example.order.OrderServiceApplication",
      "projectName": "order-service",
      "args": "--spring.profiles.active=dev"
    }
  ]
}
```

### Step 8: Create Tasks for Maven Commands

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "maven: clean install",
      "type": "shell",
      "command": "mvn",
      "args": ["clean", "install", "-DskipTests"],
      "group": {
        "kind": "build",
        "isDefault": true
      },
      "problemMatcher": []
    },
    {
      "label": "maven: clean compile",
      "type": "shell",
      "command": "mvn",
      "args": ["clean", "compile"],
      "group": "build",
      "problemMatcher": []
    },
    {
      "label": "maven: test",
      "type": "shell",
      "command": "mvn",
      "args": ["test"],
      "group": "test",
      "problemMatcher": []
    },
    {
      "label": "maven: spring-boot:run (dev)",
      "type": "shell",
      "command": "mvn",
      "args": ["spring-boot:run", "-Dspring-boot.run.profiles=dev"],
      "group": "build",
      "problemMatcher": []
    },
    {
      "label": "maven: spring-boot:run (prod)",
      "type": "shell",
      "command": "mvn",
      "args": ["spring-boot:run", "-Dspring-boot.run.profiles=prod"],
      "group": "build",
      "problemMatcher": []
    }
  ]
}
```

### Step 9: Reload Cursor Window

1. Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "Reload Window"
3. Select "Developer: Reload Window"

### Step 10: Verify Java Setup in Cursor

1. Open any Java file (e.g., `OrderServiceApplication.java`)
2. Check bottom-right status bar for Java version
3. You should see "Java 17" or similar
4. Hover over code - you should see IntelliSense suggestions
5. Right-click → "Run Java" should be available

---

## Running the Service

### Method 1: Using IntelliJ IDEA (Recommended)

1. **Using Run Configuration:**
   - Select **Order Service (Dev)** from dropdown (top-right)
   - Click **Run** button (green play icon) or press `Shift+F10`
   - Service starts on http://localhost:8080

2. **Using Main Class:**
   - Open `OrderServiceApplication.java`
   - Click green arrow next to `main` method
   - Select **Run 'OrderServiceApplication'**

3. **Using Maven Tool Window:**
   - **View → Tool Windows → Maven**
   - Expand **order-service → Plugins → spring-boot**
   - Double-click **spring-boot:run**

4. **Using Terminal in IntelliJ:**
   - **View → Tool Windows → Terminal** (or `` Alt+F12 ``)
   - Run: `mvn spring-boot:run -Dspring-boot.run.profiles=dev`

### Method 2: Using Cursor IDE

1. **Using Launch Configuration:**
   - Press `F5` or go to Run → Start Debugging
   - Select "Run Order Service (Dev Profile)" from dropdown
   - Service starts on http://localhost:8080

2. **Using Tasks:**
   - Press `Cmd+Shift+P` (macOS) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Tasks: Run Task"
   - Select "maven: spring-boot:run (dev)"

3. **Using Terminal in Cursor:**
   - Open integrated terminal: `` Ctrl+` ``
   - Run: `mvn spring-boot:run -Dspring-boot.run.profiles=dev`

### Method 3: Using Command Line

```bash
# Development mode (H2 database)
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Production mode (PostgreSQL)
mvn spring-boot:run -Dspring-boot.run.profiles=prod

# Or run the JAR directly
mvn clean package
java -jar target/order-service-1.0.0.jar --spring.profiles.active=dev
```

### Method 4: Using Docker

```bash
# Build Docker image
docker build -t order-service:1.0.0 .

# Run with Docker Compose (includes PostgreSQL)
docker-compose up

# Or run container manually
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_USERNAME=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=orderdb \
  order-service:1.0.0
```

---

## Verification

### 1. Check Application Health

```bash
# Health endpoint
curl http://localhost:8080/actuator/health

# Expected response:
# {"status":"UP"}
```

### 2. Access Swagger UI

Open in browser:
- **Swagger UI**: http://localhost:8080/swagger-ui.html
- **API Docs**: http://localhost:8080/api-docs

### 3. Test Create Order Endpoint

```bash
curl -X POST http://localhost:8080/api/v1/orders \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-123",
    "items": [
      {
        "productId": "prod-123",
        "quantity": 2,
        "price": 29.99
      }
    ],
    "shippingAddress": "123 Main St, City, State 12345",
    "paymentMethod": "pmt-456"
  }'
```

**Expected Response:**
```json
{
  "id": 1,
  "accountId": "acc-123",
  "items": [
    {
      "productId": "prod-123",
      "quantity": 2,
      "price": 29.99,
      "subtotal": 59.98
    }
  ],
  "totalAmount": 59.98,
  "shippingAddress": "123 Main St, City, State 12345",
  "paymentId": "pmt-456",
  "status": "PLACED",
  "createdAt": "2024-12-03T19:00:00",
  "updatedAt": "2024-12-03T19:00:00"
}
```

### 4. Test Get Order Endpoint

```bash
# Replace {id} with the order ID from previous response
curl http://localhost:8080/api/v1/orders/1
```

### 5. Check Logs

In Cursor terminal or application logs, you should see:
```
Started OrderServiceApplication in X.XXX seconds
```

---

## Troubleshooting

### Issue: Java Not Found in Cursor

**Solution:**
1. Verify Java is installed: `java -version`
2. Set `java.home` in Cursor settings
3. Reload Cursor window
4. Check status bar for Java version

### Issue: Maven Dependencies Not Resolving

**Solution:**
```bash
# Clean Maven cache
rm -rf ~/.m2/repository

# Rebuild
mvn clean install
```

### Issue: Port 8080 Already in Use

**Solution:**
```bash
# Find process using port 8080
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill process or change port in application.yml
server:
  port: 8081
```

### Issue: Database Connection Failed

**Solution:**
1. Verify PostgreSQL is running:
   ```bash
   docker-compose ps  # If using Docker
   pg_isready  # If using local PostgreSQL
   ```

2. Check database credentials in `application.yml`

3. Verify database exists:
   ```bash
   psql -U postgres -l | grep orderdb
   ```

### Issue: MapStruct Not Generating Mappers

**Solution:**
1. Clean and rebuild:
   ```bash
   mvn clean compile
   ```

2. Check `target/generated-sources/annotations` for generated files

3. Ensure Lombok and MapStruct processors are configured in `pom.xml`

### Issue: IntelliJ Not Recognizing Spring Boot

**Solution:**
1. **File → Project Structure → Facets**
2. Check if Spring facet is added
3. If not: **File → Add Framework Support** → Select **Spring**
4. Reload Maven project: Right-click `pom.xml` → **Maven → Reload Project**

### Issue: Lombok Not Working in IntelliJ

**Solution:**
1. Install Lombok plugin: **Settings → Plugins → Search "Lombok"**
2. Enable annotation processing: **Settings → Build → Compiler → Annotation Processors**
3. Check **Enable annotation processing**
4. Restart IntelliJ IDEA

### Issue: MapStruct Not Generating Code in IntelliJ

**Solution:**
1. Ensure annotation processing is enabled
2. Rebuild project: **Build → Rebuild Project**
3. Check `target/generated-sources/annotations` folder
4. Mark as generated source: Right-click folder → **Mark Directory as → Generated Sources Root**

### Issue: Cursor Not Recognizing Java Files

**Solution:**
1. Install "Extension Pack for Java"
2. Reload Cursor window
3. Open a Java file and wait for indexing
4. Check Output panel for Java language server logs

### Issue: Application Won't Start

**Solution:**
1. Check logs for errors
2. Verify all dependencies are downloaded:
   ```bash
   mvn dependency:resolve
   ```

3. Check Java version matches (must be 17+):
   ```bash
   java -version
   ```

4. Verify application.yml syntax is correct

---

## Quick Reference Commands

```bash
# Build project
mvn clean install

# Run with dev profile
mvn spring-boot:run -Dspring-boot.run.profiles=dev

# Run tests
mvn test

# Package JAR
mvn clean package

# Start PostgreSQL (Docker)
docker-compose up -d postgres

# View logs
docker-compose logs -f order-service

# Stop services
docker-compose down
```

---

## Next Steps

1. ✅ Service is running and accessible
2. ✅ Test all API endpoints via Swagger UI
3. ✅ Integrate with other microservices
4. ✅ Add authentication/authorization
5. ✅ Set up CI/CD pipeline
6. ✅ Add monitoring and logging

For more details, see [README.md](README.md)

