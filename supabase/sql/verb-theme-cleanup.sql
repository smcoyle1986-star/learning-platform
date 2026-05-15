begin;

-- Clean out the old broad verb themes first.
update public.verbs
set themes = array_remove(
  array_remove(coalesce(themes, '{}'::text[]), 'activities'),
  'mental processes'
)
where coalesce(themes, '{}'::text[]) && ARRAY['activities', 'mental processes'];

-- Rebuild verb themes with the final teacher-friendly set.
with theme_map as (
  select * from (
    values
      (
        'action',
        array[
          'break',
          'bring',
          'catch',
          'catch a ball',
          'clap',
          'clean',
          'climb',
          'cook',
          'cut',
          'dance',
          'draw',
          'exercise',
          'fix',
          'give',
          'grab',
          'jump',
          'make',
          'open',
          'paint',
          'play',
          'pull',
          'push',
          'kick a ball',
          'raise your hand',
          'sit',
          'sit down',
          'stand',
          'stand up',
          'start',
          'throw',
          'throw a ball',
          'tidy',
          'wash',
          'watch',
          'write',
          'write a story',
          'color',
          'cry',
          'dig',
          'fight',
          'find',
          'glue',
          'hide',
          'hug',
          'hurt',
          'laugh',
          'smile'
        ]::text[]
      ),
      (
        'daily life',
        array[
          'brush your hair',
          'brush your teeth',
          'buy groceries',
          'buy snacks',
          'check your answers',
          'clean up',
          'close your book',
          'come home',
          'cook dinner',
          'do homework',
          'do laundry',
          'drink',
          'eat',
          'eat breakfast',
          'eat dinner',
          'eat lunch',
          'exercise',
          'finish',
          'finish class',
          'finish school',
          'finish work',
          'get dressed',
          'get sick',
          'go shopping',
          'go to bed',
          'go to school',
          'go to the park',
          'go to work',
          'have a snack',
          'leave the house',
          'make friends',
          'meet friends',
          'open your book',
          'put your shoes on',
          'save money',
          'say goodbye',
          'say hello',
          'study',
          'study English',
          'study math',
          'study science',
          'take a shower',
          'take a walk',
          'take the bus',
          'take the train',
          'take your shoes off',
          'talk to friends',
          'use the computer',
          'use your phone',
          'wake up',
          'wash the dishes',
          'wash your face',
          'wash your hands',
          'work together',
          'go on a vacation'
        ]::text[]
      ),
      (
        'communication',
        array[
          'answer',
          'ask',
          'ask a question',
          'ask for help',
          'explain',
          'listen',
          'listen carefully',
          'listen to music',
          'make friends',
          'meet',
          'meet friends',
          'say',
          'say goodbye',
          'say hello',
          'shout',
          'speak',
          'talk',
          'talk to friends',
          'teach',
          'tell',
          'whisper',
          'work together'
        ]::text[]
      ),
      (
        'sensing',
        array[
          'hear',
          'listen',
          'listen carefully',
          'listen to music',
          'look',
          'smell',
          'sound',
          'taste',
          'touch',
          'watch',
          'watch TV',
          'feel',
          'see'
        ]::text[]
      ),
      (
        'thinking',
        array[
          'decide',
          'dislike',
          'explain',
          'guess',
          'hate',
          'know',
          'like',
          'love',
          'memorize',
          'need',
          'plan',
          'study',
          'teach',
          'think',
          'understand',
          'want'
        ]::text[]
      ),
      (
        'movement',
        array[
          'come home',
          'fly',
          'go',
          'go on a vacation',
          'go to bed',
          'go to school',
          'go to the park',
          'go to work',
          'leave the house',
          'ride',
          'run',
          'swim',
          'take a walk',
          'take the bus',
          'take the train',
          'walk'
        ]::text[]
      ),
      (
        'play & hobbies',
        array[
          'catch a ball',
          'dance',
          'draw',
          'exercise',
          'fly a kite',
          'go camping',
          'go fishing',
          'go hiking',
          'go on a vacation',
          'go skiing',
          'have fun',
          'jump rope',
          'make a campfire',
          'make a snowman',
          'paint',
          'play',
          'play a computer game',
          'play a game',
          'play hopscotch',
          'play inside',
          'play outside',
          'put up the tent',
          'swim',
          'watch TV',
          'kick a ball',
          'throw a ball',
          'listen to music'
        ]::text[]
      )
  ) as t(theme, lemmas)
),
expanded as (
  select theme, unnest(lemmas) as lemma
  from theme_map
),
desired as (
  select lemma, array_agg(distinct theme order by theme) as themes
  from expanded
  group by lemma
)
update public.verbs v
set themes = desired.themes
from desired
where v.lemma = desired.lemma;

commit;
