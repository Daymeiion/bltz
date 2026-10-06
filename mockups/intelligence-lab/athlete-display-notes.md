# Keith Rivers header source audit

Reviewed October 2, 2026. [athlete-display-data.js](athlete-display-data.js) is a local presentation adapter only. It leaves `data.js`, production and canonical career relationships unchanged. Other athletes receive no inferred tenure, current status or contact data. Confidence labels describe source support, not calibrated probabilities.

## Career facts: high confidence, official sources

| Display fact | Primary evidence and qualification |
| --- | --- |
| USC, 2004–2007 | [Official player biography](https://usctrojans.com/sports/football/roster/keith-rivers/1763) includes freshman 2004 through senior 2007 entries. These are college seasons, not exact enrollment dates. |
| NFL entry, 2008 | [Bills signing report](https://www.buffalobills.com/news/bills-agree-to-terms-with-lb-keith-rivers-12741782) identifies first-round Bengals selection in 2008. Exact career-start day is not supplied. |
| Bengals, 2008–2011 roster seasons | Bills report says four years before joining New York in 2012. [Cowboys career summary](https://www.dallascowboys.com/news/cowboys-sign-veteran-linebacker-keith-rivers-to-one-year-deal-372606) specifies he missed all of 2011. The interval is season context, derived from explicit NFL-entry/transition years; it is not four seasons of game appearances. |
| Giants, 2012–2013 playing seasons | Bills signing report describes joining New York in 2012 and playing there in 2013; Cowboys summary records two seasons. |
| Bills, 2014 playing season | [Official release report](https://www.buffalobills.com/news/lb-keith-rivers-released-14929565) records 12 appearances after joining in March 2014 and release in February 2015. The team association extended beyond the playing season. |
| Cowboys, 2015 offseason only | Cowboys signing report plus [reserve/retired report](https://www.dallascowboys.com/news/r-mcclain-mcfadden-placed-on-pup-list-to-start-camp-keith-rivers-retires-380591) establish March signing and retirement before the regular season. Do not label 2015 as a Dallas playing season. |
| Retired; retirement reported July 30, 2015 | Official Dallas report dated July 30 records reserve/retired placement. Last regular NFL season remains 2014; retirement is a separate 2015 event. |

The header should label these **Career seasons / context**, and retain the Dallas offseason qualification. Calendar affiliation intervals would instead span Bengals 2008–2012, Giants 2012–2014 and Bills 2014–2015; those must not be presented as playing seasons.

## Date precision and conflicts

Use year/season precision in this slice. The [Giants transaction log](https://www.giants.com/team/transactions/2012) and [Bengals transaction log](https://www.bengals.com/team/transactions/2012) record April 11, while [finalization reporting](https://www.bengals.com/news/bengals-finalize-rivers-deal-but-keep-dealing-7168903) is dated April 12. These may reflect transaction versus finalization/publication rather than an erroneous record; no exact boundary day is promoted here.

Likewise Buffalo's release article is published February 17, 2015, while its [transaction log](https://www.buffalobills.com/team/transactions/2015) records February 16. Agreement, signing, transaction and article dates are distinct. Dallas's signing article is dated March 4 while its [free-agent tracker](https://www.dallascowboys.com/news/free-agent-tracker-full-list-of-cowboys-players-coming-going-staying-370931) labels March 5. Keep March/year context unless a later review resolves precise semantics.

## Contacts and identity

No personal email, telephone or verified public social account was supplied in the saved roster/review packet or established by this narrow primary-source audit. `email:null`, `phone:null`, `social:[]` mean **No verified contact details supplied**, not that no account exists. Do not use USC media-office contacts, publisher contacts, another Keith Rivers, unverified handles or generated email addresses. Hide mail/call/social actions until a reviewed value and source exist.

The immutable packet records the separately verified Sportradar NFL mapping `d2c5d2fa-dd75-444e-b8e0-63c31a3791be`, manual review dated September 18, 2026, with confidence not supplied. The canonical Athlete Career ID remains `c5dae871-a277-4256-9a0c-17a40940ad3f`; the provider mapping does not verify an application account. No provider or database call was made in this audit.

## Photograph authorship and ownership

Primary Commons `imageinfo/extmetadata` was rechecked for [Keith's photo](https://commons.wikimedia.org/wiki/File:091507-USCNeb-KeithRivers.jpg) and [Cameron's photo](https://commons.wikimedia.org/wiki/File:Cameron_Jordan_at_2010_Cal_Fan_Appreciation_Day.JPG). Returned `Artist` names Bobak Ha'Eri and BrokenSphere respectively; `Credit` says **Own work**, `Copyrighted` is **True**, and license metadata says **CC BY 3.0**. Commons hosts the file; metadata does not name Wikimedia as copyright owner. Creator credit is not a separately adjudicated chain of title or BLTZ rights approval.

Prefer **Photo by Bobak Ha’Eri · Wikimedia Commons · CC BY 3.0**, with file-page/license links and display-crop disclosure. Do not display **Owned by Wikimedia**. Keep photographer, host, license and graph relationship concepts distinct. The 2007 Keith photograph is not evidence or media for the selected 2006 or 2014 Moments.

Validation: primary text and Commons metadata read; `node --check mockups/intelligence-lab/athlete-display-data.js` passed. Root owns final header/crop/attribution/empty-state browser verification. No schema, permission, onboarding or production changes.
