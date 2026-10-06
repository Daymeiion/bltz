# Real athlete image references

These two public photo references support the isolated selected-B design. They create no production media record, canonical relationship, Moment link, rights-engine status or approval. No image was downloaded. Root visually inspected Keith in Chrome: the actual photograph shows a full-body USC player wearing number 55, with his face near the top. Keith uses `50% 8%` for the requested portrait window. Cameron retains initial `50% 40%` pending visual crop review. Root owns final desktop/mobile crop checks.

## Source verification

Reviewed October 2, 2026. Commons search found the primary file pages; the web reader could not fetch them reliably. A read-only public request to `https://commons.wikimedia.org/w/api.php` verified `action=query`, `prop=imageinfo`, `iiprop=url|extmetadata` for the exact titles below. Returned `descriptionurl` matched each file page; `Artist`, `LicenseShortName`, `LicenseUrl`, `ImageDescription` and `DateTimeOriginal` supplied attribution, license and subject context. Creator HTML was converted to plain names. Returned image URLs included Commons `utm_*` tracking parameters; the map retains the same original image path without tracking. No image bytes were fetched during verification.

| Athlete Career ID | Primary file page / exact subject metadata | Creator | Metadata date | License |
| --- | --- | --- | --- | --- |
| `c5dae871-a277-4256-9a0c-17a40940ad3f` — Keith Rivers | [091507-USCNeb-KeithRivers.jpg](https://commons.wikimedia.org/wiki/File:091507-USCNeb-KeithRivers.jpg). Description identifies linebacker Keith Rivers celebrating USC's victory over Nebraska and making the Trojan victory sign. | Bobak Ha'Eri | `2007-09-15` | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |
| `03570d21-b56b-43ec-aa85-f95883c65b6b` — Cameron Jordan | [Cameron Jordan at 2010 Cal Fan Appreciation Day.JPG](https://commons.wikimedia.org/wiki/File:Cameron_Jordan_at_2010_Cal_Fan_Appreciation_Day.JPG). Description identifies Cal defensive lineman Cameron Jordan at Fan Appreciation Day at Memorial Stadium. | BrokenSphere | `2010-08-28` | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0) |

Exact image URLs are in [portraits.js](portraits.js). The canonical athlete IDs come from the existing reviewed roster references, not Commons IDs. The API metadata returned empty `Restrictions`; that is not a BLTZ approval or a blanket clearance finding. CC BY 3.0 describes these photographs only.

## Display requirements and limits

Provide visible or accessible adjacent attribution: photographer, Wikimedia Commons file-page link, and license link. For Keith use **Bobak Ha’Eri / Wikimedia Commons · CC BY 3.0**; for Cameron use **© BrokenSphere / Wikimedia Commons · CC BY 3.0**, respecting the photographer's stated credit preference. If `object-fit: cover` clips the photo, append **Display crop**; disclose any other changes. Do not imply photographer endorsement. The source dates describe the photographs, not fetch dates or the selected Moment dates.

Keith's photo concerns USC–Nebraska in 2007. It does not support the supplied USC–Washington 2006 Moment or Bills–Bears 2014 Moment. Cameron's photo supports athlete recognition only; it adds no intelligence to his incomplete snapshot. Other roster entries retain initials or an honest missing-photo fallback. Restricted ESPN/247Sports metadata references remain excluded.

Validation: primary metadata read and `node --check mockups/intelligence-lab/portraits.js` passed. Both images loaded in the preview; the credit links remain available in dark/light and mobile views. Missing-photo initials were verified. Image-error fallback was reviewed in code; a network failure was not forced. No production promotion is implied by this design artifact.

## Final visual review

Both sourced images loaded in the local browser preview. Keith uses an additional CSS crop to favor his face and upper body; Cameron's displayed crop is `50% 32%`. Creator/file/CC BY 3.0 links and crop notices are visible, including Cameron's copyright notice. These portraits remain separate from both reviewed Moments. Four other roster entries retain initials.
