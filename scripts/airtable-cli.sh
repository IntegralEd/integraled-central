#!/bin/bash

# Airtable CLI Tool

# Load config
CONFIG_FILE="config/airtable-config.json"
if [ ! -f "$CONFIG_FILE" ]; then
    echo "Config file not found!"
    exit 1
fi

# Function to get value from JSON config
get_config() {
    cat "$CONFIG_FILE" | jq -r "$1"
}

# Get API key and base ID
API_KEY=$(get_config '.airtable.api.key')
BASE_ID=$(get_config '.airtable.bases.main.id')
API_VERSION=$(get_config '.airtable.api.version')
ENDPOINT=$(get_config '.airtable.api.endpoint')

# Function to get table ID from config
get_table_id() {
    local table_name=$1
    # Search through all groups for the table
    for group in $(get_config '.airtable.bases.main.table_groups | keys[]'); do
        local id=$(get_config ".airtable.bases.main.table_groups.$group[\"$table_name\"]")
        if [ "$id" != "null" ] && [ -n "$id" ]; then
            echo "$id"
            return 0
        fi
    done
    # If not found in config, return the table name itself
    echo "$table_name"
}

# Basic API call function
call_api() {
    local method=$1
    local table_name=$2
    local data=$3
    
    # Get table ID from config
    local table_id=$(get_table_id "$table_name")
    
    if [ -n "$data" ]; then
        curl -v -X "$method" \
             -H "Authorization: Bearer $API_KEY" \
             -H "Content-Type: application/json" \
             -d "$data" \
             "$ENDPOINT/$API_VERSION/$BASE_ID/$table_id"
    else
        curl -v -X "$method" \
             -H "Authorization: Bearer $API_KEY" \
             -H "Content-Type: application/json" \
             "$ENDPOINT/$API_VERSION/$BASE_ID/$table_id"
    fi
}

# List available tables
list_tables() {
    echo "Available tables by group:"
    for group in $(get_config '.airtable.bases.main.table_groups | keys[]'); do
        echo -e "\n[$group]"
        get_config ".airtable.bases.main.table_groups.$group | keys[]" | while read table; do
            local id=$(get_config ".airtable.bases.main.table_groups.$group[\"$table\"]")
            if [ -n "$id" ] && [ "$id" != "null" ]; then
                echo "  $table ($id)"
            else
                echo "  $table (ID not set)"
            fi
        done
    done
}

# Command router
case "$1" in
    "list-tables")
        list_tables
        ;;
    "get-records")
        if [ -z "$2" ]; then
            echo "Usage: $0 get-records TABLE_NAME"
            exit 1
        fi
        call_api "GET" "$2"
        ;;
    "get-record")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 get-record TABLE_NAME RECORD_ID"
            exit 1
        fi
        call_api "GET" "$2/$3"
        ;;
    "create-record")
        if [ -z "$2" ] || [ -z "$3" ]; then
            echo "Usage: $0 create-record TABLE_NAME '{\"fields\": {...}}'"
            exit 1
        fi
        call_api "POST" "$2" "$3"
        ;;
    "setup")
        echo "Enter your Airtable API key:"
        read -s API_KEY_INPUT
        echo "Enter your base ID:"
        read BASE_ID_INPUT
        
        # Update config file
        tmp=$(mktemp)
        jq --arg key "$API_KEY_INPUT" --arg base "$BASE_ID_INPUT" \
           '.airtable.api.key = $key | .airtable.bases.main.id = $base' \
           "$CONFIG_FILE" > "$tmp" && mv "$tmp" "$CONFIG_FILE"
        
        echo "Configuration updated!"
        ;;
    *)
        echo "Available commands:"
        echo "  setup            - Configure API access"
        echo "  list-tables     - List all tables in base"
        echo "  get-records     - Get records from a table"
        echo "  get-record      - Get a specific record"
        echo "  create-record   - Create a new record"
        ;;
esac 