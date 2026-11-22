const fs = require('fs');
const doc = JSON.parse(fs.readFileSync('design/unpacked/document.json', 'utf8'));

function inspectTexts(frameId) {
  const frame = doc.nodes[frameId];
  console.log(`=== ${frame.name} ===`);
  for (const c of frame.children) {
    const n = doc.nodes[c];
    if (n && n.type === 'text') {
      console.log(`  [${n.name}] "${n.characters}"`);
    }
  }
}

inspectTexts(105);
inspectTexts(185);
inspectTexts(248);
inspectTexts(340);
inspectTexts(402);
