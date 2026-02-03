# DevSecOps Pipelines Documentation

This document describes the Production Grade DevSecOps Build Pipelines implemented for the Order Service application.

## 🚀 Installing Jenkins on AWS EC2

This section provides step-by-step instructions to install and configure Jenkins on an AWS EC2 instance.

### Prerequisites

- AWS Account with EC2 access
- Basic knowledge of AWS EC2, Security Groups, and IAM
- SSH client for connecting to EC2 instance

### Step 1: Launch EC2 Instance

1. **Log in to AWS Console** and navigate to EC2 Dashboard

2. **Launch Instance**:
   - Click "Launch Instance"
   - **Name**: `jenkins-server` (or your preferred name)
   - **AMI**: Amazon Linux 2023 (or Ubuntu 22.04 LTS)
   - **Instance Type**: `t3.medium` (minimum recommended) or `t3.large` for better performance
   - **Key Pair**: Select existing or create new key pair for SSH access
   - **Network Settings**: 
     - Create new security group or select existing
     - **Inbound Rules**:
       - SSH (22) from your IP
       - Custom TCP (8080) from your IP or 0.0.0.0/0 (for Jenkins web UI)
   - **Storage**: 20 GB gp3 (minimum recommended)
   - Click "Launch Instance"

3. **Wait for Instance** to be in "Running" state

4. **Note the Public IP** or Public DNS name

### Step 2: Connect to EC2 Instance

```bash
# Connect via SSH (replace with your key and IP)
ssh -i /path/to/your-key.pem ec2-user@<PUBLIC_IP>

# For Ubuntu instances, use:
ssh -i /path/to/your-key.pem ubuntu@<PUBLIC_IP>
```

### Step 3: Install Java (Required for Jenkins)

**For Amazon Linux 2023:**
```bash
# Update system packages
sudo dnf update -y

# Install Java 17 (Jenkins LTS requires Java 11 or 17)
sudo dnf install java-17-amazon-corretto -y

# Verify installation
java -version
```

**For Ubuntu 22.04:**
```bash
# Update system packages
sudo apt update -y

# Install Java 17
sudo apt install openjdk-17-jdk -y

# Verify installation
java -version
```

### Step 4: Install Jenkins

**For Amazon Linux 2023:**
```bash
# Add Jenkins repository
sudo wget -O /etc/yum.repos.d/jenkins.repo \
    https://pkg.jenkins.io/redhat-stable/jenkins.repo

# Import Jenkins GPG key
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key

# Install Jenkins
sudo dnf install jenkins -y

# Start Jenkins service
sudo systemctl start jenkins

# Enable Jenkins to start on boot
sudo systemctl enable jenkins

# Check Jenkins status
sudo systemctl status jenkins
```

**For Ubuntu 22.04:**
```bash
# Add Jenkins repository key
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
    /usr/share/keyrings/jenkins-keyring.asc > /dev/null

# Add Jenkins repository
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
    https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
    /etc/apt/sources.list.d/jenkins.list > /dev/null

# Update package list
sudo apt-get update -y

# Install Jenkins
sudo apt-get install jenkins -y

# Start Jenkins service
sudo systemctl start jenkins

# Enable Jenkins to start on boot
sudo systemctl enable jenkins

# Check Jenkins status
sudo systemctl status jenkins
```

### Step 5: Get Initial Admin Password

```bash
# Retrieve the initial admin password
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

**Copy this password** - you'll need it in the next step.

### Step 6: Access Jenkins Web UI

1. **Open browser** and navigate to:
   ```
   http://<PUBLIC_IP>:8080
   ```
   or
   ```
   http://<PUBLIC_DNS>:8080
   ```

2. **Unlock Jenkins**:
   - Paste the initial admin password from Step 5
   - Click "Continue"

3. **Install Suggested Plugins**:
   - Click "Install suggested plugins"
   - Wait for installation to complete

4. **Create Admin User**:
   - Enter username, password, full name, and email
   - Click "Save and Continue"

5. **Configure Jenkins URL**:
   - Use default: `http://<PUBLIC_IP>:8080`
   - Or configure custom domain if available
   - Click "Save and Finish"

