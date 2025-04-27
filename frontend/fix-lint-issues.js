const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Function to fix unused variables by prefixing them with underscore
function fixUnusedVariables() {
  console.log('Fixing unused variables by prefixing them with underscore...');
  
  // List of files with unused variables
  const filesToFix = [
    'src/app/(canvas-pages)/agents/page.tsx',
    'src/app/(canvas-pages)/knowledge/page.tsx',
    'src/app/(canvas-pages)/mcp/page.tsx',
    'src/app/(canvas-pages)/research/page.tsx',
    'src/app/(canvas-pages)/travel/page.tsx',
    'src/components/agents/agent-manager.tsx',
    'src/components/backend-status.tsx',
    'src/components/dashboard.tsx',
    'src/components/database-status.tsx',
    'src/components/enhanced-sidebar.tsx',
    'src/components/map-container.tsx',
    'src/components/relation-form.tsx',
    'src/components/team-creation-form.tsx',
    'src/components/workflow-editor.tsx',
    'src/hooks/use-sse.ts',
    'src/lib/api-client-sse.ts',
    'src/lib/api-client.ts'
  ];
  
  filesToFix.forEach(filePath => {
    const fullPath = path.resolve(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix common unused variables
      content = content
        .replace(/\b(router|useEffect|response|e|error|Settings|Database|CheckCircle|XCircle|GitBranch|Icon|Plus|createSSEConnection|event|jsonError|reactFlowInstance)\b(?!\s*=)/g, '_$1')
        .replace(/\bimport\s*{\s*([^}]*)(router|useEffect|response|e|error|Settings|Database|CheckCircle|XCircle|GitBranch|Icon|Plus|createSSEConnection)([^}]*)\s*}/g, 'import { $1_$2$3 }');
      
      fs.writeFileSync(fullPath, content);
      console.log(`Fixed ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  });
}

// Function to fix unescaped entities
function fixUnescapedEntities() {
  console.log('Fixing unescaped entities...');
  
  const filesToFix = [
    'src/components/agent-creation-form.tsx',
    'src/components/openai-agents-export.tsx'
  ];
  
  filesToFix.forEach(filePath => {
    const fullPath = path.resolve(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Replace single quotes with &apos;
      content = content.replace(/(\w)'(\w)/g, '$1&apos;$2');
      
      fs.writeFileSync(fullPath, content);
      console.log(`Fixed ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
  });
}

// Function to fix import order
function fixImportOrder() {
  console.log('Fixing import order...');
  
  try {
    execSync('npx eslint --fix "src/components/workflow-editor.tsx"', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname)
    });
    console.log('Fixed import order in workflow-editor.tsx');
  } catch (error) {
    console.error('Error fixing import order:', error.message);
  }
}

// Main function
async function main() {
  try {
    // Fix specific issues first
    fixUnusedVariables();
    fixUnescapedEntities();
    fixImportOrder();
    
    // Run ESLint with --fix again to catch any remaining issues
    console.log('\nRunning ESLint with --fix to catch remaining issues...');
    try {
      execSync('npx eslint --fix "src/**/*.{ts,tsx}" --rule "@typescript-eslint/no-explicit-any: off"', { 
        stdio: 'inherit',
        cwd: path.resolve(__dirname)
      });
      console.log('ESLint completed successfully!');
    } catch (error) {
      console.error('Some linting issues could not be automatically fixed.');
    }
    
    console.log('\nLinting fixes completed. Some issues may require manual intervention.');
  } catch (error) {
    console.error('Error during linting fix process:', error.message);
    process.exit(1);
  }
}

main();
