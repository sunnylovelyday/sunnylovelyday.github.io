// Run with: node --test .github/tests/minesweeper.test.cjs
const assert = require('node:assert/strict');
const test = require('node:test');
const Game = require('../../assets/js/minesweeper-engine.js');

function rng(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

test('all difficulties: exact mine count, safe first neighbourhood, correct numbers, and win', () => {
  for (const [rows, columns, mines] of [[9, 9, 10], [16, 16, 40], [16, 30, 99]]) {
    for (let seed = 1; seed <= 100; seed++) {
      const game = new Game(rows, columns, mines, rng(seed));
      const first = seed % (rows * columns);
      assert.equal(game.reveal(first), true);
      assert.equal(game.cells.filter(c => c.mine).length, mines);
      for (const i of [first, ...game.neighbours(first)]) assert.equal(game.cells[i].mine, false);
      game.cells.forEach((cell, i) => {
        assert.equal(cell.adjacent, game.neighbours(i).filter(n => game.cells[n].mine).length);
        if (cell.revealed) assert.equal(cell.mine, false);
        if (cell.revealed && cell.adjacent === 0) {
          for (const n of game.neighbours(i)) assert.equal(game.cells[n].revealed, true);
        }
      });
      game.cells.forEach((cell, i) => { if (!cell.mine) game.reveal(i); });
      assert.equal(game.state, 'won');
      assert.equal(game.revealedCount, rows * columns - mines);
      assert.equal(game.flagCount, mines);
      assert.equal(game.toggleFlag(first), false);
      assert.equal(game.reveal(first), false);
    }
  }
});

test('neighbours do not wrap at board edges', () => {
  const game = new Game(9, 9, 10);
  assert.deepEqual(game.neighbours(0).sort((a,b) => a-b), [1, 9, 10]);
  assert.deepEqual(game.neighbours(8).sort((a,b) => a-b), [7, 16, 17]);
  assert.deepEqual(game.neighbours(80).sort((a,b) => a-b), [70, 71, 79]);
  assert.equal(game.neighbours(40).length, 8);
});

test('flags before first reveal, flag limit, and protected flagged cells', () => {
  const game = new Game(9, 9, 10, rng(42));
  for (let i = 0; i < 10; i++) assert.equal(game.toggleFlag(i), true);
  assert.equal(game.flagCount, 10);
  assert.equal(game.toggleFlag(10), false);
  assert.equal(game.reveal(0), false);
  assert.equal(game.state, 'ready');
  assert.equal(game.toggleFlag(0), true);
  game.reveal(0);
  assert.equal(game.cells[1].revealed, false);
  assert.equal(game.toggleFlag(1), true);
  assert.equal(game.reveal(1), true);
  assert.equal(game.cells[1].mine, false);
});

test('revealing a mine ends the game and freezes further actions', () => {
  const game = new Game(9, 9, 10, rng(17));
  game.reveal(40);
  const mine = game.cells.findIndex(c => c.mine);
  assert.equal(game.reveal(mine), true);
  assert.equal(game.state, 'lost');
  assert.equal(game.explodedIndex, mine);
  const before = JSON.stringify(game.cells);
  assert.equal(game.reveal(0), false);
  assert.equal(game.toggleFlag(0), false);
  assert.equal(game.chord(40), false);
  assert.equal(JSON.stringify(game.cells), before);
});

function fixture() {
  const game = new Game(3, 3, 1);
  game.state = 'playing';
  game.cells[0].mine = true;
  game.cells.forEach((c, i) => { c.adjacent = game.neighbours(i).filter(n => game.cells[n].mine).length; });
  game.reveal(4);
  return game;
}

test('chording requires the correct flag count and opens neighbouring safe squares', () => {
  const game = fixture();
  assert.equal(game.chord(4), false);
  game.toggleFlag(0);
  assert.equal(game.reveal(4), true);
  assert.equal(game.state, 'won');
  assert.equal(game.revealedCount, 8);
});

test('chording with a misplaced flag can lose', () => {
  const game = fixture();
  game.toggleFlag(1);
  assert.equal(game.chord(4), true);
  assert.equal(game.state, 'lost');
  assert.equal(game.explodedIndex, 0);
});
