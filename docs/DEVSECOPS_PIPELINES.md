# DevSecOps Pipelines Documentation

This document describes the Production Grade DevSecOps Build Pipelines implemented for the Order Service application.

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











