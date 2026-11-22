/**
 * FITLY Photo Style Camera — pose library.
 *
 * Every pose is defined as explicit body-joint coordinates so the
 * `PoseFigure` component can draw an ORIGINAL transparent line illustration
 * for it — full head, neck, shoulders, arms, elbows, hands, torso, waist,
 * hips, legs, knees, ankles, feet and shoe positions, plus direction arrows,
 * dotted alignment lines, camera direction/height and distance markers.
 *
 * No photographs of people and no copied pose images are used anywhere:
 * the whole library is FITLY-owned vector artwork generated from this data.
 *
 * Endpoint mapping (implemented in photoStyle.ts / api.ts):
 *   POST /api/photo-style/recommend → recommendPoses()
 */

import type { Style } from "./types";

/* -------------------------------------------------------------------------- */
/* Shared feature vocabulary                                                   */
/* -------------------------------------------------------------------------- */

/** Structures a pose needs to exist in the real background. */
export type EnvFeature =
  | "open-space"
  | "wall"
  | "chair"
  | "table"
  | "bench"
  | "stairs"
  | "mirror"
  | "doorway"
  | "window"
  | "railing"
  | "grass"
  | "water";

/** Recognised environment types (kept in sync with photoStyle.ts). */
export type PlaceType =
  | "cafe"
  | "restaurant"
  | "street"
  | "garden"
  | "park"
  | "mall"
  | "beach"
  | "home"
  | "bedroom"
  | "hotel"
  | "rooftop"
  | "staircase"
  | "building"
  | "office"
  | "indoor"
  | "outdoor"
  | "other";

export type PhotoFormat = "story" | "portrait" | "square";

export const PHOTO_FORMAT_LABELS: Record<PhotoFormat, string> = {
  story: "Story · 9:16",
  portrait: "Portrait · 4:5",
  square: "Square · 1:1",
};

/* -------------------------------------------------------------------------- */
/* Illustration geometry                                                       */
/* -------------------------------------------------------------------------- */

export interface Pt {
  x: number;
  y: number;
}

/** Complete skeletal layout — every pose supplies its own coordinates. */
export interface PoseJoints {
  head: { x: number; y: number; r: number };
  neck: Pt;
  shoulderL: Pt;
  shoulderR: Pt;
  elbowL: Pt;
  elbowR: Pt;
  handL: Pt;
  handR: Pt;
  chest: Pt;
  waist: Pt;
  hipL: Pt;
  hipR: Pt;
  kneeL: Pt;
  kneeR: Pt;
  ankleL: Pt;
  ankleR: Pt;
  toeL: Pt;
  toeR: Pt;
  /** Which way the feet/shoes point — changes how shoes are drawn. */
  facing: "front" | "back" | "side";
}

export type PoseProp =
  | { kind: "wall"; x: number; y1: number; y2: number }
  | { kind: "chair"; x: number; y: number }
  | { kind: "table"; x: number; y: number }
  | { kind: "stairs"; steps: { x: number; y: number; w: number }[] }
  | { kind: "mirror"; x: number; y: number; w: number; h: number }
  | { kind: "drape" };

export type PoseMark =
  | { kind: "arrow"; from: Pt; to: Pt; label?: string }
  | { kind: "line"; from: Pt; to: Pt; label?: string }
  | { kind: "camera"; pos: Pt; target: Pt; label: string }
  | { kind: "distance"; from: Pt; to: Pt; label: string }
  | { kind: "frame"; x: number; y: number; w: number; h: number; label: string };

/* -------------------------------------------------------------------------- */
/* Pose specification                                                          */
/* -------------------------------------------------------------------------- */

export interface PoseBodyCopy {
  head: string;
  shoulders: string;
  arms: string;
  hands: string;
  torso: string;
  leftLeg: string;
  rightLeg: string;
  feet: string;
  shoes: string;
}