6. **Jenkins is Ready!**
   - Click "Start using Jenkins"

### Step 7: Install Additional Tools (Optional but Recommended)

**Install Git:**
```bash
# Amazon Linux 2023
sudo dnf install git -y

# Ubuntu 22.04
sudo apt install git -y
```

**Install Docker (for containerized builds):**
```bash
# Amazon Linux 2023
sudo dnf install docker -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker jenkins
sudo usermod -aG docker ec2-user

# Ubuntu 22.04
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker jenkins
sudo usermod -aG docker ubuntu
```

**Install Maven (if not using Maven wrapper):**
```bash
# Amazon Linux 2023
sudo dnf install maven -y

# Ubuntu 22.04
sudo apt install maven -y
```

**Restart Jenkins after adding Docker group:**
```bash
sudo systemctl restart jenkins
```

### Step 8: Configure Security Group (If Needed)

If Jenkins web UI is not accessible:

1. Go to **EC2 Dashboard** → **Security Groups**
2. Select your Jenkins security group
3. **Edit Inbound Rules**:
   - Add rule: Type: `Custom TCP`, Port: `8080`, Source: `Your IP` or `0.0.0.0/0`
4. **Save rules**

### Step 9: Configure Jenkins for Production Use

1. **Install Required Plugins** (via Jenkins UI):
   - Navigate to: **Manage Jenkins** → **Plugins** → **Available plugins**
   - Install:
     - Pipeline
     - Docker Pipeline
     - HTML Publisher
     - JUnit
     - SonarQube Scanner
     - Slack Notification
     - Blue Ocean (optional, for better UI)

2. **Configure Global Tools**:
   - Navigate to: **Manage Jenkins** → **Tools**
   - Configure:
     - **JDK**: Add JDK 17 (point to `/usr/lib/jvm/java-17-amazon-corretto` or `/usr/lib/jvm/java-17-openjdk-amd64`)
     - **Maven**: Add Maven 3.9+ (or use system Maven)
     - **Git**: Use system Git

3. **Configure Credentials**:
   - Navigate to: **Manage Jenkins** → **Credentials** → **System** → **Global credentials**
   - Add credentials for:
     - SonarQube token
     - Docker registry
     - Slack webhook (if using)
     - Git repository (if private)

### Step 10: Set Up Reverse Proxy (Optional but Recommended)

For production, use Nginx as reverse proxy:

```bash
# Install Nginx
# Amazon Linux 2023
sudo dnf install nginx -y

# Ubuntu 22.04
sudo apt install nginx -y

# Configure Nginx
sudo nano /etc/nginx/conf.d/jenkins.conf
```

Add the following configuration:
```nginx
upstream jenkins {
    server 127.0.0.1:8080 fail_timeout=0;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_set_header        Host $host:$server_port;
        proxy_set_header        X-Real-IP $remote_addr;
        proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header        X-Forwarded-Proto $scheme;
        proxy_pass              http://jenkins;
        proxy_read_timeout      90;
        proxy_redirect          http://jenkins http://your-domain.com;
    }
}
```

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Update security group to allow port 80
```

### Step 11: Configure Jenkins URL (If Using Reverse Proxy)

1. Navigate to: **Manage Jenkins** → **Configure System**
2. Update **Jenkins URL** to: `http://your-domain.com` or `http://<PUBLIC_IP>`
3. Click **Save**

### Troubleshooting Jenkins Installation

1. **Jenkins service not starting**:
   ```bash
   # Check logs
   sudo journalctl -u jenkins -f
   
   # Check if port 8080 is in use
   sudo netstat -tlnp | grep 8080
   ```

2. **Cannot access Jenkins web UI**:
   - Verify security group allows port 8080
   - Check if Jenkins is running: `sudo systemctl status jenkins`
   - Verify firewall rules

3. **Permission issues with Docker**:
   ```bash
   # Add user to docker group
   sudo usermod -aG docker jenkins
   sudo systemctl restart jenkins
   ```

4. **Out of memory errors**:
   - Increase EC2 instance size
   - Configure Jenkins JVM options: `/etc/default/jenkins` or `/etc/sysconfig/jenkins`
   - Add: `JENKINS_JAVA_OPTIONS="-Xmx2048m -Xms512m"`

