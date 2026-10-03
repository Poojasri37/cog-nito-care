import wedding from "@/assets/album-wedding.jpg";
import beach from "@/assets/album-beach.jpg";
import garden from "@/assets/album-garden.jpg";
import baking from "@/assets/album-baking.jpg";

export type MemoryCategory =
  | "PERSONAL_FACT"
  | "FAMILY_RELATIONSHIP"
  | "PREFERENCE"
  | "ROUTINE"
  | "IMPORTANT_EVENT"
  | "CONVERSATION_MEMORY"
  | "PHOTO_MEMORY"
  | "THERAPY_PROGRESS"
  | "YOGA_PROGRESS"
  | "SAFETY_EVENT";

export type FamilyMember = {
  id: string;
  name: string;
  relation: string;
  initials: string;
  hue: number;
  facts: string[];
  lastVisit: string;
};

export type Medication = {
  id: string;
  name: string;
  dose: string;
  time: string; // HH:MM
  purpose: string;
  withFood: boolean;
};

export type SemanticFact = {
  id: string;
  category: MemoryCategory;
  subject: string;
  relation: string;
  object: string;
  confidence: number;
};

export type Episode = {
  id: string;
  category: MemoryCategory;
  type: string;
  description: string;
  person?: string;
  timestamp: number;
  importance: number;
};

export type Alert = {
  id: string;
  level: "info" | "warning" | "critical";
  kind: "confusion" | "missed_medication" | "agitation" | "wandering" | "fall_risk" | "other";
  message: string;
  timestamp: number;
  resolved: boolean;
};

export type GameScore = {
  id: string;
  game: "pattern" | "words" | "tiles" | "reminiscence";
  score: number; // 0-100
  durationSec: number;
  timestamp: number;
};

export type MovementSession = {
  id: string;
  routine: string;
  completed: number;
  total: number;
  postureScore: number;
  timestamp: number;
};

export type Note = { id: string; author: string; text: string; timestamp: number };

export type ChatMessage = { id: string; role: "user" | "assistant"; text: string; timestamp: number };

export type Photo = {
  id: string;
  src: string;
  title: string;
  year: string;
  people: string[];
  story: string;
  prompts: string[];
};

export const PATIENT = {
  name: "Margaret Dawson",
  preferredName: "Maggie",
  age: 76,
  condition: "Mild-to-moderate Alzheimer's disease (demo persona)",
  home: "14 Willow Lane, Bath",
  formerCareer: "Primary school teacher for 31 years at St. Mary's, Bath",
  calmingTopics: ["her rose garden", "teaching children to read", "Cornwall holidays", "Ella Fitzgerald songs"],
  triggers: ["loud noises", "being rushed", "being told 'you already asked that'", "late afternoon (sundowning)"],
};

export const FAMILY: FamilyMember[] = [
  { id: "arthur", name: "Arthur", relation: "Late husband", initials: "AD", hue: 30, facts: ["Married 14 June 1972 at St. Swithin's, Walcot", "Passed away in 2019", "Loved fishing and crosswords"], lastVisit: "—" },
  { id: "sarah", name: "Sarah", relation: "Daughter", initials: "SM", hue: 175, facts: ["Born 1975", "Nurse at the Royal United Hospital", "Visits every Sunday afternoon"], lastVisit: "Sunday" },
  { id: "james", name: "James", relation: "Son", initials: "JD", hue: 220, facts: ["Born 1978", "Lives in Edinburgh, architect", "Calls Wednesday evenings"], lastVisit: "3 weeks ago" },
  { id: "leo", name: "Leo", relation: "Grandson (Sarah's son)", initials: "LM", hue: 95, facts: ["Age 9", "Loves baking scones with Gran", "Plays football on Saturdays"], lastVisit: "Sunday" },
  { id: "priya", name: "Priya", relation: "Home carer", initials: "PK", hue: 330, facts: ["Visits weekdays 9am–1pm", "Helps with breakfast and medication"], lastVisit: "Today" },
];

export const MEDICATIONS: Medication[] = [
  { id: "donepezil", name: "Donepezil", dose: "10 mg", time: "08:00", purpose: "Memory support", withFood: false },
  { id: "amlodipine", name: "Amlodipine", dose: "5 mg", time: "08:00", purpose: "Blood pressure", withFood: true },
  { id: "vitd", name: "Vitamin D", dose: "1000 IU", time: "13:00", purpose: "Bone health", withFood: true },
  { id: "memantine", name: "Memantine", dose: "10 mg", time: "20:00", purpose: "Memory support", withFood: false },
];

export const ROUTINE = [
  { time: "07:30", label: "Wake up, cup of tea" },
  { time: "08:00", label: "Breakfast & morning medicines" },
  { time: "10:00", label: "Garden walk or gentle movement" },
  { time: "11:00", label: "Memory games" },
  { time: "13:00", label: "Lunch" },
  { time: "15:00", label: "Rest & music" },
  { time: "16:30", label: "Reminiscence with photos" },
  { time: "18:00", label: "Supper" },
  { time: "20:00", label: "Evening medicine" },
  { time: "21:30", label: "Bedtime" },
];

export const OBJECTS = [
  { name: "Reading glasses", usual: "On the bedside table, next to the lamp" },
  { name: "House keys", usual: "On the blue hook by the front door" },
  { name: "Handbag", usual: "On the chair in the hallway" },
  { name: "Hearing aid", usual: "In the small white box in the bathroom" },
  { name: "TV remote", usual: "On the arm of the green armchair" },
];

