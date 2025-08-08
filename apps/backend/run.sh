#!/bin/bash

echo "Starting Discord Export Go Backend..."
echo "Installing dependencies..."
go mod tidy

echo "Starting WebSocket server on port 8001..."
go run main.go 