### Security Best Practices

1. **Use HTTPS**: Set up SSL certificate (Let's Encrypt) with Nginx
2. **Restrict Access**: Limit security group to specific IPs
3. **Regular Updates**: Keep Jenkins and plugins updated
4. **Backup**: Regularly backup `/var/lib/jenkins` directory
5. **Use IAM Roles**: Attach IAM role to EC2 instance instead of storing AWS credentials

### Backup Jenkins Configuration

```bash
# Create backup script
sudo nano /usr/local/bin/backup-jenkins.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/jenkins"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/jenkins-backup-$DATE.tar.gz /var/lib/jenkins
# Keep only last 7 days of backups
find $BACKUP_DIR -name "jenkins-backup-*.tar.gz" -mtime +7 -delete
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/backup-jenkins.sh

# Add to crontab for daily backups
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-jenkins.sh
```

---

## 🔍 Installing SonarQube Community Edition on AWS EC2 (Docker)

This section provides step-by-step instructions to install and configure SonarQube Community Edition using Docker on an AWS EC2 instance. This approach uses Docker Compose to run both PostgreSQL and SonarQube in containers, making installation and management much simpler.

### Prerequisites

- AWS Account with EC2 access
- Basic knowledge of AWS EC2, Security Groups, and Docker
- SSH client for connecting to EC2 instance
- Docker and Docker Compose installed (instructions included)

### Step 1: Launch EC2 Instance

1. **Log in to AWS Console** and navigate to EC2 Dashboard

2. **Launch Instance**:
   - Click "Launch Instance"
   - **Name**: `sonarqube-server` (or your preferred name)
   - **AMI**: Amazon Linux 2023 (or Ubuntu 22.04 LTS)
   - **Instance Type**: `t3.medium` (minimum) or `t3.large`/`t3.xlarge` (recommended for better performance)
   - **Key Pair**: Select existing or create new key pair for SSH access
   - **Network Settings**: 
     - Create new security group or select existing
     - **Inbound Rules**:
       - SSH (22) from your IP
       - Custom TCP (9000) from your IP or 0.0.0.0/0 (for SonarQube web UI)
   - **Storage**: 30 GB gp3 (minimum recommended, SonarQube needs space for analysis data)
   - Click "Launch Instance"

3. **Wait for Instance** to be in "Running" state

4. **Note the Public IP** or Public DNS name

### Step 2: Connect to EC2 Instance

```bash
# Connect via SSH (replace with your key and IP)
ssh -i /path/to/your-key.pem ec2-user@<PUBLIC_IP>

# For Ubuntu instances, use:
ssh -i /path/to/your-key.pem ubuntu@<PUBLIC_IP>
```

### Step 3: Install Docker and Docker Compose

**For Amazon Linux 2023:**
```bash
# Update system packages
sudo dnf update -y

# Install Docker
sudo dnf install docker -y

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (to run docker without sudo)
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Log out and log back in for group changes to take effect
# Or run: newgrp docker
```

**For Ubuntu 22.04:**
```bash
# Update system packages
sudo apt update -y

# Install prerequisites
sudo apt install ca-certificates curl gnupg lsb-release -y

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update -y
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group
sudo usermod -aG docker ubuntu

# Verify installations
docker --version
docker compose version

# Log out and log back in for group changes to take effect
# Or run: newgrp docker
```

**Note**: For Ubuntu, Docker Compose is included as a plugin (`docker compose`), not a separate binary.

### Step 4: Configure System Limits

SonarQube requires certain system limits to be increased:

```bash
# Edit sysctl configuration
sudo nano /etc/sysctl.d/99-sonarqube.conf
```

**Add the following:**
```
vm.max_map_count=524288
fs.file-max=131072
```

**Apply changes:**
```bash
sudo sysctl -p /etc/sysctl.d/99-sonarqube.conf
```

**For Ubuntu, you can also add to `/etc/sysctl.conf`:**
```bash
sudo nano /etc/sysctl.conf
# Add the same values at the end
sudo sysctl -p
```

### Step 5: Create Docker Compose Configuration

Create a directory for SonarQube:

```bash
# Create directory
mkdir -p ~/sonarqube
cd ~/sonarqube

# Create docker-compose.yml file
nano docker-compose.yml
```

**Add the following Docker Compose configuration:**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: sonarqube-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: sonar
      POSTGRES_PASSWORD: sonar_password_change_me
      POSTGRES_DB: sonar
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - sonarqube-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sonar"]
      interval: 10s
      timeout: 5s
      retries: 5

  sonarqube:
    image: sonarqube:10.3-community
    container_name: sonarqube
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SONAR_JDBC_URL: jdbc:postgresql://postgres:5432/sonar
      SONAR_JDBC_USERNAME: sonar
      SONAR_JDBC_PASSWORD: sonar_password_change_me
      SONAR_ES_BOOTSTRAP_CHECKS_DISABLE: true
    volumes:
      - sonarqube_data:/opt/sonarqube/data
      - sonarqube_extensions:/opt/sonarqube/extensions
      - sonarqube_logs:/opt/sonarqube/logs
    ports:
      - "9000:9000"
    networks:
      - sonarqube-network
    ulimits:
      nproc: 4096
      nofile:
        soft: 65536
        hard: 65536

volumes:
  postgres_data:
  sonarqube_data:
  sonarqube_extensions:
  sonarqube_logs:

networks:
  sonarqube-network:
    driver: bridge
```

**Important**: Replace `sonar_password_change_me` with a strong password in both places (PostgreSQL and SonarQube environment variables).

**Save and exit** (Ctrl+X, then Y, then Enter)

### Step 6: Start SonarQube with Docker Compose

```bash
# Make sure you're in the sonarqube directory
cd ~/sonarqube

# Start services in detached mode
docker compose up -d

# Check status of containers
docker compose ps

# View logs (wait for SonarQube to be operational)
docker compose logs -f sonarqube
```

**Wait until you see**: `SonarQube is operational` in the logs (this may take 2-5 minutes).

**Note**: For Ubuntu with Docker Compose plugin, use `docker compose` instead of `docker-compose`.

### Step 7: Configure Security Group

1. Go to **EC2 Dashboard** → **Security Groups**
2. Select your SonarQube security group
3. **Edit Inbound Rules**:
   - Add rule: Type: `Custom TCP`, Port: `9000`, Source: `Your IP` or `0.0.0.0/0`
4. **Save rules**

### Step 8: Access SonarQube Web UI

1. **Open browser** and navigate to:
   ```
   http://<PUBLIC_IP>:9000
   ```
   or
   ```
   http://<PUBLIC_DNS>:9000
   ```

2. **Initial Login**:
   - Default username: `admin`
   - Default password: `admin`
   - You will be prompted to change the password on first login

3. **Change Password**:
   - Enter new password (save it securely)
   - Click "Update"

4. **Skip Tutorial** (optional):
   - Click "Skip this tutorial" if you want to configure later

### Step 9: Create SonarQube Project and Token

1. **Create Project**:
   - Click "Create Project" → "Manually"
   - **Project Key**: `order-service` (or your project name)
   - **Display Name**: `Order Service`
   - Click "Set Up"

2. **Generate Token**:
   - Select "Generate a token"
   - **Token Name**: `jenkins-token` (or any name)
   - Click "Generate"
   - **Copy the token immediately** - you won't be able to see it again!
   - Save this token for Jenkins configuration

3. **Select Analysis Method**:
   - Choose "With Maven" or "With Jenkins" based on your pipeline
   - Follow the instructions provided

### Step 10: Configure Quality Gates (Optional)

1. Navigate to: **Quality Gates** → **Create**
2. Set thresholds for:
   - **Coverage**: Minimum 50% (adjust as needed)
   - **Duplicated Lines**: Maximum 3%
   - **Code Smells**: Set appropriate threshold
   - **Security Hotspots**: Set appropriate threshold
   - **Maintainability Rating**: A
   - **Reliability Rating**: A
   - **Security Rating**: A

3. **Set as Default** (optional):
   - Click on your quality gate → "Set as Default"

### Step 11: Useful Docker Commands

```bash
# View running containers
docker compose ps

# View logs
docker compose logs -f sonarqube
docker compose logs -f postgres

# Stop services
docker compose stop

# Start services
docker compose start

# Restart services
docker compose restart

# Stop and remove containers (data volumes are preserved)
docker compose down

# Stop and remove containers with volumes (WARNING: deletes all data)
docker compose down -v

# Update SonarQube to latest version
docker compose pull sonarqube
docker compose up -d sonarqube
```

### Step 12: Set Up Reverse Proxy (Optional but Recommended)

For production, use Nginx as reverse proxy:

```bash
# Install Nginx
# Amazon Linux 2023
sudo dnf install nginx -y

# Ubuntu 22.04
sudo apt install nginx -y

# Configure Nginx
sudo nano /etc/nginx/conf.d/sonarqube.conf
```

**Add the following configuration:**
```nginx
upstream sonarqube {
    server 127.0.0.1:9000 fail_timeout=0;
}

server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_set_header        Host $host:$server_port;
        proxy_set_header        X-Real-IP $remote_addr;
        proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header        X-Forwarded-Proto $scheme;
        proxy_pass              http://sonarqube;
        proxy_read_timeout      300;
        proxy_connect_timeout   300;
        proxy_redirect          http://sonarqube http://your-domain.com;
    }
}
```

```bash
# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Update security group to allow port 80
```

### Troubleshooting SonarQube Docker Installation

1. **Containers fail to start**:
   ```bash
   # Check container logs
   docker compose logs sonarqube
   docker compose logs postgres
   
   # Check container status
   docker compose ps
   
   # Check if port 9000 is in use
   sudo netstat -tlnp | grep 9000
   ```

2. **Database connection errors**:
   - Verify PostgreSQL container is running: `docker compose ps postgres`
   - Check database credentials in `docker-compose.yml`
   - View PostgreSQL logs: `docker compose logs postgres`
   - Test connection: `docker compose exec postgres psql -U sonar -d sonar`

3. **Cannot access SonarQube web UI**:
   - Verify security group allows port 9000
   - Check if containers are running: `docker compose ps`
   - Check firewall rules
   - Verify SonarQube container logs: `docker compose logs sonarqube`

4. **Out of memory errors**:
   - Increase EC2 instance size
   - Edit `docker-compose.yml` and add memory limits or adjust JVM options
   - Add to sonarqube service:
     ```yaml
     environment:
       SONAR_WEB_JAVAOPTS: "-Xmx1024m -Xms512m"
     ```

5. **Elasticsearch errors**:
   - Check system limits (vm.max_map_count) - already configured in Step 4
   - Verify file descriptors limit
   - Check disk space: `df -h`

6. **Permission errors with volumes**:
   ```bash
   # Fix volume permissions
   sudo chown -R 999:999 ~/sonarqube/postgres_data
   sudo chown -R 999:999 ~/sonarqube/sonarqube_data
   ```

7. **Container keeps restarting**:
   ```bash
   # Check logs for errors
   docker compose logs --tail=100 sonarqube
   
   # Check system resources
   docker stats
   ```

### Security Best Practices

1. **Use HTTPS**: Set up SSL certificate (Let's Encrypt) with Nginx
2. **Restrict Access**: Limit security group to specific IPs
3. **Strong Passwords**: Use strong passwords in `docker-compose.yml` for database
4. **Regular Updates**: Keep Docker images updated
   ```bash
   docker compose pull
   docker compose up -d
   ```
5. **Backup**: Regularly backup Docker volumes
6. **Firewall**: Use AWS Security Groups to restrict access
7. **Environment Variables**: Consider using `.env` file for sensitive data instead of hardcoding in `docker-compose.yml`

### Using Environment File for Secrets

Create a `.env` file for better security:

```bash
cd ~/sonarqube
nano .env
```

**Add:**
```
POSTGRES_USER=sonar
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=sonar
SONAR_JDBC_USERNAME=sonar
SONAR_JDBC_PASSWORD=your_secure_password_here
```

**Update `docker-compose.yml` to use environment variables:**
```yaml
services:
  postgres:
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
  
  sonarqube:
    environment:
      SONAR_JDBC_USERNAME: ${SONAR_JDBC_USERNAME}
      SONAR_JDBC_PASSWORD: ${SONAR_JDBC_PASSWORD}