export const PHOTOS: Photo[] = [
  { id: "wedding", src: wedding, title: "Our wedding day", year: "1972", people: ["Arthur"], story: "Margaret and Arthur married at St. Swithin's church in Walcot on a sunny June day. She carried white daisies.", prompts: ["What flowers did you carry that day?", "What do you remember about Arthur's smile?", "What music played at the reception?"] },
  { id: "beach", src: beach, title: "Polperro, Cornwall", year: "1981", people: ["Sarah", "James"], story: "A summer holiday in Polperro with Sarah and James. They built the biggest sandcastle on the beach.", prompts: ["Who built the best sandcastle?", "What did you eat at the seaside?", "What did the sea sound like?"] },
  { id: "garden", src: garden, title: "The rose garden", year: "2015", people: [], story: "Margaret's prize roses at Willow Lane. Her favourite variety is the pink 'Gertrude Jekyll'.", prompts: ["Which rose is your favourite?", "What does a rose smell like to you?", "Who taught you to garden?"] },
  { id: "baking", src: baking, title: "Scones with Leo", year: "2023", people: ["Leo"], story: "Baking fruit scones with grandson Leo. He always sneaks a few raisins.", prompts: ["What goes into your scone recipe?", "What does Leo like best?", "Jam first or cream first?"] },
];

export const SEED_FACTS: SemanticFact[] = [
  ...FAMILY.map((f, i) => ({ id: `f${i}`, category: "FAMILY_RELATIONSHIP" as const, subject: "Margaret", relation: `has ${f.relation.toLowerCase()}`, object: f.name, confidence: 1 })),
  { id: "p1", category: "PREFERENCE", subject: "Margaret", relation: "enjoys", object: "Ella Fitzgerald", confidence: 0.95 },
  { id: "p2", category: "PREFERENCE", subject: "Margaret", relation: "prefers", object: "Earl Grey tea with milk", confidence: 0.9 },
  { id: "p3", category: "PREFERENCE", subject: "Margaret", relation: "loves", object: "pink roses (Gertrude Jekyll)", confidence: 0.95 },
  { id: "pf1", category: "PERSONAL_FACT", subject: "Margaret", relation: "worked as", object: "primary school teacher", confidence: 1 },
  { id: "pf2", category: "PERSONAL_FACT", subject: "Margaret", relation: "lives at", object: "Willow Lane, Bath", confidence: 1 },
  { id: "r1", category: "ROUTINE", subject: "Sarah", relation: "visits on", object: "Sunday afternoons", confidence: 1 },
  { id: "r2", category: "ROUTINE", subject: "James", relation: "calls on", object: "Wednesday evenings", confidence: 0.9 },
  { id: "s1", category: "SAFETY_EVENT", subject: "Margaret", relation: "becomes anxious during", object: "late afternoon", confidence: 0.8 },
];

const H = 3600_000;
const D = 24 * H;
export function seedEpisodes(now: number): Episode[] {
  return [
    { id: "e1", category: "IMPORTANT_EVENT", type: "family_visit", person: "Sarah", description: "Sarah and Leo visited; baked scones together.", timestamp: now - 6 * D, importance: 0.92 },
    { id: "e2", category: "THERAPY_PROGRESS", type: "memory_game", description: "Completed memory tiles, 8 pairs in 3 min.", timestamp: now - 5 * D, importance: 0.55 },
    { id: "e3", category: "CONVERSATION_MEMORY", type: "childhood_memory", description: "Talked about growing up in Frome and her father's bakery.", timestamp: now - 4 * D, importance: 0.8 },
    { id: "e4", category: "SAFETY_EVENT", type: "misplaced_object", description: "Could not find reading glasses — found on bedside table.", timestamp: now - 3 * D, importance: 0.6 },
    { id: "e5", category: "YOGA_PROGRESS", type: "movement_session", description: "Completed seated stretch routine, 6/7 poses.", timestamp: now - 2 * D, importance: 0.5 },
    { id: "e6", category: "IMPORTANT_EVENT", type: "upcoming_event", description: "Mentioned Leo's school play next Friday.", timestamp: now - 1 * D, importance: 0.85 },
    { id: "e7", category: "ROUTINE", type: "medication_taken", description: "Took morning medicines with breakfast.", timestamp: now - 3 * H, importance: 0.4 },
  ];
}

export function seedScores(now: number): GameScore[] {
  const games: GameScore["game"][] = ["pattern", "words", "tiles", "reminiscence"];
  const out: GameScore[] = [];
  for (let d = 13; d >= 0; d--) {
    games.forEach((g, i) => {
      if ((d + i) % 2 === 0) {
        const base = { pattern: 62, words: 70, tiles: 58, reminiscence: 76 }[g];
        out.push({ id: `s${d}${g}`, game: g, score: Math.round(base + Math.sin(d + i) * 8 + (13 - d) * 0.6), durationSec: 180 + ((d * 37) % 120), timestamp: now - d * D });
      }
    });
  }
  return out;
}

export function seedMovement(now: number): MovementSession[] {
  return [6, 4, 2, 1].map((d, i) => ({ id: `m${i}`, routine: "Seated Morning Stretch", completed: [5, 6, 6, 7][i], total: 7, postureScore: [68, 72, 75, 80][i], timestamp: now - d * D }));
}

export function seedAlerts(now: number): Alert[] {
  return [
    { id: "a1", level: "warning", kind: "confusion", message: "Asked 'Where is Arthur?' three times between 16:10–16:40.", timestamp: now - 1 * D, resolved: true },
    { id: "a2", level: "info", kind: "missed_medication", message: "Vitamin D taken 45 minutes late.", timestamp: now - 2 * D, resolved: true },
  ];
}
