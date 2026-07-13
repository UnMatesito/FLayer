#!/bin/bash
set -e

echo "🔍 Verifying SDD harness..."

# 1. Only 1 feature can be in_progress
IN_PROGRESS=$(grep -c '"status": "in_progress"' feature_list.json || true)
if [ "$IN_PROGRESS" -gt 1 ]; then
  echo "❌ ERROR: $IN_PROGRESS features are 'in_progress'. Only 1 allowed."
  exit 1
fi

# 2. Every non-pending feature must have complete specs
FEATURES=$(python3 -c "
import json
data = json.load(open('feature_list.json'))
for f in data['features']:
    if f['status'] != 'pending':
        print(f['name'])
")

for feature in $FEATURES; do
  dir="specs/$feature"
  for file in requirements.md design.md tasks.md; do
    if [ ! -f "$dir/$file" ]; then
      echo "❌ ERROR: missing $dir/$file (feature '$feature' is no longer pending)"
      exit 1
    fi
  done
done

# 3. Every in_progress feature must have progress/impl_<feature>.md
INPROGRESS_FEATURES=$(python3 -c "
import json
data = json.load(open('feature_list.json'))
for f in data['features']:
    if f['status'] == 'in_progress':
        print(f['name'])
")

for feature in $INPROGRESS_FEATURES; do
  if [ ! -f "progress/impl_$feature.md" ]; then
    echo "❌ ERROR: feature '$feature' is in_progress but missing progress/impl_$feature.md"
    exit 1
  fi
done

# 4. Run tests if they exist
if [ -d "src/tests" ] && command -v pytest &> /dev/null; then
  echo "🧪 Running tests..."
  (cd src && pytest tests/ -q) || { echo "❌ Tests failed"; exit 1; }
fi

# 5. Load local models
if [ -f "opencode.json" ]; then
  echo "📦 Loading local models..."
  opencode load opencode.json
fi

echo "✓ Verification OK"
exit 0
