#!/bin/bash

# Configuration
URL="http://localhost:8000"
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔥 Starting Smoke Test against $URL..."

# 1. Check Health
echo -n "Checking GET /health... "
CODE=$(curl -s -o /dev/null -w "%{http_code}" $URL/health)

if [ "$CODE" -eq 200 ]; then
    echo -e "${GREEN}PASS (200 OK)${NC}"
else
    echo -e "${RED}FAIL (Got $CODE)${NC}"
    echo "Is Docker running?"
    exit 1
fi

# 2. Check Auth (Validation Error for missing field vs Connection Refused)
echo -n "Checking POST /auth/google (Simulated)... "
# We expect 422 Unprocessable Entity (Missing Body/Token), NOT Connection Refused
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST $URL/auth/google)

if [ "$CODE" -eq 422 ]; then
    echo -e "${GREEN}PASS (422 - Service is alive and validating)${NC}"
else
    echo -e "${RED}FAIL (Got $CODE)${NC}"
    exit 1
fi

# 3. Check Chat (Missing Header)
echo -n "Checking POST /chat/ (Missing Keys)... "
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"message":"hi"}' $URL/chat/)

if [ "$CODE" -eq 422 ]; then
     echo -e "${GREEN}PASS (422 - Header Check Active)${NC}"
else
    echo -e "${RED}FAIL (Expected 422 for missing header, Got $CODE)${NC}"
    exit 1
fi

echo -e "\n✅ Smoke Test Complete. Docker Container is Healthy."
exit 0
