#!/bin/bash
# Test script to verify ingress is working

echo "Testing ingress with correct Host header..."
echo ""

# Test 1: With Host header (should work)
echo "1. Testing with Host header:"
curl -v -H "Host: orderflow.local" http://44.210.23.194:31641/
echo ""
echo ""

# Test 2: Direct IP without Host header (will get 404)
echo "2. Testing without Host header (will fail):"
curl -v http://44.210.23.194:31641/
echo ""
echo ""

# Test 3: Backend API
echo "3. Testing backend API:"
curl -H "Host: orderflow.local" http://44.210.23.194:31641/api/actuator/health
echo ""
