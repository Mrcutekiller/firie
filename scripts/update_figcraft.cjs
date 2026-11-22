const fs = require('fs');

const doc = JSON.parse(fs.readFileSync('design/unpacked/document.json', 'utf8'));

// Helper to set characters of a text node
function setText(id, text) {
  if (doc.nodes[id] && doc.nodes[id].type === 'text') {
    doc.nodes[id].characters = text;
  }
}

// 1. Screen 1: Outfits (Home)
for (const id of doc.nodes[105].children) {
  const n = doc.nodes[id];
  if (!n) continue;
  if (n.name === 'DateHm') n.characters = 'Good evening, Biruk.';
  if (n.name === 'WeatherTextHm') n.characters = '☀️ 15°C Addis Ababa';
  if (n.name === 'MatchTagTextHm') n.characters = '92% Match';
  if (n.name === 'NextBtnTextHm') n.characters = '🔄 Change Outfit';
  if (n.name === 'CheckinTextHm') n.characters = '✓ I Wore This';
  if (n.name === 'GTopLabelHm') n.characters = 'Olive Jacket';
  if (n.name === 'GBotLabelHm') n.characters = 'Beige Pants';
  if (n.name === 'GShoesLabelHm') n.characters = 'White Sneakers';
  if (n.name === 'WhyT1Hm') n.characters = 'Relaxed Urban Look';
  if (n.name === 'WhyT2Hm') n.characters = 'Perfect for casual outings and hangouts.';
}

// 2. Screen 2: Digital Closet
for (const id of doc.nodes[185].children) {
  const n = doc.nodes[id];
  if (!n) continue;
  if (n.name === 'ClosetHeader') n.characters = 'My Closet';
  if (n.name === 'ClosetSub') n.characters = 'Your digital wardrobe';
  if (n.name === 'AddClothesPillText') n.characters = '+';
  if (n.name === 'SearchBtnT') n.characters = 'Wardrobe Pieces (128) | Saved Looks (12)';
}

// 3. Screen 3: Photo Style Camera
for (const id of doc.nodes[248].children) {
  const n = doc.nodes[id];
  if (!n) continue;
  if (n.name === 'WordmarkCam') n.characters = 'FITLY';
  if (n.name === 'ContextPillTextCam') n.characters = '📍 Cafe · White sneakers · Navy shirt ⌄';
  if (n.name === 'InstT') n.characters = 'Low angle · show the shoes';
  if (n.name === 'InstS') n.characters = 'Hold the phone at knee height and step back two steps.';
  if (n.name === 'PCT_STAND') n.characters = 'Cool Look';
  if (n.name === 'PCT_SITDOWN') n.characters = 'Side Pose';
  if (n.name === 'PCT_DAILY') n.characters = 'Street Vibe';
  if (n.name === 'PCT_TRAVEL') n.characters = 'Chill Stance';
}

// 4. Screen 4: Date Spots
for (const id of doc.nodes[340].children) {
  const n = doc.nodes[id];
  if (!n) continue;
  if (n.name === 'DateSpotTitle') n.characters = 'Find Your Perfect Spot';
  if (n.name === 'DateSpotSub') n.characters = 'Great places. Better dates. 💖';
  if (n.name === 'VSub1') n.characters = 'Awaiting real venues, menus and prices from user.';
}

// 5. Screen 5: Profile & Settings
for (const id of doc.nodes[402].children) {
  const n = doc.nodes[id];
  if (!n) continue;
  if (n.name === 'ProfName') n.characters = 'Biruk Fikru';
  if (n.name === 'ProfSub') n.characters = 'biruk13r@gmail.com';
  if (n.name === 'ProBadgeT') n.characters = '👑 PRO';
  if (n.name === 'SRT_3') n.characters = 'FITLY Pro Member · Manage';
}

fs.writeFileSync('design/unpacked/document.json', JSON.stringify(doc, null, 2), 'utf8');
console.log('Successfully updated design/unpacked/document.json!');
