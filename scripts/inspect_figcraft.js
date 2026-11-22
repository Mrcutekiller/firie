const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('design/unpacked/document.json', 'utf8'));
const page1 = doc.nodes[1];
console.log('Current frames in Page 1:');
for (const id of page1.children) {
  const n = doc.nodes[id];
  console.log(`- ID: ${id}, Name: ${n.name}, Width: ${n.width}, Height: ${n.height}, Transform: ${JSON.stringify(n.transform)}`);
}
