# AI photo prompts for the BLTZ redesign

These replace every stand-in photo on `/redesign` and `/redesign/enterprise`.
They work with Midjourney, DALL·E, Imagen, Firefly or Flux. Each prompt is
self-contained, so you can paste it as-is.

## How to use this

1. Generate each image at the size listed, then pick the best of a few tries.
2. Save it to `public/images/redesign/` with the **exact file name** listed.
3. In `components/redesign/assets.ts`, change that entry's `src` to
   `/images/redesign/<file name>`. The sample locker images live in
   `components/redesign/sampleLocker.ts`.

Export JPG at about 80% quality (PNG for the headshot cut-out). Keep each file
under about 400 KB.

## Rules for every image

- **No real logos, team names, league marks or sponsor marks.** Uniforms are
  plain: navy with gold trim for "our" athletes, solid colors for opponents.
- **No real people.** Invent the athletes. Vary age, skin tone and build,
  and include women's sports where noted.
- No text, watermarks or scoreboards with readable names.
- Night lighting or dusk light, with a deep, dark background, to match the page.

Add this **style suffix** to the end of every prompt:

> editorial sports photography, shot on a full-frame camera with a 35mm lens,
> one hard key light with deep shadows, shallow depth of field, subtle film
> grain, rich navy and warm gold color grade, photorealistic, no logos, no text,
> no watermark

If your tool supports a **negative prompt**, use:

> logo, brand mark, team name, NFL, NCAA, Nike, Adidas, Under Armour, text,
> letters, watermark, scoreboard text, extra fingers, deformed hands, plastic
> skin, cartoon, illustration

---

## Athletes page

### Hero
No photos needed. The locker room and jersey are 3D.

### "Built for every chapter" (audience photo reveal)
Size: **1600 × 2000 (4:5 portrait)**

| File | Prompt |
| --- | --- |
| `audience-high-school.jpg` | A 16-year-old high school football player standing on a small-town field under Friday-night stadium lights, helmet held at his side, breath visible in cold air, empty wooden bleachers softly blurred behind him, plain navy jersey with gold trim |
| `audience-college.jpg` | A college wide receiver mid-stride, reaching for a pass at night, crowd as warm bokeh behind, sweat and motion, plain navy uniform with gold numbers, low angle |
| `audience-pro.jpg` | A professional linebacker walking out of a concrete stadium tunnel toward bright field lights, seen from behind at shoulder height, silhouette edged in light, plain navy uniform |
| `audience-former.jpg` | A former football player in his mid-40s in a plain charcoal hoodie, sitting on a locker room bench holding a worn game ball, warm tungsten light, reflective expression, lockers soft behind him |
| `audience-coaches.jpg` | A football coach in his 50s on the sideline at night, headset on, arms folded, focused on the field, a plain navy team jacket, stadium lights flaring behind |

### "Every chapter, kept in one place" (career timeline)
Size: **1600 × 1200 (4:3 landscape)**. These tell one athlete's story, so keep
the same young man across `chapter-*` images where your tool allows a
character reference.

| File | Prompt |
| --- | --- |
| `chapter-friday-nights.jpg` | Grainy, slightly faded high school football game footage frame shot from the press box at night, players in plain navy and white uniforms mid-play, VHS-era color, soft focus, nostalgic |
| `chapter-saturdays.jpg` | A college cornerback celebrating an interception, ball held high, packed night stadium blurred behind, plain navy and gold uniform, number 1 on the jersey |
| `chapter-the-trophy.jpg` | A 21-year-old college athlete in a black tuxedo holding a bronze football trophy at an awards banquet, warm ballroom light, proud smile, shallow depth of field |
| `chapter-draft-day.jpg` | A trading card on a dark wooden table, showing a football player in a plain navy uniform with gold trim, card with a holographic border and no text or logos, a phone face down beside it, moody top light |
| `chapter-sundays.jpg` | A professional defensive back celebrating with both arms raised in a packed stadium at night, confetti-like stadium light flares, plain royal blue uniform with white numbers |
| `chapter-whats-next.jpg` | A retired football player in his early 30s coaching teenagers at an outdoor training session at golden hour, demonstrating a hand-fighting drill, plain athletic wear |

