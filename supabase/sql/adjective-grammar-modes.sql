BEGIN;

-- Classendo adjective grammar modes
-- Keeps the adjective table lemma-based.
-- Adds grammar-specific display columns and appends grammar themes without removing meaning themes.

ALTER TABLE public.adjectives
  ADD COLUMN IF NOT EXISTS adverb text,
  ADD COLUMN IF NOT EXISTS image_comparative_id uuid,
  ADD COLUMN IF NOT EXISTS image_superlative_id uuid,
  ADD COLUMN IF NOT EXISTS image_adverb_id uuid;

-- Comparative / superlative forms
UPDATE public.adjectives AS a
SET
  comparative = v.comparative,
  superlative = v.superlative,
  gradable = TRUE,
  is_irregular = a.is_irregular OR v.is_irregular,
  themes = (
    SELECT ARRAY(
      SELECT DISTINCT item
      FROM unnest(COALESCE(a.themes, '{}'::text[]) || v.themes_extra) AS item
    )
  )
FROM (
  VALUES
    ('good', 'better', 'best', ARRAY['quality', 'comparative', 'superlative']::text[], TRUE),
    ('bad', 'worse', 'worst', ARRAY['quality', 'comparative', 'superlative']::text[], TRUE),
    ('far', 'farther', 'farthest', ARRAY['position', 'comparative', 'superlative']::text[], TRUE),
    ('big', 'bigger', 'biggest', ARRAY['size', 'comparative', 'superlative']::text[], FALSE),
    ('small', 'smaller', 'smallest', ARRAY['size', 'comparative', 'superlative']::text[], FALSE),
    ('tall', 'taller', 'tallest', ARRAY['size', 'comparative', 'superlative']::text[], FALSE),
    ('short', 'shorter', 'shortest', ARRAY['size', 'comparative', 'superlative']::text[], FALSE),
    ('long', 'longer', 'longest', ARRAY['size', 'comparative', 'superlative']::text[], FALSE),
    ('fast', 'faster', 'fastest', ARRAY['speed', 'comparative', 'superlative']::text[], FALSE),
    ('slow', 'slower', 'slowest', ARRAY['speed', 'comparative', 'superlative']::text[], FALSE),
    ('quick', 'quicker', 'quickest', ARRAY['speed', 'comparative', 'superlative']::text[], FALSE),
    ('hot', 'hotter', 'hottest', ARRAY['feelings', 'senses', 'comparative', 'superlative']::text[], FALSE),
    ('cold', 'colder', 'coldest', ARRAY['feelings', 'senses', 'comparative', 'superlative']::text[], FALSE),
    ('happy', 'happier', 'happiest', ARRAY['feelings', 'comparative', 'superlative']::text[], FALSE),
    ('easy', 'easier', 'easiest', ARRAY['quality', 'comparative', 'superlative']::text[], FALSE),
    ('heavy', 'heavier', 'heaviest', ARRAY['size', 'comparative', 'superlative']::text[], FALSE),
    ('funny', 'funnier', 'funniest', ARRAY['personality', 'comparative', 'superlative']::text[], FALSE),
    ('tiny', 'tinier', 'tiniest', ARRAY['size', 'comparative', 'superlative']::text[], FALSE),
    ('pretty', 'prettier', 'prettiest', ARRAY['appearance', 'comparative', 'superlative']::text[], FALSE),
    ('beautiful', 'more beautiful', 'most beautiful', ARRAY['appearance', 'comparative', 'superlative']::text[], FALSE),
    ('expensive', 'more expensive', 'most expensive', ARRAY['quality', 'comparative', 'superlative']::text[], FALSE),
    ('difficult', 'more difficult', 'most difficult', ARRAY['quality', 'comparative', 'superlative']::text[], FALSE),
    ('dangerous', 'more dangerous', 'most dangerous', ARRAY['condition', 'comparative', 'superlative']::text[], FALSE),
    ('interesting', 'more interesting', 'most interesting', ARRAY['causes', 'comparative', 'superlative']::text[], FALSE),
    ('careful', 'more careful', 'most careful', ARRAY['quality', 'personality', 'comparative', 'superlative']::text[], FALSE)
) AS v(lemma, comparative, superlative, themes_extra, is_irregular)
WHERE a.lemma = v.lemma;

-- Adverb forms
UPDATE public.adjectives AS a
SET
  adverb = v.adverb,
  allows_adverb = TRUE,
  gradable = TRUE,
  themes = (
    SELECT ARRAY(
      SELECT DISTINCT item
      FROM unnest(COALESCE(a.themes, '{}'::text[]) || v.themes_extra) AS item
    )
  )
FROM (
  VALUES
    ('good', 'well', ARRAY['quality', 'adverb']::text[]),
    ('bad', 'badly', ARRAY['quality', 'adverb']::text[]),
    ('quick', 'quickly', ARRAY['speed', 'comparative', 'superlative', 'adverb']::text[]),
    ('slow', 'slowly', ARRAY['speed', 'comparative', 'superlative', 'adverb']::text[]),
    ('quiet', 'quietly', ARRAY['senses', 'personality', 'adverb']::text[]),
    ('loud', 'loudly', ARRAY['senses', 'adverb']::text[]),
    ('careful', 'carefully', ARRAY['quality', 'personality', 'adverb']::text[]),
    ('careless', 'carelessly', ARRAY['quality', 'personality', 'adverb']::text[]),
    ('happy', 'happily', ARRAY['feelings', 'comparative', 'superlative', 'adverb']::text[]),
    ('angry', 'angrily', ARRAY['feelings', 'adverb']::text[]),
    ('easy', 'easily', ARRAY['quality', 'comparative', 'superlative', 'adverb']::text[]),
    ('beautiful', 'beautifully', ARRAY['appearance', 'comparative', 'superlative', 'adverb']::text[]),
    ('polite', 'politely', ARRAY['personality', 'adverb']::text[]),
    ('rude', 'rudely', ARRAY['personality', 'adverb']::text[]),
    ('brave', 'bravely', ARRAY['personality', 'adverb']::text[]),
    ('calm', 'calmly', ARRAY['feelings', 'adverb']::text[]),
    ('safe', 'safely', ARRAY['condition', 'adverb']::text[]),
    ('honest', 'honestly', ARRAY['personality', 'adverb']::text[]),
    ('soft', 'softly', ARRAY['senses', 'adverb']::text[]),
    ('bright', 'brightly', ARRAY['senses', 'adverb']::text[]),
    ('nervous', 'nervously', ARRAY['feelings', 'adverb']::text[]),
    ('lazy', 'lazily', ARRAY['personality', 'adverb']::text[]),
    ('successful', 'successfully', ARRAY['quality', 'adverb']::text[]),
    ('helpful', 'helpfully', ARRAY['quality', 'personality', 'adverb']::text[]),
    ('powerful', 'powerfully', ARRAY['quality', 'adverb']::text[])
) AS v(lemma, adverb, themes_extra)
WHERE a.lemma = v.lemma;

COMMIT;
