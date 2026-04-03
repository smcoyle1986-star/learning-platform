create index if not exists vocab_images_category_lemma_idx
  on public.vocab_images (category, lemma);

alter table public.vocab_images
  add column if not exists noun_id uuid references public.nouns(id) on delete cascade,
  add column if not exists variant text,
  add column if not exists is_default boolean not null default false,
  add column if not exists is_premium boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

drop index if exists vocab_images_lemma_category_variant_key;

create unique index if not exists vocab_images_noun_id_category_variant_key
  on public.vocab_images (noun_id, category, variant)
  where noun_id is not null;

create index if not exists vocab_images_category_noun_id_idx
  on public.vocab_images (category, noun_id);

update public.vocab_images vi
set noun_id = n.id
from public.nouns n
where vi.category = 'noun'
  and vi.noun_id is null
  and vi.lemma = n.lemma
  and (
    select count(*)
    from public.nouns n2
    where n2.lemma = vi.lemma
  ) = 1;
