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
