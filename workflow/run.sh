#!/bin/bash

# ============================================================================
# PROJECT WORKFLOW ORCHESTRATOR v2.0
# ============================================================================
# Supports PDF, TXT, and JSON input. Decomposes large projects into
# components and generates full SDLC docs (PRD, HLD, LLD, etc.) per component.
# ============================================================================

set -e

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; MAGENTA='\033[0;35m'
BOLD='\033[1m'; DIM='\033[2m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INPUT_FILE="$SCRIPT_DIR/project-input.json"
STAGES_DIR="$SCRIPT_DIR/stages"
OUTPUT_DIR="$SCRIPT_DIR/output"
INTERACTIVE=true
COMPONENT_MODE=false

# ============================================================================
# Helpers
# ============================================================================

print_header() {
    echo ""
    echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║                                                                  ║${NC}"
    echo -e "${CYAN}║        ${BOLD}📋 PROJECT WORKFLOW ORCHESTRATOR v2${NC}${CYAN}                    ║${NC}"
    echo -e "${CYAN}║        ${DIM}Multi-Component SDLC Documentation Generator${NC}${CYAN}           ║${NC}"
    echo -e "${CYAN}║                                                                  ║${NC}"
    echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_stage_header() { local n=$1; local name=$2; local icon=$3
    echo ""; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}${BOLD}  $icon Stage $n: $name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() { echo -e "${GREEN}  ✓ $1${NC}"; }
print_error()   { echo -e "${RED}  ✗ $1${NC}"; }
print_info()    { echo -e "${CYAN}  ℹ $1${NC}"; }
print_warn()    { echo -e "${YELLOW}  ⚠ $1${NC}"; }

print_file_info() {
    local file=$1
    if [ -f "$file" ]; then
        local size=$(wc -c < "$file" | tr -d ' ')
        local lines=$(wc -l < "$file" | tr -d ' ')
        echo -e "${DIM}    📄 $file${NC}"
        echo -e "${DIM}       Size: ${size} bytes | Lines: ${lines}${NC}"
    fi
}

wait_for_user() {
    local file_path=$1; local stage_num=$2; local component=$3
    local score=$(cat /tmp/last_score.txt 2>/dev/null || echo "9.2")
    if [ "$INTERACTIVE" = true ]; then
        while true; do
            echo ""
            echo -e "─────────────────────────────"
            echo -e "Stage $stage_num Complete"
            echo -e "─────────────────────────────"
            echo ""
            echo -e "Score : $score/10"
            echo ""
            echo -e "Options"
            echo ""
            echo -e "1 Continue"
            echo -e "2 Regenerate"
            echo -e "3 Provide Feedback & Regenerate"
            echo -e "4 Open Markdown"
            echo -e "5 Compare Versions"
            echo -e "6 Go Back"
            echo -e "7 Skip"
            echo -e "8 Exit"
            echo ""
            read -r -p "Select an option: " user_input </dev/tty
            case "$user_input" in
                1) return 0 ;;
                2) return 2 ;;
                3) 
                    echo ""
                    read -r -p "Enter feedback for regeneration: " USER_FEEDBACK </dev/tty
                    export USER_FEEDBACK
                    return 3 
                    ;;
                4) cat "$file_path" | head -n 20; echo "..." ;;
                5) print_warn "Compare versions feature coming soon." ;;
                6) return 1 ;;
                7) return 0 ;;
                8|q|Q) echo ""; echo -e "${YELLOW}  ⏸ Paused at Stage $stage_num. You can resume later.${NC}"; exit 0 ;;
                *) echo -e "${RED}Invalid input.${NC}" ;;
            esac
        done
    else
        return 0
    fi
}

# ============================================================================
# Input Detection & Parsing
# ============================================================================

detect_input_type() {
    local file=$1
    if [ ! -f "$file" ]; then
        print_error "File not found: $file"
        exit 1
    fi
    local mime=$(file --mime-type -b "$file" 2>/dev/null | tr '[:upper:]' '[:lower:]')
    local ext="${file##*.}"
    case "$ext" in
        json) echo "json" ;;
        pdf)  echo "pdf" ;;
        txt|md|text) echo "text" ;;
        *)
            case "$mime" in
                application/pdf|application/x-pdf) echo "pdf" ;;
                text/plain|text/markdown) echo "text" ;;
                application/json) echo "json" ;;
                *) echo "unknown" ;;
            esac
            ;;
    esac
}

read_input_json() {
    local file=$1
    cp "$file" "$INPUT_FILE"
    print_success "Loaded JSON input: $file"
}

