(function () {
  "use strict";

  const container = document.getElementById("minesweeper");
  if (!container || typeof MinesweeperGame === "undefined") return;

  const levels = {
    beginner: { rows: 9, columns: 9, mines: 10 },
    intermediate: { rows: 16, columns: 16, mines: 40 },
    expert: { rows: 16, columns: 30, mines: 99 }
  };
  const board = document.getElementById("ms-board");
  const difficulty = document.getElementById("ms-difficulty");
  const flagButton = document.getElementById("ms-flag-mode");
  const remaining = document.getElementById("ms-remaining");
  const time = document.getElementById("ms-time");
  const best = document.getElementById("ms-best");
  const status = document.getElementById("ms-status");
  let game;
  let buttons = [];
  let flagMode = false;
  let focusIndex = 0;
  let startedAt = null;
  let elapsed = 0;
  let ticker = null;

  function formatTime(seconds) {
    return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
  }

  function bestKey() {
    return "sunnylovelyday.minesweeper.best.v1." + difficulty.value;
  }

  function readBest() {
    try {
      const saved = localStorage.getItem(bestKey());
      const value = Number(saved);
      return saved !== null && Number.isInteger(value) && value >= 0 ? value : null;
    } catch (_) {
      return null;
    }
  }

  function showBest() {
    const value = readBest();
    best.textContent = value === null ? "—" : formatTime(value);
  }

  function updateTime() {
    if (startedAt !== null) elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
    time.textContent = formatTime(elapsed);
  }

  function render() {
    container.dataset.state = game.state;
    remaining.textContent = game.mines - game.flagCount;
    buttons.forEach((button, index) => {
      const cell = game.cells[index];
      const showMine = game.state === "lost" && cell.mine;
      const wrongFlag = game.state === "lost" && cell.flagged && !cell.mine;
      let label = "Row " + (Math.floor(index / game.columns) + 1) + ", column " + (index % game.columns + 1) + ": ";
      button.className = "ms-cell";
      button.textContent = "";
      button.removeAttribute("data-count");
      if (wrongFlag) {
        button.classList.add("is-wrong");
        button.textContent = "×";
        label += "incorrect flag";
      } else if (showMine) {
        button.classList.add("is-mine");
        if (index === game.explodedIndex) button.classList.add("is-exploded");
        button.textContent = "✹";
        label += "mine";
      } else if (cell.flagged) {
        button.classList.add("is-flagged");
        button.textContent = "⚑";
        label += "flagged";
      } else if (cell.revealed) {
        button.classList.add("is-revealed");
        button.dataset.count = cell.adjacent;
        button.textContent = cell.adjacent || "";
        label += cell.adjacent ? cell.adjacent + " adjacent mines" : "empty";
      } else {
        label += "covered";
      }
      button.setAttribute("aria-label", label);
      button.setAttribute("aria-disabled", String(game.finished));
    });
    if (game.state === "won") {
      status.textContent = "Board cleared in " + formatTime(elapsed) + ". Well played! / 恭喜，排雷成功！";
    } else if (game.state === "lost") {
      status.textContent = "A mine! Try a new board. / 踩到地雷了，再来一局吧。";
    } else if (flagMode) {
      status.textContent = "Flag mode: tap a covered square to mark it. / 插旗模式：点击未翻开的方格进行标记。";
    } else if (game.state === "ready") {
      status.textContent = "Choose a square. Your first click and its neighbours are safe. / 首次点击及周围一圈安全。";
    } else {
      status.textContent = game.revealedCount + " / " + (game.cells.length - game.mines) + " safe squares revealed. / 已翻开的安全方格";
    }
  }

  function act(index, flag) {
    const wasReady = game.state === "ready";
    const changed = flag ? game.toggleFlag(index) : game.reveal(index);
    if (!changed) return;
    if (wasReady && game.state !== "ready") {
      startedAt = Date.now();
      ticker = window.setInterval(updateTime, 250);
    }
    if (game.finished) {
      updateTime();
      window.clearInterval(ticker);
      ticker = null;
      if (game.state === "won") {
        const previous = readBest();
        if (previous === null || elapsed < previous) {
          try { localStorage.setItem(bestKey(), String(elapsed)); } catch (_) { /* Storage is optional. */ }
        }
        showBest();
      }
    }
    render();
  }

  function newGame() {
    window.clearInterval(ticker);
    ticker = null;
    startedAt = null;
    elapsed = 0;
    flagMode = false;
    focusIndex = 0;
    flagButton.setAttribute("aria-pressed", "false");
    const level = levels[difficulty.value];
    game = new MinesweeperGame(level.rows, level.columns, level.mines);
    board.style.setProperty("--ms-columns", level.columns);
    board.replaceChildren();
    const fragment = document.createDocumentFragment();
    buttons = game.cells.map((_, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.index = index;
      button.tabIndex = index === 0 ? 0 : -1;
      fragment.appendChild(button);
      return button;
    });
    board.appendChild(fragment);
    board.parentElement.scrollLeft = 0;
    updateTime();
    showBest();
    render();
  }

  board.addEventListener("click", event => {
    const button = event.target.closest(".ms-cell");
    if (button) act(Number(button.dataset.index), flagMode || event.shiftKey);
  });
  board.addEventListener("contextmenu", event => {
    const button = event.target.closest(".ms-cell");
    if (!button) return;
    event.preventDefault();
    act(Number(button.dataset.index), true);
  });
  board.addEventListener("focusin", event => {
    const button = event.target.closest(".ms-cell");
    if (!button) return;
    buttons[focusIndex].tabIndex = -1;
    focusIndex = Number(button.dataset.index);
    button.tabIndex = 0;
  });
  board.addEventListener("keydown", event => {
    const button = event.target.closest(".ms-cell");
    if (!button) return;
    const index = Number(button.dataset.index);
    let row = Math.floor(index / game.columns);
    let column = index % game.columns;
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      act(index, true);
      return;
    }
    switch (event.key) {
      case "ArrowLeft": column--; break;
      case "ArrowRight": column++; break;
      case "ArrowUp": row--; break;
      case "ArrowDown": row++; break;
      case "Home": column = 0; break;
      case "End": column = game.columns - 1; break;
      default: return;
    }
    event.preventDefault();
    row = Math.max(0, Math.min(game.rows - 1, row));
    column = Math.max(0, Math.min(game.columns - 1, column));
    buttons[row * game.columns + column].focus();
  });
  flagButton.addEventListener("click", () => {
    flagMode = !flagMode;
    flagButton.setAttribute("aria-pressed", String(flagMode));
    render();
  });
  document.getElementById("ms-new").addEventListener("click", newGame);
  difficulty.addEventListener("change", newGame);

  newGame();
  container.hidden = false;
}());