```

**Protect the .env file:**
```bash
chmod 600 .env
```

### Backup SonarQube Docker Volumes

**Create backup script:**
```bash
nano ~/sonarqube/backup.sh
```

**Add the following:**
```bash
#!/bin/bash
BACKUP_DIR="/backup/sonarqube"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup PostgreSQL data
docker compose exec -T postgres pg_dump -U sonar sonar > $BACKUP_DIR/sonar-db-backup-$DATE.sql

# Backup SonarQube volumes
docker run --rm -v sonarqube_sonarqube_data:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/sonarqube-data-backup-$DATE.tar.gz -C /data .
docker run --rm -v sonarqube_sonarqube_extensions:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/sonarqube-extensions-backup-$DATE.tar.gz -C /data .

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR"
```

```bash
# Make executable
chmod +x ~/sonarqube/backup.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /home/ec2-user/sonarqube/backup.sh
# For Ubuntu: 0 2 * * * /home/ubuntu/sonarqube/backup.sh
```

### Performance Tuning

For better performance, adjust JVM settings in `docker-compose.yml`:

```yaml
sonarqube:
  environment:
    # For t3.medium (2 vCPU, 4GB RAM)
    SONAR_WEB_JAVAOPTS: "-Xmx1536m -Xms512m -XX:+HeapDumpOnOutOfMemoryError"
    
    # For t3.large (2 vCPU, 8GB RAM)
    # SONAR_WEB_JAVAOPTS: "-Xmx3072m -Xms1024m -XX:+HeapDumpOnOutOfMemoryError"
    
    # For t3.xlarge (4 vCPU, 16GB RAM)
    # SONAR_WEB_JAVAOPTS: "-Xmx6144m -Xms2048m -XX:+HeapDumpOnOutOfMemoryError"
