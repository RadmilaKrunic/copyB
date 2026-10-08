#!/bin/bash
# Process a single agent template file

TEMPLATE_DIR="C:/Users/RNR9FE/.claude/plugins/cache/claudboard/claudboard/4.0.0-beta.14/skills/claudboard-workflow/references/feature-workflow.template/agents"
OUTPUT_DIR="C:/Projects/Bass/bassnext.web/.claude/skills/feature-workflow/agents"

PREAMBLE="You are a scoped sub-agent. Execute the action specified by the \`action\`
field of the INPUT CONTEXT block your caller provides. Your tool access is
limited by the frontmatter \`allowedTools\` — do not attempt tool calls outside
that set. When done, emit a single JSON result block as your final output;
emit nothing after it so the caller can parse it reliably."

CONTEXT_LOADING="Before doing your specific work, load THIS repo's context.
Read in this order:

1. \`CLAUDE.md\` at the root — stack, conventions, base package, DI/logging/test pattern
2. \`.claude/rules/*.md\` — \`paths:\` frontmatter tells you which rules apply to each file
3. \`.claude/memories/\` — cross-service/ecosystem context
4. \`.claude/skills/\` — list project skills; follow their recipes if relevant

If any file is missing, note it in \`risks\` (or \`openQuestions\` if this agent
emits that field) and continue with what's available."

process_file() {
    local input="$1"
    local output="$2"
    
    # Read template
    content=$(cat "$input")
    
    # Remove IF blocks
    content=$(echo "$content" | perl -0777 -pe 's/<!-- IF \w+ -->.*?<!-- ENDIF -->//gs')
    
    # Expand INCLUDE directives
    content=$(echo "$content" | sed "s|{{INCLUDE references/agent-preamble.md}}|$PREAMBLE|g")
    content=$(echo "$content" | sed "s|{{INCLUDE references/agent-context-loading.md}}|$CONTEXT_LOADING|g")
    
    # Replace variables
    content=$(echo "$content" | sed 's/{{PROJECT_NAME}}/bassnext.web/g')
    content=$(echo "$content" | sed 's/{{REPO_NAME}}/bassnext.web/g')
    content=$(echo "$content" | sed 's/{{STACK_NAME}}/React 19 + TypeScript + Vite/g')
    content=$(echo "$content" | sed 's/{{TEST_FRAMEWORK}}/Vitest + @testing-library\/react/g')
    content=$(echo "$content" | sed 's/{{BASE_PACKAGE}}//g')
    content=$(echo "$content" | sed 's/{{BUILD_CMD}}/npm run build/g')
    content=$(echo "$content" | sed 's/{{TEST_CMD}}/npm run test/g')
    content=$(echo "$content" | sed 's/{{LINT_CMD}}/npm run lint/g')
    content=$(echo "$content" | sed 's/{{TICKET_PREFIX}}/PTBASS/g')
    content=$(echo "$content" | sed 's/{{REPO_OR_SERVICE_LABEL}}/repo/g')
    content=$(echo "$content" | sed 's/{{STACK_REMINDERS}}//g')
    content=$(echo "$content" | sed 's/{{BASE_PACKAGE_PATH}}/src/g')
    
    echo "$content" > "$output"
}

# Process git-agent first (simpler, no reviewer-protocol)
process_file "$TEMPLATE_DIR/git-agent.md.template" "$OUTPUT_DIR/git-agent.md"
echo "Processed git-agent.md"
