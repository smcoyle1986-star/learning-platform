import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type CardSpec = { lemma: string; theme?: string; pathHint?: string };
type RequestedSet = { title: string; cards: CardSpec[] };
type NounRow = { id: string; lemma: string; image_id: string | null; themes: string[] | null };
type CardRow = { lesson_set_id: string; noun_id: string | null; verb_id: string | null; adjective_id: string | null; front: string; back: string | null; position: number };

// Format: title|lemma, lemma::theme, or lemma::theme::image-path-hint.
// Theme/path qualifiers make intentional duplicate noun lemmas deterministic.
const SET_SOURCE = `
Animals - Easy|cat, dog, bird, fish::animals, rabbit, horse
Farm Animals - Easy|cow, chicken::animals, duck, goat, sheep, horse, donkey, turkey, goose
Wild Animals - Easy|lion, tiger, elephant, giraffe, monkey, zebra, bear, crocodile
Sea Animals - Easy|fish::animals, shark, whale, dolphin, octopus, crab, turtle, seal
Sea Animals - Medium|jellyfish, orca, seahorse, starfish, stingray, squid, lobster, shrimp, clam, seashell
Baby Animals - Medium|bear cub, calf, chick, duckling, foal, joey, kid, kitten, lamb, lion cub, piglet, puppy, tadpole, tiger cub
Pets - Easy|cat, dog, hamster, rabbit, fish::animals, bird, tortoise, parrot
Food & Drinks - Easy|apple, banana, bread, cheese, egg, milk, rice, water
Fruit - Easy|apple, banana, orange, grapes, strawberry, watermelon
Fruit - Medium|avocado, blackberry, cherry, coconut, grapefruit, kiwi, lemon, mango, melon, peach, pear, pineapple, plum
Vegetables - Easy|carrot, corn, cucumber, lettuce, onion, potato, tomato
Vegetables - Medium|broccoli, cabbage, chilli, eggplant, garlic, mushroom, pepper, pumpkin, spinach, turnip, zucchini
Drinks - Easy|water, milk, juice, tea, coffee, lemonade
Drinks - Medium|soda, smoothie, milkshake, hot chocolate, iced coffee, iced tea
Meals - Easy|cereal, toast, sandwich, soup, salad, pasta, pizza, hamburger
Breakfast Foods - Medium|bacon, cereal, egg, fried egg, omelette, scrambled egg, toast, waffle, yoghurt
Food Around the World - Medium|curry, kebab, kimbab, ramen, sushi, taco, pasta, spaghetti, fried rice
Meat & Protein - Medium|beef, chicken::food & drinks, duck meat, fish::food & drinks, ham, pork, steak, tuna, fried chicken
Desserts & Treats - Easy|cake, cookie, dessert, donut, ice cream, muffin
Healthy Food - Medium|apple, avocado, banana, broccoli, carrot, cucumber, grapes, lettuce, salad, spinach, tomato, yoghurt
Rooms in the Home - Easy|bathroom, bedroom, dining room, kitchen, living room
Rooms in the Home - Medium|attic, basement, garage, hall, home office, kids room, laundry room, master bedroom, pantry, study room, dressing room, balcony
Bedroom Items - Easy|bed, closet, wardrobe, pillow, night stand, lamp, mirror, curtain, rug
Living Room Items - Easy|couch, sofa, armchair, TV, remote control, lamp, rug, cushion, plant, clock
Bathroom Items - Easy|bathtub, shower, sink, toilet::furniture & home::/toilet_rooms/, mirror, mat
Home Appliances - Medium|air conditioner, dishwasher, dryer, freezer, oven, refrigerator, toaster, TV, washing machine
Furniture - Easy|bed, chair::furniture & home, desk::furniture & home, dining table, couch, sofa, stool, armchair, shelf
Things Around the Home - Medium|door, window, cupboard, drawer, bookcase, picture frame, photograph, poster, hanger, laundry basket
Kitchen Utensils - Easy|cup, fork, knife, plate, spoon, bowl, mug, glass
Kitchen Tools - Medium|bottle opener, chopping board, chopsticks, colander, frying pan, peeler, tongs, whisk
Kitchen Containers - Medium|bottle, container, jar, jug, lunchbox, thermos, tray, bowl
Cooking Equipment - Medium|air fryer, frying pan, kettle, oven, pan, rice cooker, stove, toaster, wok
Classroom Objects - Easy|pencil, pen, eraser, notebook, school bag, ruler, desk::classroom, chair::classroom
Classroom Objects - Medium|colored pencils, crayon, glue, marker, paper, paintbrush, pencil case, pencil sharpener, scissors::classroom
Classroom Equipment - Hard|computer::classroom, projector, white board, stapler, workbook, textbook, trash can, paper clip
School Subjects - Easy|art, English, math, music, PE, science
School Subjects - Medium|Chinese, computer class, ethics, French, geography, German, history, Japanese, Korean, social studies, Spanish, swimming class
Family - Easy|mother, father, brother, sister, baby, grandmother, grandfather
Family - Medium|aunt, uncle, cousin, family friend
People - Easy|boy, girl, man, woman, child, adult
People - Medium|person, friend, neighbor, teenager
Jobs - Easy|teacher, doctor, nurse, police officer, firefighter, chef, farmer, pilot
Jobs - Medium|artist, baker, barber, builder, bus driver, carpenter, cashier, cook, dentist::jobs, engineer, hair dresser, mail carrier, mechanic, office worker, photographer, student, taxi driver, vet, waiter, writer
Jobs - Hard|architect, astronaut, athlete, judge, king, lawyer, musician, professor, programmer, queen, scientist, singer, soldier, youtuber
Sports Jobs - Medium|athlete, baseball player, basketball player, soccer player
Body Parts - Easy|head, face, eyes, ears, nose, mouth, hair, hand
Body Parts - Medium|arm, body, feet, finger, foot, leg, teeth, toe, tooth
Health Problems - Easy|cold::health, fever, flu, headache, rash, runny nose, sore throat
Health & Injuries - Medium|broken arm, broken leg, bruise, cut, ear ache, stomach ache, toothache, medicine, bandage, thermometer, wheelchair
Clothing - Easy|shirt, pants, dress, shoes, socks, hat, coat, t-shirt
Clothing - Medium|blazer, boots, cap, glasses, gloves, hoodie, jacket, jeans, scarf, shorts, skirt, sneakers, sweater
Clothing - Hard|belt, face mask, gillet, school uniform, sunglasses, swimsuit, tie, vest, watch
Transportation - Easy|car, bus, bike, train, airplane, boat
Transportation - Medium|taxi, truck, van, scooter, motorbike, subway, ferry, helicopter
Transportation - Hard|electric car, moped, SUV
Places in Town - Easy|school, park, hospital, restaurant, supermarket, zoo, library, beach
Places in Town - Medium|bank, cinema, church, fire station, police station, post office, pharmacy, hotel, museum, stadium
Shops & Services - Medium|bakery, barber shop, book store, clothes store, coffee shop, convenience store, department store, electronics store, hair salon, shoe store, shopping center
Transportation Places - Easy|airport, bus stop, bus terminal, gas station, train station
Fun Places - Easy|amusement park, aquarium, beach, kids cafe, park, stadium, swimming pool, zoo
Sports - Easy|baseball, basketball, bowling, golf, soccer, tennis, badminton
Sports - Hard|american football, cricket, darts, field hockey, ice hockey, ice skating, inline skating, rugby
Toys - Easy|ball, block, doll, puppet, robot, teddy bear, toy car, yoyo
Toys & Games - Medium|computer game, drone, game, game console, smartphone, tablet, toy plane, doll house, top
Nature - Easy|tree, flower, grass, rock, mountain, forest, river::nature, lake::nature
Landscapes - Medium|desert, forest, jungle, mountain, pond, river::nature, lake::nature, ocean, island, beach
Bugs & Small Creatures - Easy|bee, bug, butterfly, mosquito, spider, worm, frog
Weather - Easy|sunny, cloudy, raining, snowing, windy, hot, cold::weather
Weather - Medium|foggy, freezing, hail, lightning, overcast, rainbow, stormy, thunder, warm, temperature
Extreme Weather - Hard|blizzard, lightning, stormy, thunder, hail, freezing, smoggy
Days of the Week - Easy|Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
Months of the Year - Medium|January, February, March, April, May, June, July, August, September, October, November, December
Times of Day - Easy|morning, afternoon, evening, night, noon, midnight
Clock Times - Easy|one o'clock, two o'clock, three o'clock, four o'clock, five o'clock, six o'clock, seven o'clock, eight o'clock, nine o'clock, ten o'clock, eleven o'clock, twelve o'clock
Clock Times - Medium|two fifteen, two thirty, two forty-five, five fifteen, five thirty, five forty-five, eight fifteen, eight thirty, eight forty-five, ten fifteen, ten thirty, ten forty-five
Time Words - Medium|yesterday, tomorrow, last week, next week, last month, next month, birthday
Numbers 1–10 - Easy|one, two, three, four, five, six, seven, eight, nine, ten
Numbers 11–20 - Medium|eleven, twelve, thirteen, fourteen, fifteen, sixteen, seventeen, eighteen, nineteen, twenty
Numbers 20–100 - Medium|twenty, thirty, forty, fifty, sixty, seventy, eighty, ninety, one hundred
Large Numbers - Hard|one thousand, ten thousand, one hundred thousand, one million
Holidays & Events - Easy|birthday, Christmas, Halloween, Easter, Thanksgiving, New Year's Eve
Holidays Around the World - Hard|Budha's Birthday, Children's day, Diwali, Hanukkah, Independence Day, Lunar New Year, Ramadan, St Patrick's day, Valentines day
`;