```

**After making changes:**
```bash
docker compose up -d sonarqube
```

### Auto-start on System Reboot

To ensure SonarQube starts automatically after system reboot, Docker Compose will handle this with `restart: unless-stopped` policy. However, you can also create a systemd service:

```bash
sudo nano /etc/systemd/system/sonarqube-docker.service
```

**Add:**
```ini
[Unit]
Description=SonarQube Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ec2-user/sonarqube
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
User=ec2-user

[Install]
WantedBy=multi-user.target
```

**For Ubuntu, adjust paths:**
```ini
WorkingDirectory=/home/ubuntu/sonarqube
User=ubuntu
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
```

**Enable the service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable sonarqube-docker.service
sudo systemctl start sonarqube-docker.service
```

---

## 📋 Pipeline Stages

All pipelines follow the same stages as shown in the diagram:

1. **Build & Unit Test** - Maven build and unit test execution
2. **Code Coverage** - JaCoCo code coverage analysis
3. **SCA** - Software Composition Analysis (OWASP Dependency-Check)
4. **SAST** - Static Application Security Testing (SonarQube)
5. **Quality Gates** - SonarQube quality gate validation
6. **Build Image** - Docker image build
7. **Scan Image** - Container security scanning (Aqua Trivy)
8. **Smoke Test** - Basic health and API endpoint tests
9. **Notification** - Pipeline status notifications

