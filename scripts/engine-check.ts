/**
 * Temporary engine verification harness (not shipped in the app bundle).
 * Run with: npx --yes tsx scripts/engine-check.ts
 */
import { canGenerate, generateOutfits } from "../src/lib/engine";
import { isNeutralColor, type ClosetItem, type Slot, type Style } from "../src/lib/types";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log("  PASS", name);
  } else {
    fail++;
    console.log("  FAIL", name);
  }
}

function item(
  id: string,
  slot: Slot,
  color: string,
  style: Style,
  extra: Partial<ClosetItem> = {}
): ClosetItem {
  return {
    id,
    name: id,
    category: slot === "top" ? "tops" : slot === "bottom" ? "bottoms" : slot === "shoes" ? "shoes" : "accessories",
    slot,
    color,
    colorHex: "#000000",
    isNeutral: isNeutralColor(color),
    style,
    season: "all",
    imageUrl: "",
    tags: [],
    createdAt: 0,
    lastWornAt: null,
    timesWorn: 0,
    ...extra,
  };
}

console.log("\n1. Missing-slot detection");
{
  const closet = [item("t1", "top", "White", "casual")];
  const r = canGenerate(closet);
  check("reports missing bottom + shoes", !r.ok && r.missing.includes("bottom") && r.missing.includes("shoes"));
  const g = generateOutfits(closet, { plan: "free" });
  check("generates nothing when incomplete", g.outfits.length === 0);
}

const baseCloset: ClosetItem[] = [
  item("top-white", "top", "White", "classy"),
  item("top-navy", "top", "Navy", "casual"),
  item("top-red", "top", "Red", "casual"),
  item("bot-charcoal", "bottom", "Charcoal", "classy"),
  item("bot-denim", "bottom", "Denim", "casual"),
  item("shoe-white", "shoes", "White", "casual"),
  item("shoe-brown", "shoes", "Brown", "classy"),
  item("cap-navy", "cap", "Navy", "casual"),
  item("ring-gold", "ring", "Gold", "classy"),
  item("kemis", "top", "Ivory", "traditional"),
];

console.log("\n2. Required slots always present");
{
  const { outfits } = generateOutfits(baseCloset, { plan: "free", seed: 1 });
  check("generated at least one outfit", outfits.length > 0);
  check(
    "every outfit has top + bottom + shoes",
    outfits.every((o) => {
      const slots = o.itemIds
        .map((id) => baseCloset.find((i) => i.id === id)!.slot);
      return slots.includes("top") && slots.includes("bottom") && slots.includes("shoes");
    })
  );
}

console.log("\n3. Colour rule — at most one bold colour");
{
  const { outfits } = generateOutfits(baseCloset, { plan: "free", seed: 2 });
  check(
    "no outfit has two bold colours",
    outfits.every((o) => {
      const bold = o.itemIds
        .map((id) => baseCloset.find((i) => i.id === id)!)
        .filter((i) => !i.isNeutral);
      return bold.length <= 1;
    })
  );
}

console.log("\n4. Style consistency");
{
  const { outfits } = generateOutfits(baseCloset, { plan: "free", seed: 3 });
  check(
    "required pieces never mix refined with relaxed",
    outfits.every((o) => {
      const req = o.itemIds
        .map((id) => baseCloset.find((i) => i.id === id)!)
        .filter((i) => ["top", "bottom", "shoes"].includes(i.slot));
      const refined = req.filter((i) => ["classy", "formal", "traditional"].includes(i.style)).length;
      return refined === 0 || refined === req.length;
    })
  );
}

console.log("\n5. Optional cap / ring inclusion");
{
  const { outfits } = generateOutfits(baseCloset, { plan: "free", seed: 4 });
  const withCap = outfits.some((o) => o.itemIds.includes("cap-navy"));
  const withRing = outfits.some((o) => o.itemIds.includes("ring-gold"));
  check("a cap is included when available & compatible", withCap);
  check("a ring is included when available", withRing);
}

console.log("\n6. Recency — recently worn items are demoted");
{
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const closet: ClosetItem[] = [
    item("a-top", "top", "White", "casual", { lastWornAt: now - 1 * DAY }),
    item("b-top", "top", "White", "casual", { lastWornAt: now - 40 * DAY }),
    item("bot", "bottom", "Grey", "casual", { lastWornAt: now - 40 * DAY }),
    item("shoe", "shoes", "Black", "casual", { lastWornAt: now - 40 * DAY }),
  ];
  const { outfits } = generateOutfits(closet, {
    plan: "free",
    recentItemIds: ["a-top"],
    season: "summer",
  });
  check("the freshly-worn top is not rank #1", outfits[0] && !outfits[0].itemIds.includes("a-top"));
}

console.log("\n7. Pro weather scoring");
{
  const closet: ClosetItem[] = [
    item("summer-top", "top", "White", "casual", { season: "summer" }),
    item("winter-top", "top", "Grey", "casual", { season: "winter" }),
    item("bot", "bottom", "Beige", "casual"),
    item("shoe", "shoes", "White", "casual"),
  ];
  const hot = generateOutfits(closet, {
    plan: "pro",
    season: "summer",
    weather: { city: "Addis Ababa", temperatureC: 33, condition: "Clear sky", icon: "☀️", capturedAt: 0 },
    seed: 9,
  });
  const cold = generateOutfits(closet, {
    plan: "pro",
    season: "summer",
    weather: { city: "Addis Ababa", temperatureC: 6, condition: "Clear sky", icon: "☀️", capturedAt: 0 },
    seed: 9,
  });
  check("hot weather ranks the summer top first", hot.outfits[0]?.itemIds.includes("summer-top"));
  check("cold weather ranks the winter top first", cold.outfits[0]?.itemIds.includes("winter-top"));
  check("pro outfits carry a 'wear this because' reason", Boolean(hot.outfits[0]?.reason));
  const free = generateOutfits(closet, { plan: "free", seed: 9 });
  check("free outfits have no Pro reason", !free.outfits[0]?.reason);
}

console.log("\n8. Traditional pieces are usable");
{
  const { outfits } = generateOutfits(baseCloset, { plan: "free", seed: 5 });
  check(
    "the habesha kemis appears in at least one outfit",
    outfits.some((o) => o.itemIds.includes("kemis"))
  );
}

console.log(`\nResult: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