function parseSets(): RequestedSet[] {
  return SET_SOURCE.trim().split("\n").map((line) => {
    const [title, rawCards] = line.split("|");
    if (!title || !rawCards) throw new Error(`Invalid set definition: ${line}`);
    const cards = rawCards.split(", ").map((raw) => {
      const [lemma, theme, pathHint] = raw.split("::");
      return { lemma, ...(theme ? { theme } : {}), ...(pathHint ? { pathHint } : {}) };
    });
    return { title, cards };
  });
}

function loadEnvironment(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requiredEnvironment(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function resolveCard(spec: CardSpec, rowsByLemma: Map<string, NounRow[]>) {
  let candidates = rowsByLemma.get(spec.lemma) ?? [];
  if (spec.theme) candidates = candidates.filter((row) => (row.themes ?? []).includes(spec.theme!));
  if (spec.pathHint) candidates = candidates.filter((row) => String(row.image_id).includes(spec.pathHint!));
  if (candidates.length !== 1) throw new Error(`Expected one exact noun row for ${JSON.stringify(spec)}; found ${candidates.length}.`);
  return candidates[0];
}

function validateDefinitions(sets: RequestedSet[]) {
  const titles = sets.map((set) => set.title);
  if (new Set(titles).size !== titles.length) throw new Error("Duplicate noun set title.");
  for (const set of sets) {
    if (!/^.+ - (Easy|Medium|Hard)$/.test(set.title) || /\(\d+\)/.test(set.title)) throw new Error(`Invalid title: ${set.title}`);
    if (set.cards.length < 2 || set.cards.length > 50) throw new Error(`Invalid card count: ${set.title}`);
    if (new Set(set.cards.map((card) => card.lemma)).size !== set.cards.length) throw new Error(`Duplicate noun inside ${set.title}.`);
  }
}

function tagsForTitle(title: string) {
  const difficulty = title.match(/ - (Easy|Medium|Hard)$/)?.[1]?.toLowerCase();
  return ["nouns", "Classendo", ...(difficulty ? [difficulty] : [])];
}

async function verifyState(supabase: SupabaseClient, ownerId: string, sets: RequestedSet[], resolved: Map<string, NounRow[]>) {
  const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name,username").eq("id", ownerId).single();
  if (profileError) throw profileError;
  if (profile.display_name !== "Classendo" || profile.username !== null) throw new Error("Administrator profile is not displayed as Classendo.");
  const { data: ownerSets, error: setsError } = await supabase.from("lesson_sets").select("id,name,is_public,hidden_at,deleted_at").eq("user_id", ownerId);
  if (setsError) throw setsError;
  const requestedTitles = new Set(sets.map((set) => set.title));
  const curated = (ownerSets ?? []).filter((set) => requestedTitles.has(String(set.name)));
  if (curated.length !== sets.length) throw new Error(`Expected ${sets.length} noun sets; found ${curated.length}.`);
  const byTitle = new Map<string, (typeof curated)[number]>();
  for (const set of curated) {
    if (byTitle.has(String(set.name))) throw new Error(`Duplicate live title: ${set.name}`);
    if (!set.is_public || set.hidden_at !== null || set.deleted_at !== null) throw new Error(`Invalid visibility: ${set.name}`);
    byTitle.set(String(set.name), set);
  }
  const cards: CardRow[] = [];
  const setIds = curated.map((set) => String(set.id));
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("cards").select("lesson_set_id,noun_id,verb_id,adjective_id,front,back,position").in("lesson_set_id", setIds).order("lesson_set_id").order("position").range(offset, offset + 999);
    if (error) throw error;
    cards.push(...((data ?? []) as CardRow[]));
    if ((data ?? []).length < 1000) break;
  }
  const rowsById = new Map([...resolved.values()].flat().map((row) => [row.id, row]));
  for (const requested of sets) {
    const liveSet = byTitle.get(requested.title)!;
    const liveCards = cards.filter((card) => card.lesson_set_id === liveSet.id).sort((a, b) => a.position - b.position);
    if (liveCards.length !== requested.cards.length) throw new Error(`Wrong card count: ${requested.title}`);
    requested.cards.forEach((spec, position) => {
      const expected = resolveCard(spec, resolved);
      const card = liveCards[position];
      const linked = card?.noun_id ? rowsById.get(card.noun_id) : undefined;
      if (card?.position !== position || card.front !== spec.lemma || linked?.id !== expected.id || card.back !== expected.image_id || card.verb_id !== null || card.adjective_id !== null) throw new Error(`${requested.title} failed at ${position}: ${spec.lemma}`);
    });
  }
  const expectedCards = sets.reduce((sum, set) => sum + set.cards.length, 0);
  if (cards.length !== expectedCards) throw new Error(`Expected ${expectedCards} noun cards; found ${cards.length}.`);
  return { verifiedSetCount: curated.length, verifiedCardCount: cards.length };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const sets = parseSets();
  validateDefinitions(sets);
  loadEnvironment(path.join(process.cwd(), ".env.local"));
  loadEnvironment(path.join(process.cwd(), ".env"));
  const supabase = createClient(requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"), requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: nouns, error: nounsError } = await supabase.from("nouns").select("id,lemma,image_id,themes").range(0, 999);
  if (nounsError) throw nounsError;
  const rowsByLemma = new Map<string, NounRow[]>();
  for (const noun of (nouns ?? []) as NounRow[]) rowsByLemma.set(noun.lemma, [...(rowsByLemma.get(noun.lemma) ?? []), noun]);
  const resolvedRows = sets.flatMap((set) => set.cards.map((card) => resolveCard(card, rowsByLemma)));
  const invalidImages = resolvedRows.filter((row) => !String(row.image_id ?? "").includes("_1.png"));
  if (invalidImages.length) throw new Error(`Nouns without image_1: ${[...new Set(invalidImages.map((row) => row.lemma))].join(", ")}`);
  const { data: owners, error: ownersError } = await supabase.from("admin_memberships").select("user_id,role").eq("role", "owner");
  if (ownersError) throw ownersError;
  if ((owners ?? []).length !== 1) throw new Error(`Expected one Classendo owner; found ${(owners ?? []).length}.`);
  const ownerId = String(owners![0].user_id);
  const { data: existing, error: existingError } = await supabase.from("lesson_sets").select("name").eq("user_id", ownerId);
  if (existingError) throw existingError;
  const existingTitles = new Set((existing ?? []).map((set) => String(set.name)));
  const summary = { mode: apply ? "apply" : "dry-run", ownerId, setCount: sets.length, cardCount: sets.reduce((sum, set) => sum + set.cards.length, 0), uniqueNounRowCount: new Set(resolvedRows.map((row) => row.id)).size, creates: sets.filter((set) => !existingTitles.has(set.title)).length, synchronizes: sets.filter((set) => existingTitles.has(set.title)).length };
  if (!apply) return console.log(JSON.stringify(summary, null, 2));
  const { error: profileError } = await supabase.from("profiles").upsert({ id: ownerId, display_name: "Classendo", username: null }, { onConflict: "id" });
  if (profileError) throw profileError;
  for (const set of sets) {
    const { error } = await supabase.rpc("sync_classendo_admin_noun_set", { owner_id: ownerId, set_name: set.title, set_tags: tagsForTitle(set.title), source_noun_ids: set.cards.map((card) => resolveCard(card, rowsByLemma).id) });
    if (error) throw new Error(`${set.title}: ${error.message}`);
  }
  console.log(JSON.stringify({ ...summary, ...(await verifyState(supabase, ownerId, sets, rowsByLemma)) }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
