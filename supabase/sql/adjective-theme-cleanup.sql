BEGIN;

-- Classendo adjective theme cleanup
-- Keeps all adjective rows, removes the old ful_less grouping, and rewrites themes in place.
-- Missing lemmas from the original mapping were assigned to the closest available theme:
-- eventful, eventless, powerless -> condition
-- helpless, hopeful, hopeless, restless, thankful -> feelings

UPDATE public.adjectives
SET themes = ARRAY['appearance']::text[]
WHERE lemma IN (
  'handsome',
  'bald',
  'ugly',
  'cute',
  'pretty',
  'beautiful',
  'clean-looking',
  'dirty-looking'
);

UPDATE public.adjectives
SET themes = ARRAY['colors']::text[]
WHERE lemma IN (
  'purple',
  'black',
  'white',
  'orange',
  'gray',
  'dark blue',
  'light blue',
  'dark green',
  'light green',
  'yellow',
  'green',
  'blue',
  'red',
  'brown',
  'pink',
  'colorful',
  'colorless'
);

UPDATE public.adjectives
SET themes = ARRAY['feelings']::text[]
WHERE lemma IN (
  'shocked',
  'happy',
  'sad',
  'sleepy',
  'angry',
  'hungry',
  'thirsty',
  'excited',
  'scared',
  'tired',
  'annoyed',
  'nervous',
  'interested',
  'bored',
  'surprised',
  'amazed',
  'confused',
  'frustrated',
  'relaxed',
  'disappointed',
  'embarrassed',
  'frightened',
  'worried',
  'satisfied',
  'exhausted',
  'terrified',
  'encouraged',
  'calm',
  'stressed',
  'proud',
  'lonely',
  'hopeful',
  'hopeless',
  'helpless',
  'thankful',
  'restless'
);

UPDATE public.adjectives
SET themes = ARRAY['causes']::text[]
WHERE lemma IN (
  'worrying',
  'satisfying',
  'scary',
  'boring',
  'exciting',
  'surprising',
  'interesting',
  'tiring',
  'frustrating',
  'relaxing',
  'shocking',
  'disappointing',
  'embarrassing',
  'frightening',
  'encouraging',
  'terrifying',
  'annoying',
  'exhausting',
  'amazing',
  'confusing'
);

UPDATE public.adjectives
SET themes = ARRAY['condition']::text[]
WHERE lemma IN (
  'open',
  'closed',
  'busy',
  'crowded',
  'fixed',
  'broken',
  'weak',
  'strong',
  'dangerous',
  'safe',
  'dry',
  'wet',
  'full',
  'empty',
  'new',
  'clean',
  'dirty',
  'harmless',
  'harmful',
  'ready',
  'eventful',
  'eventless',
  'powerless'
);

UPDATE public.adjectives
SET themes = ARRAY['quality']::text[]
WHERE lemma IN (
  'simple',
  'good',
  'bad',
  'great',
  'expensive',
  'cheap',
  'difficult',
  'easy',
  'useful',
  'useless',
  'meaningful',
  'meaningless',
  'successful',
  'unsuccessful',
  'painful',
  'painless',
  'powerful'
);

UPDATE public.adjectives
SET themes = ARRAY['senses']::text[]
WHERE lemma IN (
  'bitter',
  'spicy',
  'salty',
  'sour',
  'sweet',
  'dark',
  'bright',
  'noisy',
  'soft',
  'loud',
  'tasteful',
  'tasteless',
  'restful'
);

UPDATE public.adjectives
SET themes = ARRAY['position']::text[]
WHERE lemma IN (
  'low',
  'near',
  'far',
  'high',
  'shallow',
  'deep'
);

UPDATE public.adjectives
SET themes = ARRAY['speed']::text[]
WHERE lemma IN (
  'quick',
  'slow',
  'fast'
);

UPDATE public.adjectives
SET themes = ARRAY['personality']::text[]
WHERE lemma IN (
  'lazy',
  'smart',
  'grumpy',
  'funny',
  'brave',
  'friendly',
  'mean',
  'kind',
  'polite',
  'rude',
  'hardworking',
  'honest',
  'dishonest',
  'young',
  'shy',
  'silly',
  'thoughtful',
  'thoughtless',
  'respectful',
  'disrespectful'
);

UPDATE public.adjectives
SET themes = ARRAY['size']::text[]
WHERE lemma IN (
  'tall',
  'long',
  'short',
  'light',
  'heavy',
  'huge',
  'tiny',
  'small',
  'big',
  'flat',
  'curved',
  'straight',
  'bent',
  'narrow',
  'wide',
  'thin',
  'thick'
);

-- Multi-theme adjectives
UPDATE public.adjectives
SET themes = ARRAY['appearance','condition']::text[]
WHERE lemma = 'messy';

UPDATE public.adjectives
SET themes = ARRAY['appearance','senses']::text[]
WHERE lemma IN ('shiny', 'dull');

UPDATE public.adjectives
SET themes = ARRAY['feelings','senses']::text[]
WHERE lemma IN ('hot', 'cold');

UPDATE public.adjectives
SET themes = ARRAY['quality','senses']::text[]
WHERE lemma = 'delicious';

UPDATE public.adjectives
SET themes = ARRAY['senses','quality']::text[]
WHERE lemma = 'hard';

UPDATE public.adjectives
SET themes = ARRAY['condition','personality']::text[]
WHERE lemma = 'old';

UPDATE public.adjectives
SET themes = ARRAY['senses','personality']::text[]
WHERE lemma = 'quiet';

UPDATE public.adjectives
SET themes = ARRAY['quality','personality']::text[]
WHERE lemma IN ('helpful', 'careful', 'careless');

COMMIT;
