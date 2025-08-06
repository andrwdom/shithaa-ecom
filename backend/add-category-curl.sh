#!/bin/bash

# Add the missing "Zipless Feeding Dupatta Lounge Wear" category
curl -X POST https://shithaa.in/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Zipless Feeding Dupatta Lounge Wear",
    "slug": "zipless-feeding-dupatta-lounge-wear",
    "description": "Zipless design with attached dupatta for more comfort"
  }'

echo ""
echo "Category added successfully!" 