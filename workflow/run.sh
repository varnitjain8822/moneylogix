#!/bin/bash

# ============================================================================
# PROJECT WORKFLOW ORCHESTRATOR
# ============================================================================
# Generates detailed SDLC documentation from project-input.json
# Interactive mode: pauses after each stage for user review
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_FILE="$SCRIPT_DIR/project-input.json"
STAGES_DIR="$SCRIPT_DIR/stages"
OUTPUT_DIR="$SCRIPT_DIR/output"

# Track mode
INTERACTIVE=true

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                                  ║${NC}"
    echo -e "${CYAN}║           ${BOLD}📋 PROJECT WORKFLOW ORCHESTRATOR${NC}${CYAN}                      ║${NC}"
    echo -e "${CYAN}║           ${DIM}Generating SDLC Documentation${NC}${CYAN}                         ║${NC}"
    echo -e "${CYAN}║                                                                  ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_stage_header() {
    local stage_num=$1
    local stage_name=$2
    local stage_icon=$3
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}${BOLD}  $stage_icon Stage $stage_num: $stage_name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}  ✓ $1${NC}"
}

print_error() {
    echo -e "${RED}  ✗ $1${NC}"
}

print_info() {
    echo -e "${CYAN}  ℹ $1${NC}"
}

print_file_info() {
    local file=$1
    local size=$(wc -c < "$file" | tr -d ' ')
    local lines=$(wc -l < "$file" | tr -d ' ')
    echo -e "${DIM}    📄 $file${NC}"
    echo -e "${DIM}       Size: ${size} bytes | Lines: ${lines}${NC}"
}

wait_for_user() {
    local file_path=$1
    local stage_num=$2

    if [ "$INTERACTIVE" = true ]; then
        echo ""
        echo -e "${MAGENTA}┌──────────────────────────────────────────────────────────────────┐${NC}"
        echo -e "${MAGENTA}│${NC}  ${BOLD}📄 REVIEW THIS FILE:${NC}"
        echo -e "${MAGENTA}│${NC}"
        echo -e "${MAGENTA}│${NC}  ${CYAN}$file_path${NC}"
        echo -e "${MAGENTA}│${NC}"
        echo -e "${MAGENTA}│${NC}  ${DIM}Open in your editor or run:${NC}"
        echo -e "${MAGENTA}│${NC}  ${DIM}cat $file_path${NC}"
        echo -e "${MAGENTA}│${NC}"
        echo -e "${MAGENTA}│${NC}  ${GREEN}Press [Enter]${NC} to continue to next stage"
        echo -e "${MAGENTA}│${NC}  ${RED}Press [q]${NC}    to quit and review later"
        echo -e "${MAGENTA}│${NC}"
        echo -e "${MAGENTA}└──────────────────────────────────────────────────────────────────┘${NC}"
        echo ""

        read -r -p "  ➤ " user_input </dev/tty

        if [[ "$user_input" == "q" || "$user_input" == "Q" ]]; then
            echo ""
            echo -e "${YELLOW}  ⏸  Workflow paused at Stage $stage_num${NC}"
            echo -e "${YELLOW}  📁 Generated files are in: $OUTPUT_DIR${NC}"
            echo -e "${YELLOW}  ▶  Resume later with: ./run.sh range $((stage_num + 1)) 8${NC}"
            echo ""
            exit 0
        fi
    fi
}

# ============================================================================
# Input Validation
# ============================================================================

validate_input() {
    if [ ! -f "$INPUT_FILE" ]; then
        print_error "project-input.json not found!"
        echo "  Please create project-input.json with your project details."
        echo "  See README.md for the required format."
        exit 1
    fi

    # Check if jq is installed
    if ! command -v jq &> /dev/null; then
        print_error "jq is required but not installed."
        echo "  Install with: brew install jq"
        exit 1
    fi

    # Validate JSON
    if ! jq empty "$INPUT_FILE" 2>/dev/null; then
        print_error "Invalid JSON in project-input.json"
        echo "  Check JSON syntax and try again."
        exit 1
    fi

    # Check required fields
    local project_name=$(jq -r '.projectName // empty' "$INPUT_FILE")
    local description=$(jq -r '.description // empty' "$INPUT_FILE")

    if [ -z "$project_name" ]; then
        print_error "Missing required field: projectName"
        exit 1
    fi

    if [ -z "$description" ]; then
        print_error "Missing required field: description"
        exit 1
    fi

    print_success "Input file validated"
}

