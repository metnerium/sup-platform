#!/bin/bash
###############################################################################
# Health Check Script for WebSocket Service
#
# Usage:
#   ./scripts/health-check.sh [host] [port]
#
# Examples:
#   ./scripts/health-check.sh
#   ./scripts/health-check.sh localhost 9091
#   ./scripts/health-check.sh ws.example.com 9091
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HOST=${1:-localhost}
PORT=${2:-9091}
HEALTH_URL="http://${HOST}:${PORT}/health"
READY_URL="http://${HOST}:${PORT}/ready"
METRICS_URL="http://${HOST}:${PORT}/metrics"

echo "=================================================="
echo "WebSocket Service Health Check"
echo "=================================================="
echo ""
echo "Target: ${HOST}:${PORT}"
echo ""

# Function to check endpoint
check_endpoint() {
    local url=$1
    local name=$2

    echo -n "Checking ${name}... "

    response=$(curl -s -w "\n%{http_code}" "${url}" 2>/dev/null || echo "000")
    http_code=$(echo "${response}" | tail -n1)
    body=$(echo "${response}" | head -n-1)

    if [ "${http_code}" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        if [ -n "${body}" ]; then
            echo "${body}" | jq '.' 2>/dev/null || echo "${body}"
        fi
        return 0
    else
        echo -e "${RED}✗ FAILED (HTTP ${http_code})${NC}"
        if [ -n "${body}" ]; then
            echo "${body}"
        fi
        return 1
    fi
}

# Check health endpoint
echo "=================================================="
echo "Health Status"
echo "=================================================="
check_endpoint "${HEALTH_URL}" "Health Endpoint"
health_status=$?
echo ""

# Check readiness endpoint
echo "=================================================="
echo "Readiness Status"
echo "=================================================="
check_endpoint "${READY_URL}" "Readiness Endpoint"
ready_status=$?
echo ""

# Check metrics endpoint
echo "=================================================="
echo "Metrics"
echo "=================================================="
check_endpoint "${METRICS_URL}" "Metrics Endpoint"
metrics_status=$?
echo ""

# Summary
echo "=================================================="
echo "Summary"
echo "=================================================="

if [ ${health_status} -eq 0 ] && [ ${ready_status} -eq 0 ]; then
    echo -e "${GREEN}✓ Service is healthy and ready${NC}"
    exit 0
elif [ ${health_status} -eq 0 ]; then
    echo -e "${YELLOW}⚠ Service is healthy but not ready${NC}"
    exit 1
else
    echo -e "${RED}✗ Service is unhealthy${NC}"
    exit 1
fi
