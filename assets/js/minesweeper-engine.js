/* Minesweeper rules, independent of the page and browser storage. */
(function (root, factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MinesweeperGame = factory();
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  class MinesweeperGame {
    constructor(rows, columns, mines, random = Math.random) {
      this.rows = rows;
      this.columns = columns;
      this.mines = mines;
      this.random = random;
      this.state = "ready";
      this.flagCount = 0;
      this.revealedCount = 0;
      this.explodedIndex = -1;
      this.cells = Array.from({ length: rows * columns }, () => ({
        mine: false, adjacent: 0, revealed: false, flagged: false
      }));
    }

    get finished() {
      return this.state === "won" || this.state === "lost";
    }

    neighbours(index) {
      const row = Math.floor(index / this.columns);
      const column = index % this.columns;
      const result = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr;
          const c = column + dc;
          if ((dr || dc) && r >= 0 && r < this.rows && c >= 0 && c < this.columns) {
            result.push(r * this.columns + c);
          }
        }
      }
      return result;
    }

    placeMines(firstIndex) {
      // Delay placement until the first reveal, protecting its whole neighbourhood.
      const safe = new Set([firstIndex, ...this.neighbours(firstIndex)]);
      const candidates = this.cells.map((_, index) => index).filter(index => !safe.has(index));
      for (let i = 0; i < this.mines; i++) {
        const j = i + Math.floor(this.random() * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        this.cells[candidates[i]].mine = true;
      }
      this.cells.forEach((cell, index) => {
        cell.adjacent = this.neighbours(index).filter(i => this.cells[i].mine).length;
      });
      this.state = "playing";
    }

    toggleFlag(index) {
      const cell = this.cells[index];
      if (!cell || cell.revealed || this.finished) return false;
      if (!cell.flagged && this.flagCount >= this.mines) return false;
      cell.flagged = !cell.flagged;
      this.flagCount += cell.flagged ? 1 : -1;
      return true;
    }

    reveal(index) {
      const cell = this.cells[index];
      if (!cell || cell.flagged || this.finished) return false;
      if (cell.revealed) return this.chord(index);
      if (this.state === "ready") this.placeMines(index);
      return this.open([index]);
    }

    chord(index) {
      const cell = this.cells[index];
      if (!cell || !cell.revealed || !cell.adjacent || this.finished) return false;
      const neighbours = this.neighbours(index);
      if (neighbours.filter(i => this.cells[i].flagged).length !== cell.adjacent) return false;
      return this.open(neighbours.filter(i => !this.cells[i].flagged && !this.cells[i].revealed));
    }

    open(indices) {
      const pending = indices.slice();
      let changed = false;
      while (pending.length && !this.finished) {
        const index = pending.pop();
        const cell = this.cells[index];
        if (cell.revealed || cell.flagged) continue;
        cell.revealed = true;
        changed = true;
        if (cell.mine) {
          this.explodedIndex = index;
          this.state = "lost";
          return true;
        }
        this.revealedCount++;
        if (!cell.adjacent) pending.push(...this.neighbours(index));
      }
      if (this.revealedCount === this.cells.length - this.mines) {
        this.state = "won";
        this.cells.forEach(cell => { if (cell.mine) cell.flagged = true; });
        this.flagCount = this.mines;
      }
      return changed;
    }
  }

  return MinesweeperGame;
}));
