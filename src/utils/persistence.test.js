import test from 'node:test';
import assert from 'node:assert/strict';
import { clearConfiguration, loadConfiguration, saveConfiguration } from './persistence.js';

function createMemoryStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  };
}

test('configuration persistence round-trips and clears without run state', () => {
  const storage = createMemoryStorage();
  const configuration = {
    graph: { nodes: [], edges: [] },
    customAgent: { warmTone: true },
    customLearner: { terse: true },
  };

  saveConfiguration(configuration, storage);
  assert.deepEqual(loadConfiguration(storage), configuration);
  clearConfiguration(storage);
  assert.equal(loadConfiguration(storage), null);
});

test('invalid stored data fails closed', () => {
  const storage = createMemoryStorage();
  storage.setItem('learning-system-demo:configuration:v1', '{not-json');
  assert.equal(loadConfiguration(storage), null);
});
