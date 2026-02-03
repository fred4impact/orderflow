Branch Strategy for Order Service DevSecOps Pipeline
Overview

This document defines the branching model and how branches are used in the CI/CD pipeline, GitHub Actions, Argo CD deployment, and testing strategy for the Order Service.

on:
  push:
    branches:
      - main
      - develop
      - 'release/*'
      - 'feature/*'
      - 'test/regression'
      - 'test/smoke'


The strategy ensures:

Clear separation of development, testing, and production

Continuous integration with security and quality checks

GitOps deployment via Argo CD

Automated smoke and regression testing

Manual approval gates for production

Branch Types
Branch	Purpose	CI/CD Behavior	Deployment / Environment
feature/*	New feature development	Run unit tests, SCA, SAST, code coverage	None (local / feature testing only)
develop	Integration branch	Run full CI pipeline: build, unit test, SCA, SAST, coverage, Docker build, Trivy scan	Deploy to integration namespace in EKS via Argo CD; smoke tests executed
release/*	Pre-production release	Full CI pipeline + Docker build	Deploy to pre-production namespace; regression tests executed
hotfix/*	Critical fixes	Full CI pipeline	Immediate deployment to production namespace after approval
main / master	Production	Optional sanity CI	Deploy to production namespace; Argo CD auto-syncs
test/smoke	Smoke testing branch	Trigger smoke tests only	Smoke namespace in EKS
test/regression	Regression testing branch	Trigger full regression suite	Regression namespace in EKS
CI/CD Stage Mapping
CI/CD Stage	Feature Branch	Develop	Release	Hotfix	Main	Test/Smoke	Test/Regression
Build & Unit Test	✅	✅	✅	✅	✅	✅	✅
Code Coverage	⚪	✅	✅	✅	✅	⚪	✅
SCA (OWASP Dependency Check)	✅	✅	✅	✅	✅	⚪	✅
SAST (SpotBugs + SonarQube)	✅	✅	✅	✅	✅	⚪	✅
Quality Gate	⚪	✅	✅	✅	✅	⚪	✅
Docker Build	⚪	✅	✅	✅	✅	⚪	✅
Trivy Image Scan	⚪	✅	✅	✅	✅	⚪	✅
Smoke Test	⚪	✅	✅	✅	⚪	✅	⚪
Regression Test	⚪	⚪	✅	⚪	⚪	⚪	✅

Legend:
✅ = Runs / Required
⚪ = Not applicable

Deployment Flow
1. Feature Development

Developers work on feature/* branches

Run local/unit tests and SCA/SAST checks

Early feedback on code quality

2. Integration / Develop

Merge feature/* → develop

GitHub Actions triggers full CI pipeline

Deploy to integration namespace via Argo CD

Execute smoke tests automatically

3. Release / Regression

Merge develop → release/*

GitHub Actions triggers full CI + Docker build

Deploy to pre-production namespace

Run full regression suite

After QA approval → merge to main for production

4. Production / Main

Merge release/* → main

Optional sanity checks via CI

Deploy to production namespace

Argo CD auto-sync ensures reproducible deployment

Prometheus & Grafana monitor all production services

Testing Branches
Smoke Testing (test/smoke)

Minimal environment to verify application health

Endpoints: /actuator/health, /api/status

Deployed to smoke namespace in EKS

Regression Testing (test/regression)

Full regression suite covering API, integration, and E2E tests

Deployed to regression namespace

Validates entire release candidate before production

Manual Approval Gates

Before Docker build for release or hotfix branches, manual approval is required

Implemented using GitHub Actions environments

Ensures compliance and reduces risk in production deployments

CI/CD Integration Summary

Feature Branches: Early code validation

Develop: Integration and smoke testing

Release / Regression: Pre-production validation

Main: Production deployment

Test Branches: Targeted smoke/regression verification

Argo CD & Helm: Automates deployments per namespace

Prometheus / Grafana: Monitors services in all environments

This strategy ensures secure, reliable, and observable CI/CD + GitOps deployment while enabling parallel testing, manual approval, and automated monitoring.