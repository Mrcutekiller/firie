const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('design/unpacked/document.json', 'utf8'));

function printChildren(id, depth = 0) {
  const node = doc.nodes[id];
  if (!node) return;
  const indent = '  '.repeat(depth);
  console.log(`${indent}- [${node.id}] ${node.name} (${node.type})`);
  if (node.children && depth < 2) {
    for (const c of node.children.slice(0, 10)) {
      printChildren(c, depth + 1);
    }
    if (node.children.length > 10) {
      console.log(`${indent}  ... (${node.children.length - 10} more)`);
    }
  }
}

console.log('--- Outfits (Home) ---');
printChildren(105);
console.log('\n--- Camera ---');
printChildren(248);