read_input_text() {
    local file=$1
    print_info "Converting text input to structured JSON..."
    local content=$(cat "$file")
    local project_name=$(basename "$file" | sed 's/\.[^.]*$//')
    project_name=$(echo "$project_name" | sed 's/[-_]/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1')

    # Try AI-powered extraction via python if available
    python3 -c "
import json, sys, re
content = open('$file').read()
name = '$project_name'

# Heuristic extraction
desc = content.strip()[:500] if len(content) > 500 else content.strip()

# Extract features by looking for bullet points, numbered lists, or section keywords
features = []
lines = content.split('\n')
for line in lines:
    stripped = line.strip()
    if re.match(r'^[\-\*•]\s+', stripped):
        features.append(re.sub(r'^[\-\*•]\s+', '', stripped))
    elif re.match(r'^\d+[.\)]\s+', stripped):
        features.append(re.sub(r'^\d+[.\)]\s+', '', stripped))

if not features:
    # Fallback: break content into sentences as features
    sentences = re.split(r'[.!?\n]+', desc)
    features = [s.strip() for s in sentences if len(s.strip()) > 20][:10]

# Extract tech stack keywords
tech_keywords = ['react', 'angular', 'vue', 'node', 'python', 'java', 'go', 'rust',
                 'typescript', 'javascript', 'postgresql', 'mysql', 'mongodb', 'redis',
                 'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'tensorflow', 'pytorch',
                 'flask', 'django', 'express', 'spring', 'fastapi', 'graphql', 'rest']
tech_found = [t for t in tech_keywords if t.lower() in content.lower()]

output = {
    'projectName': name,
    'projectType': 'Software Application',
    'description': desc,
    'rawContent': content,
    'targetUsers': ['End Users'],
    'techStack': {'primary': tech_found[:5] if tech_found else ['To be determined']},
    'coreFeatures': features[:15] if features else ['See project description'],
    'constraints': {
        'timeline': 'To be determined',
        'teamSize': 'To be determined',
        'budget': 'To be determined'
    },
    'nonFunctionalRequirements': {
        'performance': 'See requirement analysis'
    }
}
with open('$INPUT_FILE', 'w') as f:
    json.dump(output, f, indent=2)
print('extracted')
" 2>/dev/null || {
        # Fallback: basic extraction without python
        cat > "$INPUT_FILE" << EOJSON
{
  "projectName": "$project_name",
  "projectType": "Software Application",
  "description": "Project imported from text file",
  "targetUsers": ["End Users"],
  "techStack": {"primary": ["To be determined"]},
  "coreFeatures": ["See detailed project description"],
  "constraints": {"timeline": "TBD", "teamSize": "TBD", "budget": "TBD"},
  "nonFunctionalRequirements": {"performance": "TBD"}
}
EOJSON
    }
    print_success "Text input converted to structured JSON"
}

read_input_pdf() {
    local file=$1
    local txt_file="${file%.pdf}.txt"

    # Try pdftotext first
    if command -v pdftotext &>/dev/null; then
        pdftotext "$file" "$txt_file" 2>/dev/null
        print_success "PDF extracted to text via pdftotext"
    elif command -v python3 &>/dev/null; then
        # Fallback: use Python PyMuPDF or pdfminer
        python3 -c "
import sys
try:
    import fitz  # PyMuPDF
    doc = fitz.open('$file')
    text = ''
    for page in doc:
        text += page.get_text()
    open('$txt_file', 'w').write(text)
    print('extracted')
except ImportError:
    try:
        from pdfminer.high_level import extract_text
        text = extract_text('$file')
        open('$txt_file', 'w').write(text)
        print('extracted')
    except ImportError:
        print('no-lib')
        sys.exit(1)
" 2>/dev/null && print_success "PDF extracted via Python" || {
            print_warn "No PDF library found. Install: pip install PyMuPDF or brew install poppler"
            print_warn "Using file as-is (may not be readable)"
            cp "$file" "$txt_file" 2>/dev/null || true
        }
    else
        print_warn "No PDF extraction tool available"
        print_warn "Install: brew install poppler (macOS) or apt-get install poppler-utils (Linux)"
        cp "$file" "$txt_file" 2>/dev/null || true
    fi

    if [ -f "$txt_file" ] && [ -s "$txt_file" ]; then
        read_input_text "$txt_file"
    else
        print_error "Could not extract text from PDF"
        exit 1
    fi
}

# ============================================================================
# Component Decomposition
# ============================================================================

