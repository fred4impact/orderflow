pipeline {
    agent any

    tools {
        nodejs 'node-18'
    }

    environment {
        APP_NAME = 'order-ui'
        DOCKER_IMAGE = "orderflow-frontend:${BUILD_NUMBER}"
    }

    stages {

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Unit Tests') {
            steps {
                sh 'npm test -- --ci --coverage'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'coverage/**', fingerprint: true
                }
            }
        }

        stage('Build Frontend') {
            steps {
                sh 'npm run build'
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build -t $DOCKER_IMAGE .'
            }
        }

        stage('Image Scan - Trivy') {
            steps {
                sh """
                  docker run --rm \
                  -v /var/run/docker.sock:/var/run/docker.sock \
                  aquasec/trivy image \
                  --severity CRITICAL,HIGH \
                  --exit-code 1 \
                  $DOCKER_IMAGE
                """
            }
        }

        stage('Smoke Test') {
            steps {
                sh """
                  docker run -d -p 3000:80 --name ui-test $DOCKER_IMAGE
                  sleep 10
                  curl -f http://localhost:3000
                """
            }
            post {
                always {
                    sh 'docker rm -f ui-test || true'
                }
            }
        }
    }

    post {
        success {
            echo "✅ Frontend DevSecOps Pipeline Passed"
        }
        failure {
            echo "❌ Frontend DevSecOps Pipeline Failed"
        }
    }
}
