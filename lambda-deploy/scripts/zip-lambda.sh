#!/bin/bash

# Create a temporary directory
mkdir -p tmp

# Copy necessary files
cp index.js tmp/
cp package.json tmp/
cp -r modules tmp/
cp -r config tmp/

# Install dependencies in the temporary directory
cd tmp
npm install --production

# Create zip file
zip -r ../lambda.zip .

# Clean up
cd ..
rm -rf tmp

echo "Lambda zip file created at lambda.zip" 