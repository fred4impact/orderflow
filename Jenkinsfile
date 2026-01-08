pipeline {
    agent any
    
    environment {
        JAVA_HOME = '/usr/lib/jvm/java-17-openjdk'
        MAVEN_HOME = '/usr/share/maven'
        PATH = "${MAVEN_HOME}/bin:${JAVA_HOME}/bin:${PATH}"
        DOCKER_IMAGE = "order-service:${env.BUILD_NUMBER}"
        DOCKER_REGISTRY = "${env.DOCKER_REGISTRY ?: 'localhost:5000'}"
        SONAR_TOKEN = credentials('sonar-token')
        SONAR_HOST_URL = "${env.SONAR_HOST_URL ?: 'http://localhost:9000'}"
        SLACK_WEBHOOK = credentials('slack-webhook-url')
    }
    
    tools {
        maven 'Maven-3.9'
        jdk 'JDK-17'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: 'git rev-parse --short HEAD',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Build & Unit Test') {
            steps {
                sh '''
                    echo "Building application with Maven..."
                    mvn clean compile test
                '''
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                    archiveArtifacts artifacts: 'target/*.jar', allowEmptyArchive: true
                }
            }
        }
        
        stage('Code Coverage') {
            steps {
                sh '''
                    echo "Running JaCoCo code coverage analysis..."
                    mvn jacoco:report
                '''
            }
            post {
                always {
                    publishHTML([
                        reportDir: 'target/site/jacoco',
                        reportFiles: 'index.html',
                        reportName: 'JaCoCo Code Coverage Report',
                        keepAll: true
                    ])
                    archiveArtifacts artifacts: 'target/site/jacoco/**/*', allowEmptyArchive: true
                }
            }
        }
        
        stage('SCA - Software Composition Analysis') {
            steps {
                sh '''
                    echo "Running OWASP Dependency-Check for SCA..."
                    mvn org.owasp:dependency-check-maven:check
                '''
            }
            post {
                always {
                    archiveArtifacts artifacts: 'target/dependency-check-report.html', allowEmptyArchive: true
                    publishHTML([
                        reportDir: 'target',
                        reportFiles: 'dependency-check-report.html',
                        reportName: 'OWASP Dependency Check Report',
                        keepAll: true
                    ])
                }
            }
        }
        
        stage('SAST - Static Application Security Testing') {
            steps {
                script {
                    sh '''
                        echo "Running SonarQube SAST analysis..."
                        mvn sonar:sonar \
                            -Dsonar.projectKey=order-service \
                            -Dsonar.sources=src/main \
                            -Dsonar.tests=src/test \
                            -Dsonar.java.binaries=target/classes \
                            -Dsonar.coverage.jacoco.xmlReportPaths=target/site/jacoco/jacoco.xml \
                            -Dsonar.host.url=${SONAR_HOST_URL} \
                            -Dsonar.login=${SONAR_TOKEN}
                    '''
                }
            }
        }
        
        stage('Quality Gates') {
            steps {
                script {
                    echo "Checking SonarQube Quality Gates..."
                    timeout(time: 5, unit: 'MINUTES') {
                        def qualityGate = waitForQualityGate()
                        if (qualityGate.status != 'OK') {
                            error "Quality Gate failed: ${qualityGate.status}"
                        }
                    }
                }
            }
        }
        
        stage('Build Image') {
            steps {
                script {
                    echo "Building Docker image..."
                    sh """
                        docker build -t ${DOCKER_IMAGE} .
                        docker tag ${DOCKER_IMAGE} ${DOCKER_REGISTRY}/${DOCKER_IMAGE}
                    """
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'Dockerfile', allowEmptyArchive: true
                }
            }
        }
        
        stage('Scan Image') {
            steps {
                script {
                    echo "Scanning Docker image with Aqua Trivy..."
                    sh """
                        # Install Trivy if not available
                        if ! command -v trivy &> /dev/null; then
                            echo "Installing Trivy..."
                            wget -qO - https://aquasecurity.github.io/trivy-repo/deb/public.key | sudo apt-key add -
                            echo "deb https://aquasecurity.github.io/trivy-repo/deb $(lsb_release -sc) main" | sudo tee -a /etc/apt/sources.list.d/trivy.list
                            sudo apt-get update
                            sudo apt-get install -y trivy
                        fi
                        
                        # Scan the image
                        trivy image --exit-code 0 --severity HIGH,CRITICAL --format template --template "@contrib/gitlab.tpl" -o trivy-report.html ${DOCKER_IMAGE}
                        trivy image --exit-code 1 --severity CRITICAL ${DOCKER_IMAGE}
                    """
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.html', allowEmptyArchive: true
                    publishHTML([
                        reportDir: '.',
                        reportFiles: 'trivy-report.html',
                        reportName: 'Trivy Security Scan Report',
                        keepAll: true
                    ])
                }
            }
        }
        
        stage('Smoke Test') {
            steps {
                script {
                    echo "Running smoke tests..."
                    sh """
                        # Start the container
                        docker run -d --name order-service-test -p 8081:8080 ${DOCKER_IMAGE}
                        
                        # Wait for service to be ready
                        sleep 30
                        
                        # Run smoke tests
                        echo "Testing health endpoint..."
                        curl -f http://localhost:8081/actuator/health || exit 1
                        
                        echo "Testing API endpoint..."
                        curl -f http://localhost:8081/api/v1/orders || exit 1
                        
                        # Cleanup
                        docker stop order-service-test || true
                        docker rm order-service-test || true
                    """
                }
            }
        }
        
        stage('Push Image') {
            when {
                anyOf {
                    branch 'main'
                    branch 'master'
                }
            }
            steps {
                script {
                    echo "Pushing Docker image to registry..."
                    sh """
                        docker push ${DOCKER_REGISTRY}/${DOCKER_IMAGE}
                        docker tag ${DOCKER_IMAGE} ${DOCKER_REGISTRY}/order-service:latest
                        docker push ${DOCKER_REGISTRY}/order-service:latest
                    """
                }
            }
        }
    }
    
    post {
        always {
            script {
                // Cleanup Docker images
                sh """
                    docker rmi ${DOCKER_IMAGE} || true
                    docker rmi ${DOCKER_REGISTRY}/${DOCKER_IMAGE} || true
                """
            }
        }
        success {
            script {
                echo "Pipeline succeeded!"
                // Send success notification
                sh """
                    curl -X POST -H 'Content-type: application/json' \
                    --data '{\"text\":\"✅ Pipeline SUCCESS: Order Service Build #${env.BUILD_NUMBER}\"}' \
                    ${SLACK_WEBHOOK} || true
                """
            }
        }
        failure {
            script {
                echo "Pipeline failed!"
                // Send failure notification
                sh """
                    curl -X POST -H 'Content-type: application/json' \
                    --data '{\"text\":\"❌ Pipeline FAILED: Order Service Build #${env.BUILD_NUMBER}\"}' \
                    ${SLACK_WEBHOOK} || true
                """
            }
        }
        unstable {
            script {
                echo "Pipeline unstable!"
            }
        }
    }
}