# ============================================================================
# Variable Extraction
# ============================================================================

extract_variables() {
    PROJECT_NAME=$(jq -r '.projectName' "$INPUT_FILE")
    PROJECT_TYPE=$(jq -r '.projectType // "Software Application"' "$INPUT_FILE")
    DESCRIPTION=$(jq -r '.description' "$INPUT_FILE")
    DATE=$(date +"%Y-%m-%d")
    AUTHOR=$(jq -r '.author // "Development Team"' "$INPUT_FILE")
    TIMELINE=$(jq -r '.constraints.timeline // "4 weeks"' "$INPUT_FILE")
    TEAM_SIZE=$(jq -r '.constraints.teamSize // "3 developers"' "$INPUT_FILE")
    TARGET_USERS=$(jq -r '.targetUsers | join(", ")' "$INPUT_FILE")

    echo -e "${BOLD}  Project:${NC}     $PROJECT_NAME"
    echo -e "${BOLD}  Type:${NC}        $PROJECT_TYPE"
    echo -e "${BOLD}  Timeline:${NC}    $TIMELINE"
    echo -e "${BOLD}  Team:${NC}        $TEAM_SIZE"
    echo ""
}

# ============================================================================
# Template Processing
# ============================================================================

process_template() {
    local input_file=$1
    local output_file=$2

    # Read template and replace placeholders
    sed \
        -e "s/{{PROJECT_NAME}}/$PROJECT_NAME/g" \
        -e "s/{{PROJECT_TYPE}}/$PROJECT_TYPE/g" \
        -e "s|{{DESCRIPTION}}|$DESCRIPTION|g" \
        -e "s/{{DATE}}/$DATE/g" \
        -e "s/{{AUTHOR}}/$AUTHOR/g" \
        -e "s/{{TIMELINE}}/$TIMELINE/g" \
        -e "s/{{TEAM_SIZE}}/$TEAM_SIZE/g" \
        -e "s/{{TARGET_USERS}}/$TARGET_USERS/g" \
        "$input_file" > "$output_file"
}

# ============================================================================
# Stage Generators
# ============================================================================

generate_project_brief() {
    local output_file="$OUTPUT_DIR/00-project-brief.md"

    cat > "$output_file" << EOF
# $PROJECT_NAME - Project Brief

## Overview

| Field | Value |
|-------|-------|
| **Project Name** | $PROJECT_NAME |
| **Project Type** | $PROJECT_TYPE |
| **Date** | $DATE |
| **Author** | $AUTHOR |

---

## Description

$DESCRIPTION

---

## Target Users

$(echo "$TARGET_USERS" | tr ', ' '\n' | sed 's/^/- /')

---

## Tech Stack

$(jq -r '.techStack | to_entries[] | "### \(.key | gsub("_"; " ") | gsub("\\b."; "") | split(" ") | map(split("") | .[0:1] | join("") | ascii_upcase) | join(" "))\n\(.value | map("- " + .) | join("\n"))\n"' "$INPUT_FILE" 2>/dev/null || echo "See requirement analysis document")

---

## Core Features

$(jq -r '.coreFeatures[] | "- " + .' "$INPUT_FILE" 2>/dev/null || echo "- See PRD document")

---

## Constraints

| Constraint | Value |
|------------|-------|
| Timeline | $TIMELINE |
| Team Size | $TEAM_SIZE |
| Budget | $(jq -r '.constraints.budget // "Not specified"' "$INPUT_FILE") |

---

## Non-Functional Requirements

$(jq -r '.nonFunctionalRequirements | to_entries[] | "- **\(.key | gsub("_"; " ") | split(" ") | map(split("") | .[0:1] | join("") | ascii_upcase) | join(" "))**: \(.value)"' "$INPUT_FILE" 2>/dev/null || echo "- See detailed requirements document")

---

*Generated on $DATE by Workflow Orchestrator*
EOF

    print_success "Generated: 00-project-brief.md"
    print_file_info "$output_file"
}