export interface PoseSpec {
  id: string;
  /** Full display name, e.g. "Low Angle — Show Your Shoes". */
  name: string;
  /** Short chip label used in the camera pose selector. */
  chip: string;
  /** One-line instruction shown on the camera instruction card. */
  tagline: string;
  /** The story/post format this pose is built for. */
  story: string;
  /** Place types where this pose works. */
  fitsPlaceTypes: PlaceType[];
  /** Hard requirements — the pose is never suggested without these. */
  requires: EnvFeature[];
  /** Nice-to-have structures that boost the score. */
  prefers: EnvFeature[];
  /** Outfit styles this pose flatters. */
  outfitStyles: Style[];
  formats: PhotoFormat[];
  /** Free plan includes this pose; Pro unlocks the rest. */
  free: boolean;
  camera: {
    angle: "low" | "eye-level" | "high" | "top-down";
    height: string;
    distance: string;
    direction: string;
  };
  body: PoseBodyCopy;
  background: string;
  lighting: string;
  tip: string;
  figure: PoseJoints;
  props: PoseProp[];
  marks: PoseMark[];
}

/* -------------------------------------------------------------------------- */
/* Library                                                                     */
/* -------------------------------------------------------------------------- */

export const POSES: PoseSpec[] = [
  {
    id: "low-angle-shoes",
    name: "Low Angle — Show Your Shoes",
    chip: "Low Angle",
    tagline: "Hold the phone at knee height and step back two steps.",
    story: "Built for Stories — makes legs look longer and puts your sneakers centre frame.",
    fitsPlaceTypes: ["cafe", "street", "restaurant", "outdoor", "indoor", "mall", "other"],
    requires: [],
    prefers: ["wall", "open-space"],
    outfitStyles: ["streetwear", "casual", "sporty"],
    formats: ["story", "portrait"],
    free: true,
    camera: {
      angle: "low",
      height: "around knee height",
      distance: "step back approximately two steps",
      direction: "slightly below your eyeline, angled up",
    },
    body: {
      head: "Turn slightly right.",
      shoulders: "Relax both shoulders.",
      arms: "Place hands in your pockets.",
      hands: "Keep your hands relaxed in your pockets.",
      torso: "Keep your body straight.",
      leftLeg: "Move slightly forward.",
      rightLeg: "Keep relaxed.",
      feet: "Point both feet slightly outward.",
      shoes: "Keep both shoes visible.",
    },
    background: "Keep the café environment visible behind you.",
    lighting: "Stand with the light on your face, not behind you.",
    tip: "Ask your photographer to crouch — the lower the camera, the longer the legs.",
    figure: {
      head: { x: 100, y: 42, r: 15 },
      neck: { x: 100, y: 60 },
      shoulderL: { x: 78, y: 74 },
      shoulderR: { x: 122, y: 74 },
      elbowL: { x: 73, y: 108 },
      elbowR: { x: 127, y: 108 },
      handL: { x: 81, y: 146 },
      handR: { x: 119, y: 146 },
      chest: { x: 100, y: 94 },
      waist: { x: 100, y: 148 },
      hipL: { x: 86, y: 160 },
      hipR: { x: 114, y: 160 },
      kneeL: { x: 92, y: 228 },
      kneeR: { x: 112, y: 230 },
      ankleL: { x: 84, y: 298 },
      ankleR: { x: 114, y: 300 },
      toeL: { x: 74, y: 310 },
      toeR: { x: 124, y: 310 },
      facing: "front",
    },
    props: [],
    marks: [
      { kind: "frame", x: 14, y: 36, w: 172, h: 268, label: "café background" },
      { kind: "camera", pos: { x: 24, y: 262 }, target: { x: 78, y: 292 }, label: "knee height" },
      { kind: "distance", from: { x: 24, y: 330 }, to: { x: 176, y: 330 }, label: "2 steps back" },
      { kind: "line", from: { x: 44, y: 42 }, to: { x: 156, y: 42 }, label: "" },
    ],
  },
  {
    id: "full-body-editorial",
    name: "Full Body Editorial",
    chip: "Full Body",
    tagline: "Stand tall, weight on one leg, and let the frame breathe.",
    story: "A clean head-to-toe shot that reads like a magazine page — works for feed posts.",
    fitsPlaceTypes: ["street", "building", "outdoor", "indoor", "hotel", "mall", "other", "restaurant"],
    requires: [],
    prefers: ["wall", "open-space", "doorway"],
    outfitStyles: ["classy", "formal", "casual", "traditional"],
    formats: ["portrait", "square"],
    free: true,
    camera: {
      angle: "eye-level",
      height: "chest height",
      distance: "three to four steps back",
      direction: "straight on, centred",
    },
    body: {
      head: "Chin level, look just past the lens.",
      shoulders: "Roll them back and down.",
      arms: "One hand on your hip, one relaxed.",
      hands: "Soft fingers — avoid clenched fists.",
      torso: "Stand tall with a slight twist.",
      leftLeg: "Take the weight — hip pushed out.",
      rightLeg: "Relaxed, knee soft.",
      feet: "One foot a hand-width in front of the other.",
      shoes: "Show the full profile of both shoes.",
    },
    background: "Leave clean space above your head; avoid clutter directly behind.",
    lighting: "Face the light source for even, flattering exposure.",
    tip: "Exhale before the shot — it drops your shoulders and relaxes your jaw.",
    figure: {
      head: { x: 100, y: 38, r: 15 },
      neck: { x: 100, y: 56 },
      shoulderL: { x: 79, y: 70 },
      shoulderR: { x: 121, y: 70 },
      elbowL: { x: 68, y: 102 },
      elbowR: { x: 131, y: 104 },
      handL: { x: 85, y: 140 },
      handR: { x: 133, y: 144 },
      chest: { x: 100, y: 90 },
      waist: { x: 100, y: 142 },
      hipL: { x: 85, y: 154 },
      hipR: { x: 115, y: 154 },
      kneeL: { x: 94, y: 224 },
      kneeR: { x: 111, y: 228 },
      ankleL: { x: 92, y: 296 },
      ankleR: { x: 119, y: 300 },
      toeL: { x: 84, y: 308 },
      toeR: { x: 129, y: 308 },
      facing: "front",
    },
    props: [],
    marks: [
      { kind: "frame", x: 14, y: 28, w: 172, h: 286, label: "clean background" },
      { kind: "camera", pos: { x: 172, y: 130 }, target: { x: 110, y: 130 }, label: "chest height" },
      { kind: "distance", from: { x: 24, y: 330 }, to: { x: 176, y: 330 }, label: "3–4 steps back" },
      { kind: "line", from: { x: 40, y: 38 }, to: { x: 160, y: 38 }, label: "eye level" },
    ],
  },
  {
    id: "walking-street",
    name: "Walking Street Style",
    chip: "Walk",
    tagline: "Walk past the camera on a slow count of three, mid-stride.",
    story: "Motion makes an outfit look alive — the street-style favourite for Stories.",
    fitsPlaceTypes: ["street", "outdoor", "mall", "building", "park", "garden", "other"],
    requires: [],
    prefers: ["open-space", "wall"],
    outfitStyles: ["streetwear", "casual", "sporty"],
    formats: ["story", "portrait"],
    free: true,
    camera: {
      angle: "eye-level",
      height: "hip height",
      distance: "three steps to the side",
      direction: "parallel to your path, side-on",
    },
    body: {
      head: "Look ahead, chin slightly down.",
      shoulders: "Let them swing naturally.",
      arms: "Swing arms loosely with your stride.",
      hands: "Relaxed, nothing in them.",
      torso: "Stay upright — don't lean forward.",
      leftLeg: "Long stride forward, heel landing.",
      rightLeg: "Trailing behind, heel lifting.",
      feet: "Catch the step between footfalls.",
      shoes: "Both shoes in frame — one front, one back.",
    },
    background: "Keep the street or walkway receding behind you for depth.",
    lighting: "Side light sculpts the outfit; avoid harsh midday sun overhead.",
    tip: "Shoot a burst of frames while walking — the third or fourth stride always looks best.",
    figure: {
      head: { x: 104, y: 40, r: 15 },
      neck: { x: 103, y: 58 },
      shoulderL: { x: 88, y: 72 },
      shoulderR: { x: 117, y: 72 },
      elbowL: { x: 76, y: 102 },
      elbowR: { x: 127, y: 104 },
      handL: { x: 70, y: 130 },
      handR: { x: 137, y: 132 },
      chest: { x: 102, y: 92 },
      waist: { x: 100, y: 144 },
      hipL: { x: 92, y: 156 },
      hipR: { x: 110, y: 156 },
      kneeL: { x: 78, y: 222 },
      kneeR: { x: 124, y: 218 },
      ankleL: { x: 70, y: 294 },
      ankleR: { x: 136, y: 288 },
      toeL: { x: 60, y: 306 },
      toeR: { x: 146, y: 302 },
      facing: "side",
    },
    props: [],
    marks: [
      { kind: "frame", x: 10, y: 32, w: 180, h: 280, label: "street depth" },
      { kind: "camera", pos: { x: 24, y: 170 }, target: { x: 78, y: 170 }, label: "hip height" },
      { kind: "distance", from: { x: 24, y: 330 }, to: { x: 176, y: 330 }, label: "3 steps aside" },
      { kind: "arrow", from: { x: 30, y: 316 }, to: { x: 96, y: 316 }, label: "walk this way" },
    ],
  },
  {
    id: "cafe-sitting",
    name: "Cafe Sitting Pose",
    chip: "Side Sit",
    tagline: "Sit at the edge of the chair, cross at the ankles, elbow on the table.",
    story: "The natural café shot — relaxed, intimate and perfect for a coffee-date Story.",
    fitsPlaceTypes: ["cafe", "restaurant", "indoor", "home", "hotel", "other"],
    requires: ["chair"],
    prefers: ["table", "window"],
    outfitStyles: ["casual", "classy", "streetwear"],
    formats: ["story", "portrait", "square"],
    free: false,
    camera: {
      angle: "eye-level",
      height: "seated eye level",
      distance: "two steps back, slightly to the side",
      direction: "three-quarters across the table",
    },
    body: {
      head: "Turn toward the light, chin down a touch.",
      shoulders: "Drop them away from your ears.",
      arms: "One elbow resting on the table.",
      hands: "Wrap both hands around your cup.",
      torso: "Sit tall — don't slouch into the backrest.",
      leftLeg: "Planted, knee bent at ninety degrees.",
      rightLeg: "Crossed over at the ankle.",
      feet: "Point the top toe slightly down.",
      shoes: "Keep the crossed shoe visible in frame.",
    },
    background: "Let the café interior fall softly behind you.",
    lighting: "Sit facing the window — window light is the most flattering.",
    tip: "Ask for the seat nearest the window, then turn your chair a few degrees toward it.",
    figure: {
      head: { x: 86, y: 66, r: 15 },
      neck: { x: 87, y: 84 },
      shoulderL: { x: 72, y: 98 },
      shoulderR: { x: 102, y: 98 },
      elbowL: { x: 61, y: 130 },
      elbowR: { x: 108, y: 132 },
      handL: { x: 55, y: 166 },
      handR: { x: 101, y: 164 },
      chest: { x: 86, y: 118 },
      waist: { x: 88, y: 164 },
      hipL: { x: 78, y: 186 },
      hipR: { x: 104, y: 186 },
      kneeL: { x: 74, y: 244 },
      kneeR: { x: 127, y: 224 },
      ankleL: { x: 74, y: 296 },
      ankleR: { x: 97, y: 258 },
      toeL: { x: 65, y: 306 },
      toeR: { x: 87, y: 266 },
      facing: "front",
    },
    props: [
      { kind: "chair", x: 70, y: 190 },
      { kind: "table", x: 18, y: 170 },
    ],
    marks: [
      { kind: "frame", x: 12, y: 40, w: 176, h: 264, label: "café interior" },
      { kind: "camera", pos: { x: 174, y: 118 }, target: { x: 104, y: 118 }, label: "seated eye level" },
      { kind: "arrow", from: { x: 146, y: 244 }, to: { x: 112, y: 254 }, label: "cross at ankle" },
      { kind: "distance", from: { x: 24, y: 330 }, to: { x: 176, y: 330 }, label: "2 steps back" },
    ],
  },
  {
    id: "wall-lean",
    name: "Wall Lean",
    chip: "Wall Lean",
    tagline: "Put one shoulder on the wall and cross your ankles.",
    story: "Effortless and confident — the go-to portrait for a clean background.",
    fitsPlaceTypes: ["street", "building", "indoor", "outdoor", "mall", "home", "other", "restaurant"],
    requires: ["wall"],
    prefers: ["doorway", "window"],
    outfitStyles: ["casual", "classy", "streetwear", "formal"],
    formats: ["portrait", "square", "story"],
    free: true,
    camera: {
      angle: "eye-level",
      height: "hip height",
      distance: "two steps back, straight on",
      direction: "slightly off-centre toward the free wall",
    },
    body: {
      head: "Tilt slightly away from the wall.",
      shoulders: "Press the near shoulder gently into the wall.",
      arms: "Near arm along the wall, far hand in pocket.",
      hands: "Keep the pocket hand loose.",
      torso: "Let your hip rest against the wall.",
      leftLeg: "Straight, taking your weight.",
      rightLeg: "Crossed in front, toe touching the ground.",
      feet: "Ankles crossed, both shoes readable.",
      shoes: "Angle the front shoe so the profile shows.",
    },
    background: "Use the wall as your backdrop — keep it uncluttered.",
    lighting: "Stand so the wall throws soft shade, not hard shadow.",
    tip: "Push off the wall slightly before the shot so your posture stays active, not sagging.",
    figure: {
      head: { x: 110, y: 44, r: 15 },
      neck: { x: 111, y: 62 },
      shoulderL: { x: 94, y: 76 },
      shoulderR: { x: 144, y: 76 },
      elbowL: { x: 88, y: 110 },
      elbowR: { x: 149, y: 110 },
      handL: { x: 93, y: 147 },
      handR: { x: 146, y: 149 },
      chest: { x: 114, y: 96 },
      waist: { x: 114, y: 148 },
      hipL: { x: 102, y: 160 },
      hipR: { x: 130, y: 160 },
      kneeL: { x: 106, y: 228 },
      kneeR: { x: 124, y: 230 },
      ankleL: { x: 117, y: 298 },
      ankleR: { x: 105, y: 292 },
      toeL: { x: 127, y: 308 },
      toeR: { x: 95, y: 302 },
      facing: "front",
    },
    props: [{ kind: "wall", x: 154, y1: 28, y2: 312 }],
    marks: [
      { kind: "camera", pos: { x: 30, y: 166 }, target: { x: 88, y: 166 }, label: "hip height" },
      { kind: "distance", from: { x: 24, y: 330 }, to: { x: 176, y: 330 }, label: "2 steps back" },
      { kind: "arrow", from: { x: 74, y: 76 }, to: { x: 138, y: 76 }, label: "shoulder to wall" },
      { kind: "line", from: { x: 60, y: 308 }, to: { x: 150, y: 308 }, label: "ground" },
    ],
  },
  {
    id: "mirror-outfit",
    name: "Mirror Outfit",
    chip: "Mirror",
    tagline: "Frame yourself in the mirror with the phone at chin height.",
    story: "The outfit-check shot — shows the whole look the way you see it.",
    fitsPlaceTypes: ["bedroom", "home", "hotel", "mall", "indoor", "other"],
    requires: ["mirror"],
    prefers: ["window"],
    outfitStyles: ["casual", "streetwear", "classy", "traditional"],
    formats: ["story", "portrait"],
    free: false,
    camera: {
      angle: "eye-level",
      height: "chin height, phone covering part of your face",
      distance: "arm's length from the mirror",
      direction: "straight into the mirror",
    },
    body: {
      head: "Look at your reflection, not the lens.",
      shoulders: "Square them to the mirror.",
      arms: "Phone hand at chin height, elbow tucked.",
      hands: "Grip the phone with one hand, steady.",
      torso: "Stand with a slight turn for shape.",
      leftLeg: "Straight, weight even.",
      rightLeg: "One step toward the mirror.",
      feet: "Shoulder-width, shoes fully in frame.",
      shoes: "Angle your feet so both shoes show.",
    },
    background: "Keep the room behind you tidy — it becomes your backdrop.",
    lighting: "Stand with a window or lamp in front of you, behind the mirror.",
    tip: "Tap the screen on your outfit (not your face) to lock focus before shooting.",
    figure: {
      head: { x: 110, y: 44, r: 15 },
      neck: { x: 109, y: 62 },
      shoulderL: { x: 94, y: 76 },
      shoulderR: { x: 126, y: 76 },
      elbowL: { x: 85, y: 108 },
      elbowR: { x: 133, y: 108 },
      handL: { x: 76, y: 87 },
      handR: { x: 129, y: 145 },
      chest: { x: 110, y: 96 },
      waist: { x: 110, y: 148 },
      hipL: { x: 98, y: 160 },
      hipR: { x: 123, y: 160 },
      kneeL: { x: 101, y: 228 },
      kneeR: { x: 121, y: 228 },
      ankleL: { x: 101, y: 298 },
      ankleR: { x: 121, y: 298 },
      toeL: { x: 93, y: 308 },
      toeR: { x: 113, y: 308 },
      facing: "front",
    },
    props: [{ kind: "mirror", x: 12, y: 54, w: 54, h: 250 }],
    marks: [
      { kind: "arrow", from: { x: 72, y: 87 }, to: { x: 52, y: 92 }, label: "phone to mirror" },
      { kind: "line", from: { x: 30, y: 44 }, to: { x: 160, y: 44 }, label: "eye level" },
      { kind: "distance", from: { x: 66, y: 330 }, to: { x: 150, y: 330 }, label: "arm's length" },
      { kind: "camera", pos: { x: 168, y: 150 }, target: { x: 120, y: 150 }, label: "mirror shot" },
    ],
  },
  {
    id: "staircase-editorial",
    name: "Staircase Editorial",
    chip: "Stairs",
    tagline: "Sit on a step with one knee up and let the stairs run past you.",
    story: "Diagonal lines of a staircase give any portrait instant editorial structure.",
    fitsPlaceTypes: ["staircase", "building", "hotel", "indoor", "outdoor", "other"],
    requires: ["stairs"],
    prefers: ["wall", "railing"],
    outfitStyles: ["classy", "streetwear", "casual", "formal"],
    formats: ["portrait", "story", "square"],
    free: false,
    camera: {
      angle: "eye-level",
      height: "your seated eye level",
      distance: "two steps below you",
      direction: "straight on, slightly below",
    },
    body: {
      head: "Turn toward the open side of the stairwell.",
      shoulders: "Lengthen up out of the hips.",
      arms: "Back hand on the step, front hand on your knee.",
      hands: "Spread fingers flat for the support hand.",
      torso: "Twist gently toward the camera.",
      leftLeg: "Knee up, foot planted on the step.",
      rightLeg: "Extended down the stairs.",
      feet: "Both feet visible on different steps.",
      shoes: "Show the top shoe's profile and the lower shoe's toe.",
    },
    background: "Let the staircase lines lead out of frame behind you.",
    lighting: "Find the stairwell's window light and face it.",
    tip: "Sit one step higher than feels natural — it lengthens the front leg.",
    figure: {
      head: { x: 74, y: 120, r: 15 },
      neck: { x: 76, y: 138 },
      shoulderL: { x: 62, y: 152 },
      shoulderR: { x: 93, y: 152 },
      elbowL: { x: 54, y: 186 },
      elbowR: { x: 99, y: 184 },
      handL: { x: 52, y: 238 },
      handR: { x: 95, y: 217 },
      chest: { x: 76, y: 174 },
      waist: { x: 80, y: 216 },
      hipL: { x: 76, y: 244 },
      hipR: { x: 100, y: 244 },
      kneeL: { x: 118, y: 262 },
      kneeR: { x: 134, y: 278 },
      ankleL: { x: 116, y: 278 },
      ankleR: { x: 156, y: 312 },
      toeL: { x: 106, y: 286 },
      toeR: { x: 166, y: 320 },
      facing: "side",
    },
    props: [
      {
        kind: "stairs",
        steps: [
          { x: 30, y: 250, w: 82 },
          { x: 112, y: 284, w: 40 },
          { x: 152, y: 318, w: 40 },
        ],
      },
    ],
    marks: [
      { kind: "camera", pos: { x: 22, y: 196 }, target: { x: 70, y: 196 }, label: "seated eye level" },
      { kind: "arrow", from: { x: 140, y: 244 }, to: { x: 114, y: 258 }, label: "one knee up" },
      { kind: "distance", from: { x: 22, y: 334 }, to: { x: 176, y: 334 }, label: "2 steps below" },
      { kind: "line", from: { x: 34, y: 120 }, to: { x: 150, y: 120 }, label: "eye level" },
    ],
  },
  {
    id: "side-profile",
    name: "Side Profile",
    chip: "Profile",
    tagline: "Turn a full ninety degrees and look straight ahead.",
    story: "A sharp silhouette that shows the cut of the outfit without facing the lens.",
    fitsPlaceTypes: ["street", "building", "outdoor", "indoor", "other", "cafe", "restaurant"],
    requires: [],
    prefers: ["wall", "window", "open-space"],
    outfitStyles: ["formal", "classy", "casual", "streetwear"],
    formats: ["portrait", "square"],
    free: false,
    camera: {
      angle: "eye-level",
      height: "hip height",
      distance: "three steps back, dead side-on",
      direction: "perfectly perpendicular to your body",
    },
    body: {
      head: "Look straight ahead, level chin.",
      shoulders: "Stack them — one behind the other.",
      arms: "Both arms hang, near arm slightly forward.",
      hands: "Fingers soft and open.",
      torso: "Pull in, lengthen the spine.",
      leftLeg: "Back leg, straight and grounded.",
      rightLeg: "Front leg, slight bend at the knee.",
      feet: "Front foot forward, back foot planted.",
      shoes: "Show the full side profile of the front shoe.",
    },
    background: "Keep the space behind your back clear and simple.",
    lighting: "Side light draws the edge of your silhouette.",
    tip: "Push the near shoulder back so the profile line from ear to heel stays long.",
    figure: {
      head: { x: 108, y: 42, r: 15 },
      neck: { x: 106, y: 60 },
      shoulderL: { x: 98, y: 74 },
      shoulderR: { x: 107, y: 74 },
      elbowL: { x: 94, y: 108 },
      elbowR: { x: 112, y: 106 },
      handL: { x: 96, y: 146 },
      handR: { x: 115, y: 144 },
      chest: { x: 105, y: 94 },
      waist: { x: 105, y: 146 },
      hipL: { x: 99, y: 158 },
      hipR: { x: 111, y: 158 },
      kneeL: { x: 96, y: 226 },
      kneeR: { x: 114, y: 224 },
      ankleL: { x: 94, y: 296 },
      ankleR: { x: 118, y: 294 },
      toeL: { x: 84, y: 308 },
      toeR: { x: 130, y: 304 },
      facing: "side",
    },
    props: [],
    marks: [
      { kind: "frame", x: 12, y: 32, w: 176, h: 280, label: "simple backdrop" },
      { kind: "camera", pos: { x: 24, y: 168 }, target: { x: 84, y: 168 }, label: "hip height" },
      { kind: "line", from: { x: 106, y: 30 }, to: { x: 106, y: 312 }, label: "profile line" },
      { kind: "distance", from: { x: 24, y: 330 }, to: { x: 176, y: 330 }, label: "3 steps back" },
    ],
  },
  {
    id: "back-view",
    name: "Back View Outfit",
    chip: "Back View",
    tagline: "Walk away from the camera and look back over one shoulder.",
    story: "Shows the back of the fit — jackets, prints and layering earn their moment.",
    fitsPlaceTypes: ["street", "outdoor", "garden", "park", "building", "other", "cafe"],
    requires: [],
    prefers: ["open-space"],
    outfitStyles: ["casual", "streetwear", "classy"],
    formats: ["story", "portrait"],
    free: false,
    camera: {
      angle: "eye-level",
      height: "chest height",
      distance: "three steps behind",
      direction: "directly behind you",
    },
    body: {
      head: "Turn to look back over your right shoulder.",
      shoulders: "Keep them square to the camera.",
      arms: "One hand rising toward your hair.",
      hands: "Light touch — no gripping.",
      torso: "Stand tall, show the back seam.",
      leftLeg: "Mid-step forward.",
      rightLeg: "Trailing, heel just lifting.",
      feet: "Heels toward camera, toes hidden.",
      shoes: "Heels and sole edges should read clearly.",
    },
    background: "Walk toward something interesting — a street, arch or view.",
    lighting: "Keep light ahead of you so the back of the outfit isn't in shadow.",
    tip: "Look back on the count of two, not one — the twist looks natural rather than posed.",
    figure: {
      head: { x: 100, y: 42, r: 15 },
      neck: { x: 100, y: 60 },
      shoulderL: { x: 78, y: 74 },
      shoulderR: { x: 122, y: 74 },
      elbowL: { x: 74, y: 108 },
      elbowR: { x: 131, y: 100 },
      handL: { x: 79, y: 145 },
      handR: { x: 113, y: 59 },
      chest: { x: 100, y: 94 },
      waist: { x: 100, y: 148 },
      hipL: { x: 86, y: 160 },
      hipR: { x: 114, y: 160 },
      kneeL: { x: 90, y: 228 },
      kneeR: { x: 113, y: 226 },
      ankleL: { x: 88, y: 298 },
      ankleR: { x: 117, y: 294 },
      toeL: { x: 84, y: 306 },
      toeR: { x: 121, y: 304 },
      facing: "back",
    },
    props: [],
    marks: [
      { kind: "frame", x: 14, y: 34, w: 172, h: 278, label: "what you walk toward" },
      { kind: "camera", pos: { x: 174, y: 128 }, target: { x: 118, y: 128 }, label: "chest height" },
      { kind: "arrow", from: { x: 60, y: 318 }, to: { x: 130, y: 318 }, label: "walk away" },
      { kind: "distance", from: { x: 24, y: 334 }, to: { x: 176, y: 334 }, label: "3 steps behind" },
    ],
  },
  {
    id: "traditional-portrait",
    name: "Traditional Fashion Portrait",
    chip: "Traditional",
    tagline: "Stand centred with hands together and let the drape fall naturally.",
    story: "A composed, full-length portrait built for Habesha kemis, netela and kaba.",
    fitsPlaceTypes: ["indoor", "outdoor", "home", "hotel", "garden", "other", "restaurant", "building"],
    requires: [],
    prefers: ["wall", "window", "open-space"],
    outfitStyles: ["traditional", "formal", "classy"],
    formats: ["portrait", "square", "story"],
    free: false,
    camera: {
      angle: "eye-level",
      height: "chest height",
      distance: "three steps back, centred",
      direction: "straight on, symmetrical frame",
    },
    body: {
      head: "Face forward, chin level and proud.",
      shoulders: "Square and relaxed.",
      arms: "Elbows soft at your sides.",
      hands: "Meet gently in front at waist height.",
      torso: "Stand tall — lengthen through the spine.",
      leftLeg: "Weight-bearing, straight.",
      rightLeg: "Soft knee, toe slightly turned out.",
      feet: "Close together, shoes peeking from the hem.",
      shoes: "Keep both shoes visible below the hemline.",
    },
    background: "A plain wall or doorway keeps every eye on the garment.",
    lighting: "Even, front-facing light keeps the fabric detail crisp.",
    tip: "Hold the netela's edge lightly so the drape keeps its shape instead of pulling.",
    figure: {
      head: { x: 100, y: 40, r: 15 },
      neck: { x: 100, y: 58 },
      shoulderL: { x: 80, y: 72 },
      shoulderR: { x: 120, y: 72 },
      elbowL: { x: 72, y: 106 },
      elbowR: { x: 128, y: 106 },
      handL: { x: 96, y: 133 },
      handR: { x: 104, y: 133 },
      chest: { x: 100, y: 92 },
      waist: { x: 100, y: 144 },
      hipL: { x: 86, y: 156 },
      hipR: { x: 114, y: 156 },
      kneeL: { x: 93, y: 226 },
      kneeR: { x: 108, y: 226 },
      ankleL: { x: 93, y: 296 },
      ankleR: { x: 108, y: 296 },
      toeL: { x: 85, y: 308 },
      toeR: { x: 116, y: 308 },
      facing: "front",
    },
    props: [{ kind: "drape" }],
    marks: [
      { kind: "frame", x: 16, y: 26, w: 168, h: 288, label: "plain backdrop" },
      { kind: "camera", pos: { x: 174, y: 126 }, target: { x: 118, y: 126 }, label: "chest height" },
      { kind: "line", from: { x: 100, y: 26 }, to: { x: 100, y: 314 }, label: "centre line" },
      { kind: "distance", from: { x: 24, y: 332 }, to: { x: 176, y: 332 }, label: "3 steps back" },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Lookups                                                                     */
/* -------------------------------------------------------------------------- */

export function getPose(id: string): PoseSpec | undefined {
  return POSES.find((p) => p.id === id);
}

export const FREE_POSES = POSES.filter((p) => p.free);
export const PRO_POSES = POSES.filter((p) => !p.free);

/** Poses shown in the camera's pose selector (chip list). */
export const SELECTOR_POSES = ["walking-street", "low-angle-shoes", "cafe-sitting", "wall-lean", "full-body-editorial"];