### Connected channels (photo wall)
Size: **1600 × 1200 (4:3 landscape)**. The wall also reuses the chapter images
above, so only these are new.

| File | Prompt |
| --- | --- |
| `wall-broadcast.jpg` | A wide broadcast-style football game frame from high above the field at night, players as small figures, grainy TV look, no on-screen graphics |
| `wall-headshot.jpg` | Studio headshot of a young Black football player, plain navy jersey, neutral grey seamless background, soft key light, confident neutral expression |
| `wall-helmet.jpg` | Close-up of a football player putting on a plain matte navy helmet in a dim locker room, face partly lit, focused eyes |
| `wall-autograph.jpg` | A football player's hand signing a plain white trading card with a black marker, shallow depth of field, warm light |
| `wall-program.jpg` | A vintage game-day program cover on a table, an illustrated football player in a plain navy uniform, with no readable text, aged paper texture |
| `wall-basketball.jpg` | A women's college basketball player rising for a layup in a dim arena, spotlight from above, plain navy and gold uniform |

### Sample Player Locker (inside the phone)
These sit in `components/redesign/sampleLocker.ts`.

| File | Size | Prompt |
| --- | --- | --- |
| `locker-headshot.png` | 1200 × 1500, transparent background | Waist-up portrait of a 22-year-old Black college defensive back, plain navy jersey number 1 with gold trim, slight smile, studio lighting, isolated on a transparent background |
| `locker-hero.mp4` | 1080 × 1920 vertical, 6–8 s loop | Slow-motion clip of the same player celebrating after a play under stadium lights, plain navy uniform, crowd blurred, seamless loop (Runway, Pika, Sora or Veo) |
| `locker-film-1.jpg` | 1600 × 900 (16:9) | The same player breaking up a pass at night, wide action shot |
| `locker-film-2.jpg` | 1600 × 900 (16:9) | The same player jogging out of the tunnel before a game, crowd and lights behind |
| `locker-film-3.jpg` | 1600 × 900 (16:9) | The same player returning an interception down the sideline, motion blur |
| `locker-photo-1.jpg` | 1600 × 1200 | The same player on the sideline with his helmet off, laughing with a teammate |
| `locker-photo-2.jpg` | 1200 × 1600 (portrait) | The same player kneeling in the end zone in prayer after a game, stadium lights |
| `locker-photo-3.jpg` | 1600 × 1200 | The same player signing autographs for kids along a railing |

---

## Enterprise page

### "Built for your program" (stacked program cards)
Size: **2400 × 1000 (12:5 wide)**. Text sits in the bottom third, so keep the
subject in the upper half.

| File | Prompt |
| --- | --- |
| `program-athletic-departments.jpg` | Aerial view of a college football stadium at dusk, lights on, team in plain navy running onto the field, campus buildings around it |
| `program-nil-collectives.jpg` | A small group of community supporters and two college athletes in plain navy warm-ups shaking hands at a local business storefront at golden hour |
| `program-letterwinners.jpg` | A reunion of former college football players in their 40s and 50s in plain navy polos, laughing together on a field at sunset |
| `program-booster-clubs.jpg` | A packed tailgate at dusk, fans in plain navy and gold, a grill smoking, stadium lights glowing in the background |
| `program-foundations.jpg` | A former athlete in a suit speaking to a small audience in a trophy room, warm light, display cases with unbranded trophies |
| `program-high-school.jpg` | A high school football team huddled at midfield under Friday-night lights, plain navy uniforms, small-town bleachers behind |

### "One system, two perspectives" (audience cards)
Size: **2000 × 1000 (2:1)**

| File | Prompt |
| --- | --- |
| `perspective-departments.jpg` | An athletic department staff member reviewing a laptop in a modern stadium office overlooking the field at night, warm desk lamp |
| `perspective-collectives.jpg` | A college athlete in a plain navy hoodie filming a short video with a local business owner inside a coffee shop, phone on a gimbal |

### Problem statement (floating tiles)
No photos needed. These are icon tiles.

---

## When you're done

- Delete any stand-in you replaced from `components/redesign/assets.ts`.
- Check the pages at desktop and phone width. Adjust `position` in
  `assets.ts` (for example `"center 30%"`) to keep faces in frame.
