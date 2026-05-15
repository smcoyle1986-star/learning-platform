begin;

with theme_map(old_theme, new_theme) as (
  values
    ('animals baby', 'animals'),
    ('animals land', 'animals'),
    ('animals sea', 'animals'),
    ('clothes', 'clothing'),
    ('dates', 'time'),
    ('drink', 'food & drinks'),
    ('drinks', 'food & drinks'),
    ('electronics', 'technology'),
    ('food', 'food & drinks'),
    ('fruit', 'food & drinks'),
    ('furniture', 'furniture & home'),
    ('games', 'toys & games'),
    ('holidays', 'holidays & events'),
    ('home', 'furniture & home'),
    ('house items', 'furniture & home'),
    ('home items', 'furniture & home'),
    ('city', 'buildings & places'),
    ('buildings', 'buildings & places'),
    ('places', 'buildings & places'),
    ('rooms', 'furniture & home'),
    ('sports', 'sports & hobbies'),
    ('stationery', 'classroom'),
    ('subjects', 'school subjects'),
    ('toys', 'toys & games'),
    ('transport', 'transportation'),
    ('Transport', 'transportation'),
    ('utensils', 'kitchen'),
    ('cooking tools', 'kitchen'),
    ('cookware', 'kitchen'),
    ('tableware', 'kitchen'),
    ('vegetables', 'food & drinks')
),
renamed as (
  select
    n.id,
    array(
      select mapped_theme
      from (
        select
          coalesce(tm.new_theme, t.theme) as mapped_theme,
          min(t.ord) as first_ord
        from unnest(n.themes) with ordinality as t(theme, ord)
        left join theme_map tm
          on lower(t.theme) = lower(tm.old_theme)
        group by 1
      ) grouped
      order by first_ord, mapped_theme
    ) as new_themes
  from public.nouns n
  where exists (
    select 1
    from unnest(n.themes) as t(theme)
    where lower(t.theme) in (select lower(old_theme) from theme_map)
  )
)
update public.nouns n
set themes = r.new_themes
from renamed r
where n.id = r.id
  and n.themes is distinct from r.new_themes;

update public.nouns n
set themes = case lower(n.lemma)
  when 'computer' then array['classroom', 'technology']::text[]
  when 'kitchen' then array['kitchen']::text[]
  when 'smartphone' then array['technology']::text[]
  when 'tablet' then array['technology']::text[]
  when 'paintbrush' then array['classroom']::text[]
  when 'bakery' then array['buildings & places', 'food & drinks']::text[]
  when 'cafe' then array['buildings & places', 'food & drinks']::text[]
  when 'fire station' then array['buildings & places']::text[]
  when 'police station' then array['buildings & places']::text[]
  else n.themes
end
where lower(n.lemma) in ('bakery', 'cafe', 'fire station', 'police station');

with desired(lemma, countability, themes) as (
  values
    ('air fryer', 'count', array['kitchen']::text[]),
    ('lunchbox', 'count', array['kitchen', 'classroom']::text[]),
    ('thermos', 'count', array['kitchen', 'classroom']::text[]),
    ('tray', 'count', array['kitchen']::text[]),
    ('whisk', 'count', array['kitchen']::text[]),
    ('smartwatch', 'count', array['technology']::text[]),
    ('speaker', 'count', array['technology', 'music']::text[]),
    ('webcam', 'count', array['technology']::text[]),
    ('remote control', 'count', array['technology', 'furniture & home']::text[]),
    ('carpet', 'count', array['furniture & home']::text[]),
    ('curtain', 'count', array['furniture & home']::text[]),
    ('hanger', 'count', array['furniture & home', 'clothing']::text[]),
    ('laundry basket', 'count', array['furniture & home']::text[]),
    ('skateboard', 'count', array['sports & hobbies', 'transportation']::text[]),
    ('roller skates', 'count', array['sports & hobbies']::text[]),
    ('paintbrush', 'count', array['sports & hobbies', 'classroom']::text[]),
    ('binoculars', 'count', array['sports & hobbies']::text[]),
    ('bakery', 'count', array['buildings & places', 'food & drinks']::text[]),
    ('cafe', 'count', array['buildings & places', 'food & drinks']::text[]),
    ('fire station', 'count', array['buildings & places']::text[]),
    ('police station', 'count', array['buildings & places']::text[]),
    ('medicine', 'count', array['health']::text[]),
    ('bandage', 'count', array['health']::text[]),
    ('thermometer', 'count', array['health']::text[]),
    ('wheelchair', 'count', array['health']::text[])
)
insert into public.nouns (id, lemma, part_of_speech, countability, difficulty, themes, image_id)
select gen_random_uuid(), d.lemma, 'noun', d.countability, 1, d.themes, null
from desired d
where not exists (
  select 1
  from public.nouns n
  where lower(n.lemma) = lower(d.lemma)
);

commit;