generate_stage_1() {
    local output_file="$OUTPUT_DIR/01-requirement-analysis.md"
    process_template "$STAGES_DIR/01-requirement-analysis.md" "$output_file"
    print_success "Generated: 01-requirement-analysis.md"
    print_file_info "$output_file"
}

generate_stage_2() {
    local output_file="$OUTPUT_DIR/02-prd.md"
    process_template "$STAGES_DIR/02-prd.md" "$output_file"
    print_success "Generated: 02-prd.md"
    print_file_info "$output_file"
}

generate_stage_3() {
    local output_file="$OUTPUT_DIR/03-high-level-design.md"
    process_template "$STAGES_DIR/03-high-level-design.md" "$output_file"
    print_success "Generated: 03-high-level-design.md"
    print_file_info "$output_file"
}

generate_stage_4() {
    local output_file="$OUTPUT_DIR/04-low-level-design.md"
    process_template "$STAGES_DIR/04-low-level-design.md" "$output_file"
    print_success "Generated: 04-low-level-design.md"
    print_file_info "$output_file"
}

generate_stage_5() {
    local output_file="$OUTPUT_DIR/05-implementation-plan.md"
    process_template "$STAGES_DIR/05-implementation-plan.md" "$output_file"
    print_success "Generated: 05-implementation-plan.md"
    print_file_info "$output_file"
}

generate_stage_6() {
    local output_file="$OUTPUT_DIR/06-code-implementation.md"
    process_template "$STAGES_DIR/06-code-implementation.md" "$output_file"
    print_success "Generated: 06-code-implementation.md"
    print_file_info "$output_file"
}

generate_stage_7() {
    local output_file="$OUTPUT_DIR/07-code-review.md"
    process_template "$STAGES_DIR/07-code-review.md" "$output_file"
    print_success "Generated: 07-code-review.md"
    print_file_info "$output_file"
}

generate_stage_8() {
    local output_file="$OUTPUT_DIR/08-qa-testing.md"
    process_template "$STAGES_DIR/08-qa-testing.md" "$output_file"
    print_success "Generated: 08-qa-testing.md"
    print_file_info "$output_file"
}

# ============================================================================
# Show Running Links
# ============================================================================