## 🔧 Prerequisites

### Common Requirements
- Java 17 JDK
- Maven 3.9+
- Docker
- SonarQube Server (for SAST and Quality Gates)
- Container Registry (Docker Hub, GitHub Container Registry, GitLab Registry, etc.)

### Tools Required
- **JaCoCo** - Code coverage (configured in `pom.xml`)
- **OWASP Dependency-Check** - SCA tool (configured in `pom.xml`)
- **SonarQube** - SAST and Quality Gates
- **Aqua Trivy** - Container image scanning
- **Slack** (optional) - For notifications

## 📁 Pipeline Files

### 1. Jenkinsfile (Jenkins Pipeline)

**Location**: `/Jenkinsfile`

**Features**:
- Declarative Jenkins pipeline
- Parallel stage execution where possible
- Artifact archiving
- HTML report publishing
- Docker image building and scanning
- Slack notifications

**Setup Instructions**:

1. **Install Required Jenkins Plugins**:
   - Pipeline
   - Docker Pipeline
   - HTML Publisher
   - JUnit
   - SonarQube Scanner
   - Slack Notification

2. **Configure Jenkins Credentials**:
   - `sonar-token` - SonarQube authentication token
   - `slack-webhook-url` - Slack webhook URL for notifications
   - Docker registry credentials (if needed)

