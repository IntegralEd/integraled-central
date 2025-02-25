#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== OpenAI API Authentication Test (v2) ===${NC}"

# Retrieve the API key
echo -e "${BLUE}Retrieving API key from confirmed parameter...${NC}"
API_KEY=$(aws ssm get-parameter \
  --name "/rag-bmore/prod/secrets/BmoreKeyOpenAi" \
  --with-decryption \
  --region us-east-2 \
  --query "Parameter.Value" \
  --output text)

if [ -z "$API_KEY" ]; then
  echo -e "${RED}❌ Failed to retrieve API key${NC}"
  exit 1
else
  echo -e "${GREEN}✅ Retrieved API key starting with: ${API_KEY:0:5}...${NC}"
fi

# Test the OpenAI API with just the API key - USING V2
echo -e "\n${BLUE}Testing API key with Assistants v2...${NC}"
response=$(curl -s -w "\n%{http_code}" https://api.openai.com/v1/threads \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -H "OpenAI-Beta: assistants=v2" \
  -d '{}')

# Extract status code and response body
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

# Check if successful
if [ "$status_code" -eq 200 ] || [ "$status_code" -eq 201 ]; then
  echo -e "${GREEN}✅ SUCCESS ($status_code)${NC}"
  echo -e "${GREEN}Response: $body${NC}"
  
  # If successful, extract the thread ID
  thread_id=$(echo $body | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo -e "${GREEN}Thread ID: $thread_id${NC}"
  
  # Now test adding a message to this thread
  echo -e "\n${BLUE}Testing adding a message to the thread...${NC}"
  message_response=$(curl -s -w "\n%{http_code}" "https://api.openai.com/v1/threads/$thread_id/messages" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "OpenAI-Beta: assistants=v2" \
    -d '{
      "role": "user",
      "content": "Hello, this is a test message"
    }')
    
  message_status=$(echo "$message_response" | tail -n1)
  message_body=$(echo "$message_response" | sed '$d')
  
  if [ "$message_status" -eq 200 ] || [ "$message_status" -eq 201 ]; then
    echo -e "${GREEN}✅ Message added successfully ($message_status)${NC}"
  else
    echo -e "${RED}❌ Failed to add message ($message_status)${NC}"
    echo -e "${RED}Error: $message_body${NC}"
  fi
else
  echo -e "${RED}❌ FAILED ($status_code)${NC}"
  echo -e "${RED}Error: $body${NC}"
  
  # If it failed, try with an empty metadata object
  echo -e "\n${BLUE}Trying with empty metadata...${NC}"
  response2=$(curl -s -w "\n%{http_code}" https://api.openai.com/v1/threads \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "OpenAI-Beta: assistants=v2" \
    -d '{"metadata":{}}')
    
  status_code2=$(echo "$response2" | tail -n1)
  body2=$(echo "$response2" | sed '$d')
  
  if [ "$status_code2" -eq 200 ] || [ "$status_code2" -eq 201 ]; then
    echo -e "${GREEN}✅ SUCCESS with metadata ($status_code2)${NC}"
    echo -e "${GREEN}Response: $body2${NC}"
  else
    echo -e "${RED}❌ FAILED with metadata ($status_code2)${NC}"
    echo -e "${RED}Error: $body2${NC}"
  fi
fi

echo -e "\n${BLUE}=== Test Complete ===${NC}"