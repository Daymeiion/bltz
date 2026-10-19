import { expect, it, vi } from "vitest";
import { extractCombineResults, parseCombineNumber } from "@/lib/enrichment/combine-extraction";
import { discoverCombine, combineSearchPlan } from "@/lib/enrichment/combine";
import { addReviewedCombine, combineChoiceKey, type CombineSuggestion } from "@/lib/player/combine-review";
import { evaluateSource } from "@/lib/source-policy/policy";
import { readFileSync } from "node:fs";
const identity = { fullName: "Fixture Player", sport: "football", schools: ["Arizona"], teams: ["San Diego Chargers"] };
const wiki = "https://en.wikipedia.org/wiki/Fixture_Player";
const prefix = '<h1>Fixture Player</h1><p>Fixture Player is a football cornerback for Arizona. He entered the 2008 NFL draft.</p>';
const table = '<table><caption>Pre-draft measurables</caption><tr><th>Height</th><th>Weight</th><th>40-yard dash</th><th>10-yard split</th><th>20-yard split</th><th>Vertical jump</th><th>Broad jump</th><th>Bench press</th><th>Three-cone drill</th></tr><tr><td>6 ft 0+1⁄4 in (1.84 m)</td><td>191 lb (87 kg)</td><td>4.45 s</td><td>1.51 s</td><td>2.53 s</td><td>35+1⁄2 in</td><td>10 ft 8 in</td><td>0 reps</td><td>DNP s</td></tr><tr><td colspan="9">All values from NFL Combine</td></tr></table>';
it("reads Cason's captured Wikipedia markup without treating citation numbers as results", () => {
 const html=readFileSync('tests/preview-lockers/fixtures/combine-wikipedia-cason.html','utf8');
 const events=extractCombineResults(html,'https://en.wikipedia.org/wiki/Antoine_Cason',{...identity,fullName:'Antoine Cason'});
 expect(events).toHaveLength(1);expect(events[0].year).toBe(2008);expect(events[0].measurements).toHaveLength(8);
 expect(events[0].measurements).toContainEqual({metric:'height',value:72.25,sourceUrl:'https://en.wikipedia.org/wiki/Antoine_Cason'});
});
it("extracts actual Draft Scout columns and corroborates Pro Day with the NFL report without borrowing Combine values", () => {
 const player={...identity,fullName:'Antoine Cason'};
 const scout=extractCombineResults(readFileSync('tests/preview-lockers/fixtures/combine-draftscout-cason.html','utf8'),'https://draftscout.com/dsprofile.php?DraftYear=2008&PlayerId=14970',player);
 expect(scout).toHaveLength(2);const pro=scout.find(event=>event.eventType==='pro_day')!;
 expect(pro.year).toBe(2008);expect(pro.measurements).toContainEqual(expect.objectContaining({metric:'cone',value:7.07}));
 expect(pro.measurements.some(item=>item.metric==='forty')).toBe(false);expect(scout[0].measurements).toContainEqual(expect.objectContaining({metric:'forty',value:4.45}));
 const nfl=extractCombineResults(readFileSync('tests/preview-lockers/fixtures/combine-nfl-cason.html','utf8'),'https://www.nfl.com/news/pro-day-updates-schools-a-g-09000d5d807755c4',player);
 expect(nfl).toHaveLength(1);expect(nfl[0]).toMatchObject({eventType:'pro_day',year:2008});
 expect(nfl[0].measurements.map(item=>[item.metric,item.value])).toEqual([['vertical',36],['cone',7.07]]);
});
it("extracts a sourced single-player table, converts fractions and jumps, ignores unknowns and 20-yard splits", () => {
  const events = extractCombineResults(prefix + table, wiki, identity);
  expect(events).toHaveLength(1); expect(events[0]).toMatchObject({ eventType: "combine", year: 2008, sourceUrl: wiki });
  expect(events[0].measurements).toEqual(expect.arrayContaining([
    { metric: "height", value: 72.25, sourceUrl: wiki }, { metric: "broad_jump", value: 128, sourceUrl: wiki },
    { metric: "vertical", value: 35.5, sourceUrl: wiki }, { metric: "bench", value: 0, sourceUrl: wiki },
  ]));
  expect(events[0].measurements.map(item => item.metric)).not.toContain("cone");
  expect(events[0].measurements.filter(item => item.metric === "ten_split")).toHaveLength(1);
});
it("projects only the named player's row from a PFR year table, including commented tables", () => {
  const html = '<!-- <table><caption>2008 NFL Combine</caption><tr><th>Player</th><th>School</th><th>40yd</th><th>Vertical</th><th>Bench</th></tr><tr><td>Other Player</td><td>Arizona</td><td>4.01</td><td>44</td><td>35</td></tr><tr><td>Fixture Player</td><td>Arizona</td><td>4.45</td><td>35.5</td><td>20</td></tr></table> -->';
  const events = extractCombineResults(html, 'https://www.pro-football-reference.com/draft/2008-combine.htm', identity);
  expect(events).toHaveLength(1); expect(events[0].measurements[0].value).toBe(4.45);
  expect(extractCombineResults(html.replace('Fixture Player', 'Other Person'), 'https://www.pro-football-reference.com/draft/2008-combine.htm', identity)).toEqual([]);
});
it("rejects wrong identities, ambiguous mixed events, inferred generic height, unsafe sources and ranges", () => {
  expect(extractCombineResults(prefix.replaceAll('Arizona', 'Stanford').replaceAll('Fixture Player', 'Other Person') + table, wiki, identity)).toEqual([]);
  expect(extractCombineResults(prefix.replace('<h1>Fixture Player</h1>', '<h1>Other Person</h1>') + table, wiki, identity)).toEqual([]);
  expect(extractCombineResults(prefix + table.replace('All values from NFL Combine', 'Values from Combine and Pro Day'), wiki, identity)).toEqual([]);
  expect(extractCombineResults(prefix + '<table><tr><th>Height</th><th>Weight</th><th>Bench</th></tr><tr><td>73</td><td>200</td><td>15</td></tr></table>', wiki, identity)).toEqual([]);
  expect(() => extractCombineResults(prefix + table, 'https://unknown.example.com/profile', identity)).toThrow('source_policy_blocked');
  expect(parseCombineNumber('forty', '4.4–4.6 seconds')).toBeNull(); expect(parseCombineNumber('weight', '87 kg')).toBeNull();
  expect(parseCombineNumber('forty', '4.45 inches')).toBeNull(); expect(parseCombineNumber('vertical', '35 seconds')).toBeNull();
  expect(parseCombineNumber('bench', '20.5 reps')).toBeNull(); expect(parseCombineNumber('broad_jump', `10'08"`)).toBe(128);
  expect(extractCombineResults('<p>Fixture Player attended the 2008 NFL combine for Arizona football. Other Athlete posted a vertical jump of 40 inches.</p>', 'https://www.nfl.com/news/fixture', identity)).toEqual([]);
});
it("keeps Combine and Pro Day table rows distinct and never selects a fastest time", () => {
  const html = prefix + '<table><tr><th>Event</th><th>40-yard dash</th><th>Vertical jump</th><th>Bench press</th></tr><tr><td>2008 NFL Combine</td><td>4.55 s</td><td>35 in</td><td>20 reps</td></tr><tr><td>2008 Pro Day</td><td>4.49 s</td><td>36 in</td><td>DNP</td></tr></table>';
  expect(extractCombineResults(html, wiki, identity).map(item => [item.eventType, item.measurements[0].value])).toEqual([["combine", 4.55], ["pro_day", 4.49]]);
});
it("searches every source with college/team context and isolates failures", async () => {
  const plan = combineSearchPlan(identity);
  expect(plan).toHaveLength(8); expect(plan.every(item => item.query.includes('"Fixture Player" football'))).toBe(true);
  expect(plan.some(item => item.query.includes('Arizona'))).toBe(true); expect(plan.some(item => item.query.includes('Chargers'))).toBe(true);
  const provider = { name: 'fixture', search: vi.fn(async (_q: string, _s: AbortSignal, options?: {includeDomains?: readonly string[]}) => {
    if (options?.includeDomains?.[0] === 'nfl.com') throw new Error('private error');
    return [{ url: options?.includeDomains?.[0] === 'wikipedia.org' ? wiki : 'https://www.pro-football-reference.com/draft/2008-combine.htm' }];
  }) };
  const extract = vi.fn(async (url: string) => extractCombineResults(prefix + table, url, identity));
  const result = await discoverCombine(identity, provider, extract, AbortSignal.timeout(5000));
  expect(provider.search).toHaveBeenCalledTimes(8); expect(extract).toHaveBeenCalledTimes(3); expect(result.status).toBe('partial'); expect(result.suggestions).toHaveLength(3);
  expect(JSON.stringify(result)).not.toContain('private error');
});
it("preserves manual measurements, source and timing while adding only reviewed blanks, without duplicate imports", () => {
  const candidate: CombineSuggestion = {id:'candidate', sourceLabel:'Wikipedia',event:extractCombineResults(prefix+table,wiki,identity)[0]};
  const manual = { ...candidate.event, id:'manual',sourceUrl:'https://school.edu/combine', measurements:[{metric:'forty' as const,value:4.6,sourceUrl:null},{metric:'bench' as const,value:0,sourceUrl:null}] };
  const choices=candidate.event.measurements.map(item=>combineChoiceKey(candidate,item.metric));
  const next=addReviewedCombine([manual],[candidate],choices);
  expect(next[0]).toMatchObject({id:'manual',sourceUrl:manual.sourceUrl,timing:manual.timing}); expect(next[0].measurements.slice(0,2)).toEqual(manual.measurements);
  expect(next[0].measurements.find(item=>item.metric==='vertical')).toEqual({metric:'vertical',value:35.5,sourceUrl:wiki});
  expect(addReviewedCombine(next,[candidate],choices)).toEqual(next); expect(manual.measurements).toHaveLength(2);
  expect(addReviewedCombine([manual],[candidate],[])).toEqual([manual]);
  const pro={...candidate,id:'pro',event:{...candidate.event,eventType:'pro_day' as const}};
  expect(addReviewedCombine([manual],[pro],pro.event.measurements.map(item=>combineChoiceKey(pro,item.metric)))).toEqual([manual]);
});
it("limits source permissions to testing data without enabling general PFR extraction", () => {
  const allowed=evaluateSource('https://www.pro-football-reference.com/draft/2008-combine.htm').allowed_actions;
  expect(allowed).toContain('EXTRACT_COMBINE'); expect(allowed).not.toContain('EXTRACT_FACTS'); expect(allowed).not.toContain('CRAWL');
  expect(evaluateSource('https://www.pro-football-reference.com/years/2008/').allowed_actions).not.toContain('EXTRACT_COMBINE');
  expect(evaluateSource('https://nfl.com.evil.example.com/news/fixture').allowed_actions).not.toContain('EXTRACT_COMBINE');
});
it("searches for Combine and removes Pro Day events before returning discovery results",async()=>{
 expect(combineSearchPlan(identity).every(item=>!item.query.includes('pro day'))).toBe(true);
 const event=extractCombineResults(prefix+table,wiki,identity)[0];
 const provider={name:'fixture',search:vi.fn(async()=>[{url:wiki}])};
 const result=await discoverCombine(identity,provider,async()=>[event,{...event,id:'pro',eventType:'pro_day'}],AbortSignal.timeout(5000));
 expect(result.suggestions.length).toBeGreaterThan(0);expect(result.suggestions.every(item=>item.event.eventType==='combine')).toBe(true);
});
