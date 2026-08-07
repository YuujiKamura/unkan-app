const fs = require('fs');
const file = 'src/components/QuestionOptionsRenderer.tsx';
let content = fs.readFileSync(file, 'utf-8');

// 1. Add ReactDOM import if not present
if (!content.includes('import ReactDOM from')) {
  content = content.replace('import React from \'react\';', 'import React from \'react\';\nimport ReactDOM from \'react-dom\';');
}

// 2. Wrap renderContextMenu with createPortal
const target = 'return (\n      <div style={{\n        position: \'fixed\',';
const replacement = 'if (typeof document === "undefined") return null;\n    return ReactDOM.createPortal(\n      <div style={{\n        position: \'fixed\',';

content = content.replace(target, replacement);

const targetEnd = '🤖 AIに解説を求める(コピー)\n        </button>\n      </div>\n    );\n  };';
const replacementEnd = '🤖 AIに解説を求める(コピー)\n        </button>\n      </div>,\n      document.body\n    );\n  };';

content = content.replace(targetEnd, replacementEnd);

fs.writeFileSync(file, content, 'utf-8');
console.log('Fixed context menu position with createPortal.');