show_running_links() {
    local frontend_port=5173
    local backend_port=3001

    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}║           ${BOLD}✅ WORKFLOW COMPLETE!${NC}${GREEN}                                  ║${NC}"
    echo -e "${GREEN}║                                                                  ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Check if servers are running
    local frontend_running=false
    local backend_running=false

    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$frontend_port" 2>/dev/null | grep -q "200"; then
        frontend_running=true
    fi

    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$backend_port/health" 2>/dev/null | grep -q "200"; then
        backend_running=true
    fi

    echo -e "${BOLD}  📁 Generated Documentation:${NC}"
    echo -e "  ────────────────────────────────────────────────────────────────"
    echo -e "  ${CYAN}$OUTPUT_DIR/${NC}"
    echo ""
    ls -1 "$OUTPUT_DIR"/*.md 2>/dev/null | while read file; do
        local filename=$(basename "$file")
        local size=$(wc -c < "$file" | tr -d ' ')
        echo -e "    ${GREEN}✓${NC} ${BOLD}$filename${NC} ${DIM}($size bytes)${NC}"
    done
    echo ""

    echo -e "${BOLD}  🚀 Running Project Links:${NC}"
    echo -e "  ────────────────────────────────────────────────────────────────"

    if [ "$frontend_running" = true ]; then
        echo -e "    ${GREEN}✓${NC} Frontend:  ${BOLD}http://localhost:$frontend_port${NC} ${GREEN}(Running)${NC}"
    else
        echo -e "    ${YELLOW}○${NC} Frontend:  ${DIM}http://localhost:$frontend_port${NC} ${YELLOW}(Start with: npm run dev)${NC}"
    fi

    if [ "$backend_running" = true ]; then
        echo -e "    ${GREEN}✓${NC} Backend:   ${BOLD}http://localhost:$backend_port${NC} ${GREEN}(Running)${NC}"
        echo -e "    ${GREEN}✓${NC} API Docs:  ${BOLD}http://localhost:$backend_port/health${NC}"
        echo -e "    ${GREEN}✓${NC} WebSocket: ${BOLD}ws://localhost:$backend_port${NC}"
    else
        echo -e "    ${YELLOW}○${NC} Backend:   ${DIM}http://localhost:$backend_port${NC} ${YELLOW}(Start with: npm run dev)${NC}"
    fi
    echo ""

    echo -e "${BOLD}  📊 Workflow Summary:${NC}"
    echo -e "  ────────────────────────────────────────────────────────────────"
    echo -e "    Total Files:     ${BOLD}9${NC} documentation files"
    echo -e "    Total Size:      ${BOLD}$(du -sh "$OUTPUT_DIR" 2>/dev/null | cut -f1)${NC}"
    echo -e "    Total Sections:  ${BOLD}89${NC} sections across all documents"
    echo -e "    Project:         ${BOLD}$PROJECT_NAME${NC}"
    echo ""

    echo -e "${BOLD}  💡 Next Steps:${NC}"
    echo -e "  ────────────────────────────────────────────────────────────────"
    echo -e "    1. Review each generated document in ${CYAN}$OUTPUT_DIR/${NC}"
    echo -e "    2. Customize templates in ${CYAN}stages/${NC} for your team"
    echo -e "    3. Use docs as reference during implementation"
    echo -e "    4. Feed docs to AI assistants for project-specific details"
    echo ""

    if [ "$frontend_running" = true ] && [ "$backend_running" = true ]; then
        echo -e "${GREEN}  🎉 Your project is running!${NC}"
        echo -e "${GREEN}     Open ${BOLD}http://localhost:$frontend_port${NC}${GREEN} in your browser${NC}"
        echo ""
    fi
}

# ============================================================================
# Main Execution
# ============================================================================

show_usage() {
    echo ""
    echo "  Usage: ./run.sh [command] [options]"
    echo ""
    echo "  Commands:"
    echo "    (no command)        Generate all stages (interactive mode)"
    echo "    --non-interactive   Generate all stages without pausing"
    echo "    stage <num>         Generate specific stage (0-8)"
    echo "    range <min> <max>   Generate range of stages"
    echo "    list                List available stages"
    echo "    clean               Remove output directory"
    echo "    help                Show this help message"
    echo ""
    echo "  Examples:"
    echo "    ./run.sh                    # Interactive: generate all with review prompts"
    echo "    ./run.sh --non-interactive  # Auto-generate all without pausing"
    echo "    ./run.sh stage 3            # Generate only stage 3"
    echo "    ./run.sh range 2 5          # Generate stages 2-5"
    echo ""
}

list_stages() {
    echo ""
    echo "  Available Stages:"
    echo "  ────────────────────────────────────────────────────────────────"
    echo "    0. Project Brief              (Auto-generated)"
    echo "    1. Requirement Analysis       (FR, NFR, personas, use cases)"
    echo "    2. PRD                        (User stories, features, metrics)"
    echo "    3. High Level Design          (Architecture, tech stack, security)"
    echo "    4. Low Level Design           (API, DB schema, components)"
    echo "    5. Implementation Plan        (Sprints, milestones, tasks)"
    echo "    6. Code Implementation        (Structure, patterns, examples)"
    echo "    7. Code Review                (Checklist, standards, gates)"
    echo "    8. QA & Testing               (Test strategy, cases, coverage)"
    echo ""
}

clean_output() {
    if [ -d "$OUTPUT_DIR" ]; then
        rm -rf "$OUTPUT_DIR"
        print_success "Cleaned output directory"
    else
        print_info "Output directory doesn't exist"
    fi
}

main() {
    local command=${1:-"all"}

    # Check for non-interactive flag
    if [ "$command" = "--non-interactive" ]; then
        INTERACTIVE=false
        command="all"
    fi

    print_header

    case $command in
        "all")
            validate_input
            extract_variables
            mkdir -p "$OUTPUT_DIR"

            echo -e "${CYAN}  Generating documentation...${NC}"
            echo ""

            # Stage 0: Project Brief
            print_stage_header "0" "Project Brief" "📋"
            generate_project_brief
            wait_for_user "$OUTPUT_DIR/00-project-brief.md" 0

            # Stage 1: Requirement Analysis
            print_stage_header "1" "Requirement Analysis" "📝"
            generate_stage_1
            wait_for_user "$OUTPUT_DIR/01-requirement-analysis.md" 1

            # Stage 2: PRD
            print_stage_header "2" "Product Requirements Document" "📄"
            generate_stage_2
            wait_for_user "$OUTPUT_DIR/02-prd.md" 2

            # Stage 3: High Level Design
            print_stage_header "3" "High Level Design" "🏗️"
            generate_stage_3
            wait_for_user "$OUTPUT_DIR/03-high-level-design.md" 3

            # Stage 4: Low Level Design
            print_stage_header "4" "Low Level Design" "🔧"
            generate_stage_4
            wait_for_user "$OUTPUT_DIR/04-low-level-design.md" 4

            # Stage 5: Implementation Plan
            print_stage_header "5" "Implementation Plan" "📅"
            generate_stage_5
            wait_for_user "$OUTPUT_DIR/05-implementation-plan.md" 5

            # Stage 6: Code Implementation
            print_stage_header "6" "Code Implementation Guide" "💻"
            generate_stage_6
            wait_for_user "$OUTPUT_DIR/06-code-implementation.md" 6

            # Stage 7: Code Review
            print_stage_header "7" "Code Review Guide" "🔍"
            generate_stage_7
            wait_for_user "$OUTPUT_DIR/07-code-review.md" 7

            # Stage 8: QA & Testing
            print_stage_header "8" "QA & Testing Guide" "🧪"
            generate_stage_8
            wait_for_user "$OUTPUT_DIR/08-qa-testing.md" 8

            # Show completion summary
            show_running_links
            ;;

        "stage")
            local stage_num=${2}
            if [ -z "$stage_num" ] || [ "$stage_num" -lt 0 ] || [ "$stage_num" -gt 8 ]; then
                print_error "Please specify a stage number (0-8)"
                exit 1
            fi
            validate_input
            extract_variables
            mkdir -p "$OUTPUT_DIR"

            case $stage_num in
                0) print_stage_header "0" "Project Brief" "📋"; generate_project_brief ;;
                1) print_stage_header "1" "Requirement Analysis" "📝"; generate_stage_1 ;;
                2) print_stage_header "2" "PRD" "📄"; generate_stage_2 ;;
                3) print_stage_header "3" "High Level Design" "🏗️"; generate_stage_3 ;;
                4) print_stage_header "4" "Low Level Design" "🔧"; generate_stage_4 ;;
                5) print_stage_header "5" "Implementation Plan" "📅"; generate_stage_5 ;;
                6) print_stage_header "6" "Code Implementation" "💻"; generate_stage_6 ;;
                7) print_stage_header "7" "Code Review" "🔍"; generate_stage_7 ;;
                8) print_stage_header "8" "QA & Testing" "🧪"; generate_stage_8 ;;
            esac
            echo ""
            print_info "File generated in: $OUTPUT_DIR/"
            ;;

        "range")
            local min=${2:-0}
            local max=${3:-8}
            if [ "$min" -lt 0 ] || [ "$max" -gt 8 ] || [ "$min" -gt "$max" ]; then
                print_error "Invalid range. Use: ./run.sh range <min> <max> (0-8)"
                exit 1
            fi
            validate_input
            extract_variables
            mkdir -p "$OUTPUT_DIR"
            for i in $(seq $min $max); do
                case $i in
                    0) print_stage_header "0" "Project Brief" "📋"; generate_project_brief ;;
                    1) print_stage_header "1" "Requirement Analysis" "📝"; generate_stage_1 ;;
                    2) print_stage_header "2" "PRD" "📄"; generate_stage_2 ;;
                    3) print_stage_header "3" "High Level Design" "🏗️"; generate_stage_3 ;;
                    4) print_stage_header "4" "Low Level Design" "🔧"; generate_stage_4 ;;
                    5) print_stage_header "5" "Implementation Plan" "📅"; generate_stage_5 ;;
                    6) print_stage_header "6" "Code Implementation" "💻"; generate_stage_6 ;;
                    7) print_stage_header "7" "Code Review" "🔍"; generate_stage_7 ;;
                    8) print_stage_header "8" "QA & Testing" "🧪"; generate_stage_8 ;;
                esac
                wait_for_user "$OUTPUT_DIR/$(printf '%02d' $i)-*.md" $i
            done
            show_running_links
            ;;

        "list")
            list_stages
            ;;
        "clean")
            clean_output
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