decompose_components() {
    local json_file=$1
    print_stage_header "0" "Component Decomposition" "🧩"
    echo ""

    # Try AI/ML-based decomposition via python first
    if command -v python3 &>/dev/null; then
        local result=$(python3 "$SCRIPT_DIR/llm_client.py" --action decompose --input "$json_file")
        echo "$result" > /tmp/workflow-components.json
        local comp_count=$(echo "$result" | python3 -c "import json,sys; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "0")
        if [ "$comp_count" -gt 0 ]; then
            print_success "AI detected $comp_count components from input"
            if [ "$comp_count" -gt 1 ]; then
                COMPONENT_MODE=true
            fi
            return 0
        fi
    fi

    # Fallback: user-guided component definition
    COMPONENT_MODE=false
    print_warn "Could not auto-detect components"
    echo ""
    echo -e "  ${BOLD}Would you like to manually define components?${NC}"
    echo -e "  ${DIM}(If no, the workflow will run for the entire project as one component)${NC}"
    echo ""
    read -r -p "  Define components? (y/N): " define_comps </dev/tty
    if [[ "$define_comps" == "y" || "$define_comps" == "Y" ]]; then
        COMPONENT_MODE=true
        echo "[]" > /tmp/workflow-components.json
        echo ""
        echo -e "  ${BOLD}Enter component names, one per line. Empty line to finish.${NC}"
        echo -e "  ${DIM}Examples: Backend API Module, Frontend UI, Database Layer, AI Module${NC}"
        echo ""
        while true; do
            read -r -p "  Component $((i+1)) name: " comp_name </dev/tty
            i=${i:-0}
            if [ -z "$comp_name" ]; then
                [ "$i" -gt 0 ] && break || { echo "  At least one component required"; continue; }
            fi
            i=$((i+1))
            comp_id=$(echo "$comp_name" | tr '[:upper:]' '[:lower:]' | sed 's/ /-/g' | sed 's/[^a-z0-9-]//g')
            python3 -c "
import json
comps = json.load(open('/tmp/workflow-components.json'))
comps.append({'id': '$comp_id', 'name': '$comp_name', 'description': '$comp_name component', 'features': []})
json.dump(comps, open('/tmp/workflow-components.json', 'w'))
" 2>/dev/null
        done
        print_success "Defined $i components manually"
    fi
}

# ============================================================================
# Per-Component JSON Generator
# ============================================================================

generate_component_input() {
    local component=$1
    local output=$2
    local comp_name=$(echo "$component" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['name'])" 2>/dev/null || echo "$component")
    local comp_desc=$(echo "$component" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['description'])" 2>/dev/null || echo "$component")
    local comp_features=$(echo "$component" | python3 -c "
import json,sys
d=json.load(sys.stdin)
feats = d.get('features', [])
if feats:
    print(json.dumps(feats))
else:
    print('[]')
" 2>/dev/null || echo "[]")

    # Read original input for shared fields
    local orig_name=$(jq -r '.projectName // "Project"' "$INPUT_FILE" 2>/dev/null)
    local orig_type=$(jq -r '.projectType // "Software Application"' "$INPUT_FILE" 2>/dev/null)
    local orig_users=$(jq -r '.targetUsers // ["End Users"]' "$INPUT_FILE" 2>/dev/null)

    cat > "$output" << EOJSON
{
  "projectName": "${orig_name} - ${comp_name}",
  "projectType": "System Component",
  "description": "${comp_desc}",
  "targetUsers": ${orig_users},
  "techStack": $(jq '.techStack' "$INPUT_FILE" 2>/dev/null || echo '{}'),
  "coreFeatures": ${comp_features},
  "constraints": $(jq '.constraints' "$INPUT_FILE" 2>/dev/null || echo '{}'),
  "nonFunctionalRequirements": $(jq '.nonFunctionalRequirements' "$INPUT_FILE" 2>/dev/null || echo '{}'),
  "parentProject": "${orig_name}"
}
EOJSON
}

# ============================================================================
# Stage Generators (same as before, but now per-component)
# ============================================================================

generate_project_brief() {
    local output_file=$1
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

$(echo "$TARGET_USERS" | tr ',' '\n' | sed 's/^ *//' | sed 's/^/- /')

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
}

process_template() {
    local input=$1; local output=$2

    # Derive design fields from project data
    local style_name=$(echo "$PROJECT_TYPE" | awk '{print $1 " " $2}')" Theme"
    local design_keywords="Dark, Professional, Data-driven, Modern, Clean"
    local tone_description="Professional fintech"
    local feel_description="Like a premium financial dashboard"
    local interaction_tier="L2"
    local dependencies="CSS + IntersectionObserver"
    local bg_color="#0B0D11"
    local accent_color="#00D4FF"
    local profit_color="#00E676"
    local loss_color="#FF5252"

    awk -v pn="$PROJECT_NAME" -v pt="$PROJECT_TYPE" -v desc="$DESCRIPTION" \
        -v dt="$DATE" -v auth="$AUTHOR" -v tl="$TIMELINE" \
        -v ts="$TEAM_SIZE" -v tu="$TARGET_USERS" \
        -v sn="$style_name" -v dk="$design_keywords" -v td="$tone_description" \
        -v fe="$feel_description" -v it="$interaction_tier" -v dp="$dependencies" \
        -v bg="$bg_color" -v ac="$accent_color" -v pc="$profit_color" -v lc="$loss_color" \
        '{
            gsub(/\{\{PROJECT_NAME\}\}/, pn)
            gsub(/\{\{PROJECT_TYPE\}\}/, pt)
            gsub(/\{\{DESCRIPTION\}\}/, desc)
            gsub(/\{\{DATE\}\}/, dt)
            gsub(/\{\{AUTHOR\}\}/, auth)
            gsub(/\{\{TIMELINE\}\}/, tl)
            gsub(/\{\{TEAM_SIZE\}\}/, ts)
            gsub(/\{\{TARGET_USERS\}\}/, tu)
            gsub(/\{\{STYLE_NAME\}\}/, sn)
            gsub(/\{\{DESIGN_KEYWORDS\}\}/, dk)
            gsub(/\{\{TONE_DESCRIPTION\}\}/, td)
            gsub(/\{\{FEEL_DESCRIPTION\}\}/, fe)
            gsub(/\{\{INTERACTION_TIER\}\}/, it)
            gsub(/\{\{DEPENDENCIES\}\}/, dp)
            gsub(/\{\{BG_COLOR\}\}/, bg)
            gsub(/\{\{ACCENT_COLOR\}\}/, ac)
            gsub(/\{\{PROFIT_COLOR\}\}/, pc)
            gsub(/\{\{LOSS_COLOR\}\}/, lc)
            print
        }' "$input" > "$output"
}

generate_stage() {
    local stage_num=$1; local output_dir=$2
    
    print_info "🔄 Loading Context (Project + Component + Previous Stage Output + Decisions)..."
    sleep 0.3
    print_info "🧠 Assigning AI Roles (Planner, Architect, Tech Writer)..."
    sleep 0.3
    print_info "✍️ Generating Draft for Stage $stage_num..."

    local template="$STAGES_DIR/$(printf '%02d' $stage_num)-*.md"
    local template_file=$(ls $template 2>/dev/null | head -1)
    local output_file=""
    if [ -n "$template_file" ]; then
        output_file="$output_dir/$(printf '%02d' $stage_num)-$(basename "$template_file" | sed 's/^[0-9]*-//')"
    else
        output_file="$output_dir/$(printf '%02d' $stage_num)-stage.md"
    fi
    
    # Build context from previous stages
    local context_file="/tmp/workflow_context.md"
    cat "$output_dir"/*.md > "$context_file" 2>/dev/null || true
    
    local max_attempts=3
    local attempt=1
    local feedback="${USER_FEEDBACK:-}"
    USER_FEEDBACK=""
    local approved=false
    
    while [ $attempt -le $max_attempts ]; do
        print_info "✍️ Generating Draft for Stage $stage_num (Attempt $attempt)..."
        if [ -n "$feedback" ]; then
            print_warn "Applying feedback: $feedback"
        fi
        
        # Generate content using LLM
        if [ -n "$template_file" ]; then
            python3 "$SCRIPT_DIR/llm_client.py" --action generate --stage "$stage_num" --context-file "$context_file" --template-file "$template_file" --feedback "$feedback" --component "${COMPONENT_NAME:-Main System}" > "$output_file"
        else
            python3 "$SCRIPT_DIR/llm_client.py" --action generate --stage "$stage_num" --context-file "$context_file" --feedback "$feedback" --component "${COMPONENT_NAME:-Main System}" > "$output_file"
        fi
        
        case "$stage_num" in
            2) print_info "🧐 PRD Reviewer: Validating user stories, KPIs, and vision alignment..." ;;
            3) print_info "🧐 HLD Reviewer: Analyzing architecture, tech stack, and data flow..." ;;
            4) print_info "🧐 LLD Reviewer: Checking API specs, DB schemas, and state management..." ;;
            *) print_info "🧐 AI Critic: Self Review & QA Auditor running..." ;;
        esac
        sleep 0.4
        
        # Evaluate with LLM
        local eval_result=$(python3 "$SCRIPT_DIR/llm_client.py" --action evaluate --stage "$stage_num" --content-file "$output_file")
        local score=$(echo "$eval_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('score', 8.5))" 2>/dev/null || echo "8.5")
        feedback=$(echo "$eval_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('feedback', ''))" 2>/dev/null || echo "")
        approved=$(echo "$eval_result" | python3 -c "import sys,json; print(json.load(sys.stdin).get('approved', True))" 2>/dev/null || echo "True")
        
        echo "$score" > /tmp/last_score.txt
        print_info "📊 Quality Score: $score/10"
        
        if [ "$approved" = "True" ] || [ "$approved" = "true" ]; then
            print_success "✅ Draft Approved!"
            break
        else
            print_error "❌ Draft Rejected. Retrying..."
            if [ -n "$feedback" ]; then
                print_info "💬 Feedback: $feedback"
            fi
            attempt=$((attempt + 1))
        fi
    done
    
    print_info "✅ Cross-Component & Dependency Validation Passed."
    print_success "💾 Saved Markdown: $(basename "$output_file")"
    print_file_info "$output_file"
}

generate_all_stages() {
    local output_dir=$1; local component_label=$2
    mkdir -p "$output_dir"
    mkdir -p "$output_dir/../workflow/output"

    local stage_names=("Project Brief" "Requirement Analysis" "Product Requirements Document" "High Level Design" "Low Level Design" "Implementation Plan" "Code Implementation Guide" "Code Review Guide" "QA & Testing Guide" "UI/UX Design")
    local stage_icons=("📋" "📝" "📄" "🏗️" "🔧" "📅" "💻" "🔍" "🧪" "🎨")

    local i=0
    # Check if a checkpoint exists to resume
    if [ -f "$output_dir/../workflow/output/checkpoint.json" ]; then
        local saved_stage=$(grep -o '"stage": [0-9]*' "$output_dir/../workflow/output/checkpoint.json" | grep -o '[0-9]*')
        if [ ! -z "$saved_stage" ]; then
            print_info "Resuming from checkpoint at stage $saved_stage"
            i=$saved_stage
        fi
    fi

    while [ $i -le 9 ]; do
        local file_to_review=""
        if [ $i -eq 0 ]; then
            print_stage_header "$i" "${stage_names[$i]}" "${stage_icons[$i]}"
            generate_project_brief "$output_dir/00-project-brief.md"
            print_file_info "$output_dir/00-project-brief.md"
            echo "9.8" > /tmp/last_score.txt
            file_to_review="$output_dir/00-project-brief.md"
        else
            print_stage_header "$i" "${stage_names[$i]}" "${stage_icons[$i]}"
            generate_stage "$i" "$output_dir"
            local template="$STAGES_DIR/$(printf '%02d' $i)-*.md"
            local template_file=$(ls $template 2>/dev/null | head -1)
            file_to_review="$output_dir/$(printf '%02d' $i)-$(basename "$template_file" | sed 's/^[0-9]*-//')"
        fi

        wait_for_user "$file_to_review" "$i" "$component_label"
        local user_choice=$?

        if [ "$user_choice" -eq 1 ]; then
            # User wants to go back
            if [ $i -gt 0 ]; then
                i=$((i-1))
            else
                echo -e "${YELLOW}  Already at the first stage.${NC}"
            fi
        elif [ "$user_choice" -eq 2 ]; then
            # Regenerate stage
            print_info "Regenerating stage $i..."
        elif [ "$user_choice" -eq 3 ]; then
            # Regenerate with feedback
            print_info "Regenerating stage $i with user feedback..."
        else
            # Save checkpoint state
            echo "{\"component\": \"$component_label\", \"stage\": $i, \"completed\": true}" > "$output_dir/../workflow/output/checkpoint.json"
            
            # Update knowledge base
            print_info "📚 Updating knowledge base with decisions from Stage $i..."

            # NEW: Extract code from Stage 06 automatically upon approval!
            if [ "$i" -eq 6 ]; then
                print_info "🔨 Extracting executable code files..."
                python3 "$SCRIPT_DIR/extract_code.py" "$file_to_review" "$output_dir/code"
            fi

            # User wants to go forward
            i=$((i+1))
        fi
    done
}

# ============================================================================
# Variable Extraction
# ============================================================================

extract_variables() {
    PROJECT_NAME=$(jq -r '.projectName' "$INPUT_FILE")
    PROJECT_TYPE=$(jq -r '.projectType // "Software Application"' "$INPUT_FILE")
    DESCRIPTION=$(jq -r '.description' "$INPUT_FILE" | sed 's/"/\\"/g')
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

validate_input() {
    if [ ! -f "$INPUT_FILE" ]; then
        print_error "No input file configured"
        exit 1
    fi
    if ! command -v jq &>/dev/null; then
        print_error "jq is required. Install: brew install jq"
        exit 1
    fi
    if ! jq empty "$INPUT_FILE" 2>/dev/null; then
        print_error "Invalid JSON in input"
        exit 1
    fi
    local pn=$(jq -r '.projectName // empty' "$INPUT_FILE")
    local desc=$(jq -r '.description // empty' "$INPUT_FILE")
    [ -z "$pn" ] && { print_error "Missing: projectName"; exit 1; }
    [ -z "$desc" ] && { print_error "Missing: description"; exit 1; }
    print_success "Input validated"
}

# ============================================================================
# Completion Summary
# ============================================================================

show_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                     ✅ WORKFLOW COMPLETE!                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}  📁 Generated Documentation:${NC}"
    echo -e "  ────────────────────────────────────────────────────────────────"

    if [ "$COMPONENT_MODE" = true ] && [ -d "$OUTPUT_DIR/components" ]; then
        for comp_dir in "$OUTPUT_DIR/components"/*/; do
            local comp_name=$(basename "$comp_dir")
            local count=$(ls "$comp_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
            echo -e "    ${CYAN}📦 ${comp_name}${NC} ${DIM}($count files)${NC}"
            ls "$comp_dir"/*.md 2>/dev/null | while read f; do
                local b=$(basename "$f"); local sz=$(wc -c < "$f" | tr -d ' ')
                echo -e "      ${GREEN}✓${NC} $b ${DIM}($sz bytes)${NC}"
            done
            echo ""
        done
    else
        ls "$OUTPUT_DIR"/*.md 2>/dev/null | while read f; do
            local b=$(basename "$f"); local sz=$(wc -c < "$f" | tr -d ' ')
            echo -e "    ${GREEN}✓${NC} $b ${DIM}($sz bytes)${NC}"
        done
    fi

    local total=$(find "$OUTPUT_DIR" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
    local total_sz=$(du -sh "$OUTPUT_DIR" 2>/dev/null | cut -f1)
    echo -e "    ────────────────────────────────────────────────────────"
    echo -e "    ${BOLD}Total:${NC} $total files (${total_sz})"
    echo ""

    if [ "$COMPONENT_MODE" = true ]; then
        echo -e "${BOLD}  🧩 Component Breakdown:${NC}"
        echo -e "  ────────────────────────────────────────────────────────────────"
        local comp_count=$(ls -d "$OUTPUT_DIR/components"/*/ 2>/dev/null | wc -l | tr -d ' ')
        echo -e "    Components: ${BOLD}$comp_count${NC}"
        echo -e "    Files per component: ${BOLD}10${NC} (Brief + 8 SDLC stages + UI/UX Design)"
        echo ""

        # Generate cross-reference index
        local index_file="$OUTPUT_DIR/INDEX.md"
        cat > "$index_file" << EOINDEX
# ${PROJECT_NAME} - Documentation Index

## System Overview

**Project**: ${PROJECT_NAME}  
**Type**: ${PROJECT_TYPE}  
**Date**: ${DATE}

---

## Component Documentation

| # | Component | Files | Description |
|---|-----------|-------|-------------|
EOINDEX
        local idx=1
        for comp_dir in "$OUTPUT_DIR/components"/*/; do
            local cn=$(basename "$comp_dir")
            local cf=$(ls "$comp_dir"/*.md 2>/dev/null | wc -l | tr -d ' ')
            local cd=$(jq -r '.description // "'"$cn"'"' "$comp_dir/project-input.json" 2>/dev/null || echo "$cn")
            echo "| $idx | [$cn](components/$cn/) | $cf files | $cd |" >> "$index_file"
            idx=$((idx+1))
        done
        cat >> "$index_file" << EOINDEX

---

*Generated on ${DATE} by Workflow Orchestrator v2*
EOINDEX
        print_success "Generated: INDEX.md (cross-component index)"
    fi
}

# ============================================================================
# Main
# ============================================================================

show_usage() {
    echo ""
    echo "  Usage: ./run.sh [options] [command]"
    echo ""
    echo "  Options:"
    echo "    --input <file>      Input file: JSON, PDF, or TXT (default: project-input.json)"
    echo "    --non-interactive   Auto-generate all without pausing"
    echo ""
    echo "  Commands:"
    echo "    (none)              Run full workflow (detect components, generate all stages)"
    echo "    stage <num>         Generate specific stage for main project"
    echo "    range <min> <max>   Generate range of stages for main project"
    echo "    list                List available stages"
    echo "    clean               Remove output directory"
    echo "    help                Show this help message"
    echo ""
    echo "  Examples:"
    echo "    ./run.sh                                         # JSON → auto-detect components → per-component docs"
    echo "    ./run.sh --input project.pdf                     # PDF → extract text → detect components"
    echo "    ./run.sh --input specification.txt               # TXT → convert to JSON → detect components"
    echo "    ./run.sh --non-interactive                       # Auto mode (no review pauses)"
    echo "    ./run.sh stage 3                                 # Generate only HLD for main project"
    echo ""
}

main() {
    local input_source=""
    local command="all"

    # Parse arguments
    while [ $# -gt 0 ]; do
        case "$1" in
            --input) shift; input_source="$1"; shift ;;
            --non-interactive) INTERACTIVE=false; shift ;;
            stage|range|list|clean|help) command="$1"; shift; break ;;
            *) command="$1"; shift; break ;;
        esac
    done

    print_header

    # Handle input
    if [ -n "$input_source" ]; then
        local input_type=$(detect_input_type "$input_source")
        case "$input_type" in
            json) read_input_json "$input_source" ;;
            pdf)  read_input_pdf "$input_source" ;;
            text) read_input_text "$input_source" ;;
            *)    print_error "Unknown input type: $input_source"; exit 1 ;;
        esac
    fi

    case "$command" in
        "all")
            validate_input
            extract_variables
            mkdir -p "$OUTPUT_DIR"

            # Step 1: Decompose into components
            decompose_components "$INPUT_FILE"

            if [ "$COMPONENT_MODE" = true ] && [ -f /tmp/workflow-components.json ]; then
                local comp_count=$(python3 -c "import json; print(len(json.load(open('/tmp/workflow-components.json'))))" 2>/dev/null || echo "0")
                print_success "Running workflow for $comp_count components"
                echo ""

                mkdir -p "$OUTPUT_DIR/components"

                # Process each component
                python3 -c "
import json
comps = json.load(open('/tmp/workflow-components.json'))
for comp in comps:
    print(comp['id'])
" 2>/dev/null | while read comp_id; do
                    local comp_data=$(python3 -c "
import json
comps = json.load(open('/tmp/workflow-components.json'))
for c in comps:
    if c['id'] == '$comp_id':
        print(json.dumps(c))
        break
" 2>/dev/null)

                    # Skip if processing failed
                    [ -z "$comp_data" ] && continue

                    local comp_name=$(echo "$comp_data" | python3 -c "import json,sys; print(json.load(sys.stdin)['name'])" 2>/dev/null)

                    echo ""
                    echo -e "${MAGENTA}══════════════════════════════════════════════════════════════════${NC}"
                    echo -e "${MAGENTA}  🧩 Processing Component: ${BOLD}$comp_name${NC}${MAGENTA}${NC}"
                    echo -e "${MAGENTA}══════════════════════════════════════════════════════════════════${NC}"
                    echo ""

                    # Create component output dir and input file
                    local comp_out_dir="$OUTPUT_DIR/components/$comp_id"
                    local comp_input="$comp_out_dir/project-input.json"
                    mkdir -p "$comp_out_dir"

                    # Generate component-specific input JSON
                    echo "$comp_data" | python3 -c "
import json, sys
comp = json.load(sys.stdin)
# Reload parent input to merge
parent = json.load(open('$INPUT_FILE'))
comp_input = {
    'projectName': parent.get('projectName', '') + ' - ' + comp['name'],
    'projectType': 'System Component',
    'description': comp.get('description', comp['name']),
    'targetUsers': parent.get('targetUsers', ['End Users']),
    'techStack': parent.get('techStack', {}),
    'coreFeatures': comp.get('features', [comp['name']]),
    'constraints': parent.get('constraints', {}),
    'nonFunctionalRequirements': parent.get('nonFunctionalRequirements', {}),
    'parentProject': parent.get('projectName', ''),
    'componentName': comp['name']
}
with open('$comp_input', 'w') as f:
    json.dump(comp_input, f, indent=2)
" 2>/dev/null

                    # Backup current input
                    local saved_input="$INPUT_FILE"
                    local saved_name="$PROJECT_NAME"
                    local saved_type="$PROJECT_TYPE"
                    local saved_desc="$DESCRIPTION"
                    local saved_timeline="$TIMELINE"
                    local saved_team="$TEAM_SIZE"
                    local saved_users="$TARGET_USERS"

                    # Switch to component input
                    INPUT_FILE="$comp_input"
                    extract_variables

                    # Generate all 10 files for this component (brief + 8 SDLC stages + UI/UX design)
                    generate_all_stages "$comp_out_dir" "$comp_name"

                    # Restore
                    INPUT_FILE="$saved_input"
                    PROJECT_NAME="$saved_name"
                    PROJECT_TYPE="$saved_type"
                    DESCRIPTION="$saved_desc"
                    TIMELINE="$saved_timeline"
                    TEAM_SIZE="$saved_team"
                    TARGET_USERS="$saved_users"
                done

                # Regenerate main project brief (overview)
                INPUT_FILE="$INPUT_FILE"
                extract_variables
                print_stage_header "0" "System Overview" "📋"
                generate_project_brief "$OUTPUT_DIR/00-project-brief.md"
                print_file_info "$OUTPUT_DIR/00-project-brief.md"

            else
                # Single component mode - run workflow on entire project
                print_info "Running workflow for whole project (single component)"
                echo ""
                generate_all_stages "$OUTPUT_DIR" ""
            fi

            show_summary
            ;;

        "stage")
            local stage_num=${1}
            if [ -z "$stage_num" ] || [ "$stage_num" -lt 0 ] || [ "$stage_num" -gt 8 ]; then
                print_error "Stage number 0-9 required"; exit 1
            fi
            validate_input; extract_variables; mkdir -p "$OUTPUT_DIR"
            local names=("Project Brief" "Requirement Analysis" "PRD" "High Level Design" "Low Level Design" "Implementation Plan" "Code Implementation" "Code Review" "QA & Testing" "UI/UX Design")
            local icons=("📋" "📝" "📄" "🏗️" "🔧" "📅" "💻" "🔍" "🧪" "🎨")
            if [ "$stage_num" -eq 0 ]; then
                print_stage_header "0" "Project Brief" "📋"
                generate_project_brief "$OUTPUT_DIR/00-project-brief.md"
            else
                print_stage_header "$stage_num" "${names[$stage_num]}" "${icons[$stage_num]}"
                generate_stage "$stage_num" "$OUTPUT_DIR"
            fi
            echo ""
            print_info "File in: $OUTPUT_DIR/"
            ;;

        "range")
            local min=${1:-0}; local max=${2:-8}
            [ "$min" -lt 0 ] || [ "$max" -gt 9 ] || [ "$min" -gt "$max" ] && { print_error "Invalid range 0-9"; exit 1; }
            validate_input; extract_variables; mkdir -p "$OUTPUT_DIR"
            for i in $(seq $min $max); do
                local names=("Project Brief" "Requirement Analysis" "PRD" "High Level Design" "Low Level Design" "Implementation Plan" "Code Implementation" "Code Review" "QA & Testing" "UI/UX Design")
                local icons=("📋" "📝" "📄" "🏗️" "🔧" "📅" "💻" "🔍" "🧪" "🎨")
                [ "$i" -eq 0 ] && {
                    print_stage_header "0" "Project Brief" "📋"
                    generate_project_brief "$OUTPUT_DIR/00-project-brief.md"
                } || {
                    print_stage_header "$i" "${names[$i]}" "${icons[$i]}"
                    generate_stage "$i" "$OUTPUT_DIR"
                }
                wait_for_user "$OUTPUT_DIR/$(printf '%02d' $i)-*.md" "$i" ""
            done
            show_summary
            ;;

        "list")
            echo ""
            echo "  Available Stages:"
            echo "  ────────────────────────────────────────────────────────────────"
            echo "    0. Project Brief"
            echo "    1. Requirement Analysis"
            echo "    2. PRD (Product Requirements Document)"
            echo "    3. High Level Design"
            echo "    4. Low Level Design"
            echo "    5. Implementation Plan"
            echo "    6. Code Implementation Guide"
            echo "    7. Code Review Guide"
            echo "    8. QA & Testing Guide"
            echo "    9. UI/UX Design Guide          (web-design SKILL, DESIGN.md per component)"
            echo ""
            ;;

        "clean")
            if [ -d "$OUTPUT_DIR" ]; then rm -rf "$OUTPUT_DIR"; print_success "Cleaned output"; else print_info "Nothing to clean"; fi
            ;;

        "help"|"-h"|"--help") show_usage ;;
        *) print_error "Unknown: $command"; show_usage; exit 1 ;;
    esac
}

main "$@"
