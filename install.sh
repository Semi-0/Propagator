#!/usr/bin/env bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Propagator workspace...${NC}\n"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Determine workspace root and project location
if [ -d "$SCRIPT_DIR/Propogator" ] && [ -f "$SCRIPT_DIR/Propogator/package.json" ]; then
    WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    PROJECT_PATH="Propogator/Propogator"
    echo -e "${BLUE}📁 Detected cloned repository structure${NC}"
elif [ -f "$SCRIPT_DIR/package.json" ] && grep -q '"name": "ppropogator"' "$SCRIPT_DIR/package.json" 2>/dev/null; then
    WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    PROJECT_PATH="Propogator"
    echo -e "${BLUE}📁 Detected project directory${NC}"
else
    WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
    PROJECT_PATH="Propogator"
fi

# Check if we're in a workspace context
cd "$WORKSPACE_ROOT"
if [ ! -f "package.json" ] || ! grep -q '"name".*workspace' package.json 2>/dev/null; then
    echo -e "${YELLOW}⚠️  No workspace package.json found. Creating workspace structure...${NC}"
    
    if [ ! -d "$PROJECT_PATH" ]; then
        echo -e "${RED}❌ Error: Cannot find Propagator at $PROJECT_PATH${NC}"
        exit 1
    fi
    
    # Create workspace package.json
    cat > package.json << EOF
{
  "name": "propagator-workspace",
  "private": true,
  "version": "0.0.0",
  "workspaces": [
    "$PROJECT_PATH",
    "GenericProcedure",
    "Sando"
  ]
}
EOF
    echo -e "${GREEN}✅ Created workspace package.json${NC}"
else
    echo -e "${GREEN}✅ Workspace package.json found${NC}"
fi

cd "$WORKSPACE_ROOT"

# Clone workspace dependencies
clone_dep() {
    local DEP_NAME="$1"
    local DEP_REPO="$2"
    
    if [ -d "$DEP_NAME" ]; then
        if [ -d "$DEP_NAME/.git" ]; then
            echo -e "${BLUE}📦 $DEP_NAME already exists (git repo)${NC}"
        else
            echo -e "${YELLOW}⚠️  $DEP_NAME exists but is not a git repo. Skipping...${NC}"
        fi
    else
        echo -e "${BLUE}📥 Cloning $DEP_NAME from $DEP_REPO...${NC}"
        git clone "$DEP_REPO" "$DEP_NAME" || {
            echo -e "${RED}❌ Failed to clone $DEP_NAME${NC}"
            exit 1
        }
        echo -e "${GREEN}✅ Cloned $DEP_NAME${NC}"
    fi
}

# Clone workspace dependencies
clone_dep "GenericProcedure" "https://github.com/Semi-0/GenericProcedure.git"
clone_dep "Sando" "https://github.com/Semi-0/Sando.git"

# Install dependencies
echo -e "\n${BLUE}📦 Installing dependencies with bun...${NC}"
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ bun is not installed. Please install bun first:${NC}"
    echo -e "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

bun install || {
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
}

echo -e "\n${GREEN}✅ Dependencies installed${NC}"

# Verify installation by running tests
echo -e "\n${BLUE}🧪 Running tests to verify installation...${NC}"
cd "$WORKSPACE_ROOT"

# Determine the test path
if [ -d "$PROJECT_PATH/test" ]; then
    TEST_PATH="$PROJECT_PATH/test"
elif [ -d "Propogator/Propogator/test" ]; then
    TEST_PATH="Propogator/Propogator/test"
elif [ -d "Propogator/test" ]; then
    TEST_PATH="Propogator/test"
else
    echo -e "${YELLOW}⚠️  Test directory not found, skipping test verification${NC}"
    TEST_PATH=""
fi

if [ -n "$TEST_PATH" ]; then
    if bun test "$TEST_PATH" 2>&1; then
        echo -e "\n${GREEN}✅ All tests passed!${NC}"
    else
        TEST_EXIT_CODE=$?
        echo -e "\n${YELLOW}⚠️  Some tests failed. Installation completed but tests did not pass.${NC}"
        echo -e "${YELLOW}You may want to check the test output above for details.${NC}"
        # Don't exit with error - installation succeeded, tests just failed
    fi
fi

echo -e "\n${GREEN}✅ Workspace setup complete!${NC}\n"
echo -e "${BLUE}You can now:${NC}"
if [ -n "$PROJECT_PATH" ]; then
    echo -e "  • Run tests: ${YELLOW}cd $PROJECT_PATH && bun test${NC}"
    echo -e "  • Run examples: ${YELLOW}cd $PROJECT_PATH && bun run index.ts${NC}"
else
    echo -e "  • Run tests: ${YELLOW}cd Propagator && bun test${NC}"
    echo -e "  • Run examples: ${YELLOW}cd Propagator && bun run index.ts${NC}"
fi
echo -e "\n${YELLOW}Note:${NC} Make sure to run commands from the workspace root or use 'cd' to the project directory first."
