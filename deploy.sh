#!/bin/bash

# MealPrep Deployment Script
# Deploys to both Railway (backend) and Vercel (frontend)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Railway CLI is installed
    if ! command_exists railway; then
        print_error "Railway CLI is not installed. Please install it first:"
        echo "npm install -g @railway/cli"
        exit 1
    fi
    
    # Check if Vercel CLI is installed
    if ! command_exists vercel; then
        print_error "Vercel CLI is not installed. Please install it first:"
        echo "npm install -g vercel"
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Please run this script from the project root."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to build the project
build_project() {
    print_status "Building the project..."
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm install
    
    # Build the frontend
    print_status "Building frontend..."
    npm run build
    
    print_success "Build completed successfully"
}

# Function to deploy to Railway
deploy_railway() {
    print_status "Deploying to Railway (Backend)..."
    
    # Check if logged in to Railway
    if ! railway whoami >/dev/null 2>&1; then
        print_warning "Not logged in to Railway. Please login first:"
        echo "railway login"
        read -p "Press Enter after logging in to continue..."
    fi
    
    # Deploy to Railway
    print_status "Pushing to Railway..."
    if railway up; then
        print_success "Railway deployment completed"
        
        # Get the Railway URL
        RAILWAY_URL=$(railway domain 2>/dev/null || echo "Check Railway dashboard for URL")
        print_status "Railway URL: $RAILWAY_URL"
    else
        print_error "Railway deployment failed"
        return 1
    fi
}

# Function to deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel (Frontend)..."
    
    # Check if logged in to Vercel
    if ! vercel whoami >/dev/null 2>&1; then
        print_warning "Not logged in to Vercel. Please login first:"
        echo "vercel login"
        read -p "Press Enter after logging in to continue..."
    fi
    
    # Deploy to Vercel
    print_status "Pushing to Vercel..."
    if vercel --prod; then
        print_success "Vercel deployment completed"
        
        # Get the Vercel URL (this might need to be adjusted based on your setup)
        print_status "Check Vercel dashboard for deployment URL"
    else
        print_error "Vercel deployment failed"
        return 1
    fi
}

# Function to update environment variables
update_env_vars() {
    print_status "Updating environment variables..."
    
    # Get Railway URL for Vercel environment variable
    RAILWAY_URL=$(railway domain 2>/dev/null)
    if [ ! -z "$RAILWAY_URL" ]; then
        print_status "Setting VITE_API_URL to Railway URL: $RAILWAY_URL"
        vercel env add VITE_API_URL "$RAILWAY_URL" production
        print_success "Environment variable updated"
    else
        print_warning "Could not get Railway URL. Please manually set VITE_API_URL in Vercel dashboard."
    fi
}

# Function to show deployment status
show_status() {
    print_status "Deployment Status:"
    echo "=================="
    
    # Railway status
    print_status "Railway (Backend):"
    railway status 2>/dev/null || echo "  Unable to get status"
    
    echo ""
    
    # Vercel status
    print_status "Vercel (Frontend):"
    vercel ls 2>/dev/null || echo "  Unable to get status"
}

# Main deployment function
main() {
    echo "🚀 MealPrep Deployment Script"
    echo "============================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Build the project
    build_project
    
    # Deploy to Railway first (backend)
    if deploy_railway; then
        print_success "Railway deployment successful"
    else
        print_error "Railway deployment failed. Stopping deployment."
        exit 1
    fi
    
    # Update environment variables
    update_env_vars
    
    # Deploy to Vercel (frontend)
    if deploy_vercel; then
        print_success "Vercel deployment successful"
    else
        print_error "Vercel deployment failed"
        exit 1
    fi
    
    echo ""
    print_success "🎉 Deployment completed successfully!"
    echo ""
    
    # Show deployment status
    show_status
    
    echo ""
    print_status "Next steps:"
    echo "1. Test your Railway backend API endpoints"
    echo "2. Test your Vercel frontend application"
    echo "3. Verify the frontend can connect to the backend"
    echo "4. Update any hardcoded URLs in your frontend code"
}

# Handle script arguments
case "${1:-}" in
    "railway")
        check_prerequisites
        build_project
        deploy_railway
        ;;
    "vercel")
        check_prerequisites
        build_project
        deploy_vercel
        ;;
    "status")
        show_status
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Deploy to both Railway and Vercel"
        echo "  railway    Deploy only to Railway (backend)"
        echo "  vercel     Deploy only to Vercel (frontend)"
        echo "  status     Show deployment status"
        echo "  help       Show this help message"
        ;;
    *)
        main
        ;;
esac 