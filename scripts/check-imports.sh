#!/bin/bash
# Script to check for missing imports in TypeScript files
echo "Checking for missing imports..."

# Find all .tsx and .ts files that import components
grep -r "import.*from.*\./" src --include="*.tsx" --include="*.ts" | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  import_path=$(echo "$line" | grep -oP "from ['\"].*?['\"]" | sed "s/from ['\"]\\.\\//from '\.\//" | sed "s/['\"]//")
  
  if [[ "$import_path" == *"./"* ]]; then
    # Extract relative path
    dir=$(dirname "$file")
    full_path="$dir/$import_path"
    
    # Check if file exists (with .tsx or .ts extension)
    if [ ! -f "${full_path}.tsx" ] && [ ! -f "${full_path}.ts" ]; then
      echo "⚠️  Potential missing import: $file -> $import_path"
    fi
  fi
done

echo "Done!"