3. **Configure Jenkins Global Tools**:
   - Maven 3.9 (name: `Maven-3.9`)
   - JDK 17 (name: `JDK-17`)

4. **Set Environment Variables** (in Jenkins):
   - `DOCKER_REGISTRY` - Docker registry URL (default: `localhost:5000`)
   - `SONAR_HOST_URL` - SonarQube server URL (default: `http://localhost:9000`)

5. **Create Pipeline Job**:
   - New Item → Pipeline
   - Pipeline definition: Pipeline script from SCM
   - SCM: Git
   - Repository URL: Your Git repository URL
   - Script Path: `Jenkinsfile`

**Usage**:
```bash
# Pipeline will automatically trigger on:
# - Git push to main/master/develop branches
# - Manual trigger from Jenkins UI
```

### 2. GitLab CI Pipeline

**Location**: `/.gitlab-ci.yml`

**Features**:
- Multi-stage pipeline
- Maven dependency caching
- Coverage reporting
- Security scanning integration
- Docker-in-Docker support
- GitLab Container Registry integration

**Setup Instructions**:

1. **Configure GitLab CI/CD Variables** (Settings → CI/CD → Variables):
   - `SONAR_TOKEN` - SonarQube authentication token
   - `SONAR_HOST_URL` - SonarQube server URL
   - `SLACK_WEBHOOK_URL` - Slack webhook URL (optional)

2. **Enable Container Registry**:
   - Settings → General → Visibility, project features, permissions
   - Enable Container Registry

3. **Configure GitLab Runner**:
   - Ensure Docker executor is available
   - Docker-in-Docker service enabled

**Usage**:
```bash
# Pipeline automatically triggers on:
# - Push to main/master/develop branches
# - Merge requests to main/master/develop
```

### 3. GitHub Actions Pipeline

**Location**: `/.github/workflows/devsecops.yml`

**Features**:
- GitHub Actions workflow
- Matrix builds support
- GitHub Container Registry integration
- Security scanning with SARIF upload
- Codecov integration
- PR comments with pipeline status

**Setup Instructions**:

1. **Configure GitHub Secrets** (Settings → Secrets and variables → Actions):
   - `SONAR_TOKEN` - SonarQube authentication token
   - `SONAR_HOST_URL` - SonarQube server URL
   - `SLACK_WEBHOOK_URL` - Slack webhook URL (optional)

2. **Enable GitHub Container Registry**:
   - Automatically available for all repositories
   - Images will be published to `ghcr.io/<username>/<repo>/order-service`

3. **Enable Security Scanning**:
   - Settings → Security → Code security and analysis
   - Enable "Dependabot alerts" and "Code scanning"

**Usage**:
```bash
# Pipeline automatically triggers on:
# - Push to main/master/develop branches
# - Pull requests to main/master/develop
```

## 🔐 Security Configuration

### SonarQube Setup

1. **Create Project in SonarQube**:
   - Project Key: `order-service` (or match your repository name)
   - Generate authentication token

2. **Configure Quality Gates**:
   - Set minimum coverage threshold (default: 50%)
   - Configure code smell thresholds
   - Set security hotspot rules

### OWASP Dependency-Check

The OWASP Dependency-Check plugin is configured in `pom.xml`. It will:
- Scan all Maven dependencies for known vulnerabilities
- Generate HTML and JSON reports
- Fail build on critical vulnerabilities (configurable)

### Aqua Trivy

Trivy scans Docker images for:
- OS package vulnerabilities
- Application dependencies
- Misconfigurations
- Secrets

## 📊 Reports and Artifacts

### Generated Reports

1. **JaCoCo Coverage Report**: `target/site/jacoco/index.html`
2. **OWASP Dependency-Check Report**: `target/dependency-check-report.html`
3. **SonarQube Report**: Available in SonarQube dashboard
4. **Trivy Scan Report**: `trivy-report.html`

