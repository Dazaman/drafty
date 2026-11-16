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
  assert.equal(story.kind,'Standout haul');assert.match(story.description,/18 of Test FC’s 40 points \(45%\)/);assert.match(story.headline,/Danial takes the lead/);
});
test('distributed returns earn a team-effort story',()=>{
  const story=performanceStory(data,2,1,facts([player('A',8),player('B',7),player('C',6),player('D',5),player('E',5)]),'Danial');
  assert.equal(story.kind,'A team effort');assert.match(story.description,/5 players returned/);
});
test('a strong next-week transfer return names the incoming and outgoing players',()=>{
  const story=performanceStory(data,2,1,facts([player('Schade',14),player('Rice',10)],[{playerIn:'Schade',playerOut:'Tel',playerInPts:14,playerOutPts:0,netPts:14,transactionGw:1}]),'Danial');
  assert.equal(story.kind,'A transfer that paid off');assert.match(story.description,/14 more than Tel scored in GW 2/);
});
test('small transfers do not become magical and missing evidence falls back honestly',()=>{
  const story=performanceStory(data,2,1,facts([player('Schade',4),player('Rice',3)],[{playerIn:'Schade',playerOut:'Tel',playerInPts:4,playerOutPts:2,netPts:2,transactionGw:1}]),'Danial');
  assert.equal(story.kind,'The weekly performance');
  const missing=performanceStory(data,2,1,null,'Ali');assert.match(missing.headline,/Ali slips/);assert.match(missing.description,/isn’t available/);assert.equal(missing.performance,null);
});
