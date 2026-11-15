import test from 'node:test';
import assert from 'node:assert/strict';
import { buildBrackets, featuredBracket, bracketAwards } from '../src/lib/league.ts';

const config = {
  brackets: [{ label:'GW 1–10', startGw:1, endGw:10 },{ label:'GW 11–20',startGw:11,endGw:20 }],
  datasetSeason: { lastFinishedGw:10 },
  prizes: { '1':60, '2':30 },
};
const rows = { '1':[
  { team_name:'Team A', full_name:'Manager A', points:'480' },
  { team_name:'Team B', full_name:'Manager B', points:'500' },
], '2':[{ team_name:'Team A',full_name:'Manager A',points:'100' }] };

test('a finished boundary week awards the bracket, and upcoming rows are hidden',()=>{
  const periods=buildBrackets(config,rows,10);
  assert.equal(periods[0].status,'completed');
  assert.equal(periods[0].teams[0].name,'Team B');
  assert.equal(periods[0].teams[0].prize,60);
  assert.equal(periods[1].status,'upcoming');
  assert.deepEqual(periods[1].teams,[]);
  assert.equal(featuredBracket(periods).number,1);
});
test('the live bracket becomes the default and live prizes do not enter earned awards',()=>{
  const periods=buildBrackets(config,rows,11);
  assert.equal(featuredBracket(periods).number,2);
  assert.deepEqual(bracketAwards(periods).map(row=>[row.name,row.amount]),[['Team B',60],['Team A',30]]);
});
test('an unfinished final gameweek keeps prizes provisional',()=>{
  const periods=buildBrackets({...config,datasetSeason:{lastFinishedGw:9}},rows,10);
  assert.equal(periods[0].status,'live');
  assert.deepEqual(bracketAwards(periods),[]);
});
test('missing bracket exports are distinguishable from upcoming empty results',()=>{
  const periods=buildBrackets(config,null,10);
  assert.equal(periods[0].available,false);
  assert.equal(periods[0].status,'completed');
  assert.deepEqual(bracketAwards(periods),[]);
});