### Artifacts

All pipelines archive:
- JAR files
- Test reports (JUnit XML)
- Coverage reports
- Security scan reports
- Docker images

## 🚀 Pipeline Execution

### Jenkins
```bash
# Manual trigger from Jenkins UI
# Or via Jenkins CLI:
java -jar jenkins-cli.jar -s http://jenkins-url build order-service-pipeline
```

### GitLab CI
```bash
# Automatic on push/merge request
# Manual trigger:
git push origin main
```

### GitHub Actions
```bash
# Automatic on push/pull request
# Manual trigger from Actions tab
# Or via GitHub CLI:
gh workflow run devsecops.yml
```

## 🔔 Notifications

All pipelines support Slack notifications. Configure the webhook URL in:
- **Jenkins**: Credentials → `slack-webhook-url`
- **GitLab**: CI/CD Variables → `SLACK_WEBHOOK_URL`
- **GitHub**: Secrets → `SLACK_WEBHOOK_URL`

## 🐛 Troubleshooting

### Common Issues

1. **SonarQube Connection Failed**:
   - Verify `SONAR_HOST_URL` and `SONAR_TOKEN`
   - Check network connectivity
   - Ensure SonarQube server is running

2. **Docker Build Fails**:
   - Check Docker daemon is running
   - Verify Dockerfile exists
   - Check Docker registry credentials

3. **Trivy Scan Fails**:
   - Ensure Docker image is built successfully
   - Check Trivy installation
   - Verify image is accessible

4. **Quality Gate Fails**:
   - Review SonarQube dashboard for issues
   - Adjust quality gate thresholds
   - Fix code quality issues

5. **Smoke Test Fails**:
   - Check service health endpoint
   - Verify database connectivity
   - Review application logs

## 📝 Customization

### Adjust Coverage Thresholds

Edit `pom.xml`:
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <configuration>
        <rules>
            <rule>
                <limit>
                    <counter>LINE</counter>
                    <value>COVEREDRATIO</value>
                    <minimum>0.70</minimum> <!-- Change threshold -->
                </limit>
            </rule>
        </rules>
    </configuration>
</plugin>
```

### Modify Quality Gates

1. Go to SonarQube dashboard
2. Quality Gates → Create/Edit
3. Set thresholds for:
   - Coverage
   - Duplicated lines
   - Code smells
   - Security hotspots

### Change Docker Registry

**Jenkins**:
```groovy
environment {
    DOCKER_REGISTRY = 'your-registry.com'
}
```

**GitLab**:
```yaml
variables:
  CI_REGISTRY: 'your-registry.com'
```

**GitHub**:
```yaml
env:
  REGISTRY: 'your-registry.com'
```

## 📚 Additional Resources

- [JaCoCo Documentation](https://www.jacoco.org/jacoco/trunk/doc/)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
- [SonarQube Documentation](https://docs.sonarqube.org/)
- [Aqua Trivy Documentation](https://aquasecurity.github.io/trivy/)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
- [GitLab CI/CD Documentation](https://docs.gitlab.com/ee/ci/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## ✅ Pipeline Checklist

Before running pipelines, ensure:

- [ ] SonarQube server is accessible
- [ ] SonarQube project is created and token generated
- [ ] Docker registry credentials are configured
- [ ] Slack webhook URL is set (optional)
- [ ] All required tools are installed
- [ ] Maven dependencies can be downloaded
- [ ] Docker daemon is running
- [ ] Network connectivity to all services

## 🎯 Best Practices

1. **Security**:
   - Never commit secrets to repositories
   - Use CI/CD secrets/variables for sensitive data
   - Regularly update dependencies
   - Review security scan reports

2. **Performance**:
   - Cache Maven dependencies
   - Use Docker layer caching
   - Parallelize stages where possible

3. **Reliability**:
   - Set appropriate timeouts
   - Implement retry logic for flaky tests
   - Monitor pipeline execution times

4. **Maintainability**:
   - Keep pipeline files version controlled
   - Document custom configurations
   - Review and update tools regularly

---

**Last Updated**: 2024
**Pipeline Version**: 1.0.0











