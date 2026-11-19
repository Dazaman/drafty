import test from 'node:test';
import assert from 'node:assert/strict';
import { positionAt, weekSnapshot, weekStory } from '../src/lib/journey.ts';

const data = [
  { name: 'Ali', gw: 1, position: 1 },
  { name: 'Danial', gw: 1, position: 2 },
  { name: 'Ali', gw: 2, position: 2 },
  { name: 'Danial', gw: 2, position: 1 },
  { name: 'Ali', gw: 3, position: 1 },
  { name: 'Danial', gw: 3, position: 1 },
];
test('journey tells a lead change from the actual weekly ranks', () => {
  assert.match(weekStory(data, 1, 1), /Ali sets the opening pace/);
  assert.match(weekStory(data, 2, 1), /Danial takes the lead/);
  assert.match(weekStory(data, 3, 1), /Ali & Danial take the lead/);
});
test('playback interpolates positions without changing recorded ranks', () => {
  assert.equal(positionAt(data, 'Ali', 1.5), 1.5);
  assert.equal(positionAt(data, 'Ali', 2), 2);
  assert.equal(positionAt(data, 'Nobody', 2), undefined);
  assert.equal(data[0].position, 1);
});
test('week snapshots preserve ties and do not mutate input', () => {
  const copy = structuredClone(data);
  assert.deepEqual(weekSnapshot(data, 3).map(row => row.name), ['Ali', 'Danial']);
  assert.deepEqual(weekSnapshot(data, 99), []);
  assert.deepEqual(data, copy);
});

const { performanceStory } = await import('../src/lib/journey.ts');
const player=(name,points)=>({id:1,name,points,goals:0,assists:0});
const facts=(players,transfers=[])=>({version:1,performances:[{managerId:1,name:'Danial',teamName:'Test FC',gw:2,points:players.reduce((a,b)=>a+b.points,0),players,transfers}]});
test('selected manager gets a standout-player story with exact share',()=>{
  const story=performanceStory(data,2,1,facts([player('Salah',18),player('Rice',12),player('Raya',10)]),'Danial');
  assert.equal(story.kind,'Standout haul');assert.match(story.description,/18 of Test FC’s 40 points \(45%\)/);assert.match(story.headline,/Danial rides Salah’s 18-point masterclass to the summit/);
});
test('distributed returns earn a team-effort story',()=>{
  const story=performanceStory(data,2,1,facts([player('A',8),player('B',7),player('C',6),player('D',5),player('E',5)]),'Danial');
  assert.equal(story.kind,'A team effort');assert.match(story.description,/5 players returned/);
});
test('a strong next-week transfer return names the incoming and outgoing players',()=>{
  const story=performanceStory(data,2,1,facts([player('Schade',14),player('Rice',10)],[{playerIn:'Schade',playerOut:'Tel',playerInPts:14,playerOutPts:0,netPts:14,transactionGw:1}]),'Danial');
  assert.equal(story.kind,'A transfer that paid off');assert.match(story.headline,/Danial’s Schade call pays off.*\+14 transfer swing.*summit/);assert.match(story.description,/14 more than Tel scored in GW 2/);
});
test('small transfers do not become magical and missing evidence falls back honestly',()=>{
  const story=performanceStory(data,2,1,facts([player('Schade',4),player('Rice',3)],[{playerIn:'Schade',playerOut:'Tel',playerInPts:4,playerOutPts:2,netPts:2,transactionGw:1}]),'Danial');
  assert.equal(story.kind,'The weekly performance');
  const missing=performanceStory(data,2,1,null,'Ali');assert.match(missing.headline,/Ali slips/);assert.match(missing.description,/isn’t available/);assert.equal(missing.performance,null);
});


test('a big climb is reported through the actual scorer and team effort',()=>{
  const ranks=[{name:'Danial',gw:1,position:5},{name:'Danial',gw:2,position:2}];
  const story=performanceStory(ranks,2,1,facts([player('Barry',16),player('A',12),player('B',11),player('C',10),player('D',10),player('E',10)]),'Danial');
  assert.match(story.headline,/Barry’s 16-point haul sparks Danial’s 3-place surge/);
  assert.match(story.headline,/69-point team effort/);
});
test('a strong individual week does not turn a falling manager into a climber',()=>{
  const f=facts([player('Salah',18),player('Rice',12),player('Raya',10)]);
  f.performances[0].name='Ali';
  const story=performanceStory(data,2,1,f,'Ali');
  assert.match(story.headline,/Salah’s 18-point haul can’t halt Ali’s slide to second/);
  assert.doesNotMatch(story.headline,/summit|surge|takes top/);
});
test('a profitable transfer does not imply an improvement in league position',()=>{
  const f=facts([player('Schade',14),player('Rice',10)],[{playerIn:'Schade',playerOut:'Tel',playerInPts:14,playerOutPts:0,netPts:14,transactionGw:1}]);
  f.performances[0].name='Ali';
  const story=performanceStory(data,2,1,f,'Ali');
  assert.match(story.headline,/Schade delivers 14.*\+14 transfer swing.*Ali slipping to second/);
});
test('joining a tie is reported as a share of the lead',()=>{
  const f=facts([player('Salah',18),player('Rice',12),player('Raya',10)]);
  Object.assign(f.performances[0],{name:'Ali',gw:3});
  const story=performanceStory(data,3,1,f,'Ali');
  assert.match(story.headline,/into a share of the lead/);
  assert.doesNotMatch(story.headline,/to the summit/);
});
test('remaining level at the top does not invent a takeover',()=>{
  const f=facts([player('Salah',18),player('Rice',12),player('Raya',10)]);
  f.performances[0].gw=3;
  const story=performanceStory(data,3,1,f,'Danial');
  assert.match(story.headline,/Salah steals the show.*Danial shares top spot/);
  assert.doesNotMatch(story.headline,/takes|surge|rides/);
});
