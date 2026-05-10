import React, { useEffect, useMemo, useState } from 'react';

const GRID_SIZE = 9;
const STYLE_ID = 'sudoku-game-styles';

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Playfair+Display:wght@500;600&display=swap');

:root {
  --bg: #F8F7FF;
  --grid: #9381FF;
  --pad: #FFEEDD;
  --active: #FFD8BE;
  --text-soft: #B8B8FF;
  --text-main: #9381FF;
}

* { box-sizing: border-box; }

.sudoku-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: var(--bg);
  padding: 2rem 1rem;
  font-family: 'Inter', sans-serif;
  color: var(--text-main);
}
.sudoku-panel {
  width: min(92vw, 620px);
  display: grid;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 14px 30px rgba(184, 184, 255, 0.15);
}
.sudoku-header h1 { margin: 0; font-weight: 600; letter-spacing: 0.02em; }
.sudoku-header p { margin: 0.35rem 0 0; color: var(--text-soft); font-size: 0.95rem; }

.sudoku-board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  width: 100%;
  aspect-ratio: 1;
  border: 2px solid var(--grid);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 12px 28px rgba(184, 184, 255, 0.13);
}
.sudoku-cell {
  border: 1px solid var(--grid);
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-main);
  font-family: 'Playfair Display', serif;
  font-size: clamp(1rem, 2.5vw, 1.6rem);
  transition: background-color 0.2s ease, transform 0.2s ease, color 0.2s ease;
  cursor: pointer;
}
.sudoku-cell[data-col='2'], .sudoku-cell[data-col='5'] { border-right-width: 2px; }
.sudoku-cell[data-row='2'], .sudoku-cell[data-row='5'] { border-bottom-width: 2px; }
.sudoku-cell.is-fixed { color: var(--text-soft); font-weight: 600; }
.sudoku-cell.is-related { background: rgba(255, 216, 190, 0.35); }
.sudoku-cell.is-selected { background: var(--active); transform: scale(1.02); }
.sudoku-cell.is-invalid { color: #9381FF; text-decoration: underline; text-decoration-color: #FFD8BE; }

.number-pad {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.75rem;
}
.number-pad button {
  border: 1px solid var(--grid);
  border-radius: 14px;
  background: var(--pad);
  color: var(--text-main);
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  padding: 0.8rem 0;
  box-shadow: 0 10px 24px rgba(184, 184, 255, 0.13);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  cursor: pointer;
}
.number-pad button:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(184, 184, 255, 0.15); }
.number-pad .clear { grid-column: span 2; background: #FFD8BE; }

@media (max-width: 640px) {
  .sudoku-panel { padding: 1rem; gap: 1rem; border-radius: 14px; }
  .number-pad { grid-template-columns: repeat(4, 1fr); }
  .number-pad .clear { grid-column: span 4; }
}
`;

const createSolvedBoard = () => {
  const base = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return Array.from({ length: GRID_SIZE }, (_, row) =>
    Array.from({ length: GRID_SIZE }, (_, col) => base[(col + row * 3 + Math.floor(row / 3)) % GRID_SIZE])
  );
};

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const randomizeBoard = (board) => {
  let next = board.map((row) => [...row]);
  const bandOrder = shuffle([0, 1, 2]);
  next = bandOrder.flatMap((band) => shuffle([0, 1, 2]).map((r) => next[band * 3 + r]));

  const stackOrder = shuffle([0, 1, 2]);
  next = next.map((row) => stackOrder.flatMap((stack) => shuffle([0, 1, 2]).map((c) => row[stack * 3 + c])));

  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const mapping = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => [n, digits[i]]));
  return next.map((row) => row.map((n) => mapping[n]));
};

const carvePuzzle = (board, clues = 38) => {
  const puzzle = board.map((row) => [...row]);
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  const toRemove = 81 - clues;

  for (let i = 0; i < toRemove; i += 1) {
    const index = cells[i];
    puzzle[Math.floor(index / 9)][index % 9] = 0;
  }
  return puzzle;
};

const generateSudoku = () => {
  const solved = randomizeBoard(createSolvedBoard());
  return { puzzle: carvePuzzle(solved), solved };
};

export default function SudokuGame() {
  const initial = useMemo(() => generateSudoku(), []);
  const [board, setBoard] = useState(initial.puzzle);
  const [solution] = useState(initial.solved);
  const [selectedCell, setSelectedCell] = useState(null);

  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const tag = document.createElement('style');
    tag.id = STYLE_ID;
    tag.textContent = styles;
    document.head.appendChild(tag);
  }, []);

  const isFixed = (row, col) => initial.puzzle[row][col] !== 0;
  const related = (row, col) => {
    if (!selectedCell) return false;
    const sameRow = selectedCell.row === row;
    const sameCol = selectedCell.col === col;
    const sameBox = Math.floor(selectedCell.row / 3) === Math.floor(row / 3)
      && Math.floor(selectedCell.col / 3) === Math.floor(col / 3);
    return sameRow || sameCol || sameBox;
  };
  const isInvalid = (row, col) => board[row][col] !== 0 && board[row][col] !== solution[row][col];

  const setValue = (num) => {
    if (!selectedCell || isFixed(selectedCell.row, selectedCell.col)) return;
    setBoard((prev) => {
      const next = prev.map((r) => [...r]);
      next[selectedCell.row][selectedCell.col] = num;
      return next;
    });
  };

  return (
    <div className="sudoku-shell">
      <div className="sudoku-panel">
        <header className="sudoku-header">
          <h1>Sudoku</h1>
          <p>Refined focus. Minimal interaction. Elegant play.</p>
        </header>

        <div className="sudoku-board" role="grid" aria-label="Sudoku board">
          {board.map((row, rowIndex) => row.map((value, colIndex) => {
            const selected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
            return (
              <button
                key={`${rowIndex}-${colIndex}`}
                type="button"
                data-row={rowIndex}
                data-col={colIndex}
                className={[
                  'sudoku-cell',
                  isFixed(rowIndex, colIndex) ? 'is-fixed' : '',
                  selected ? 'is-selected' : '',
                  related(rowIndex, colIndex) ? 'is-related' : '',
                  isInvalid(rowIndex, colIndex) ? 'is-invalid' : '',
                ].join(' ')}
                onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
              >
                {value || ''}
              </button>
            );
          }))}
        </div>

        <div className="number-pad" aria-label="Number input keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} type="button" onClick={() => setValue(n)}>{n}</button>
          ))}
          <button type="button" className="clear" onClick={() => setValue(0)}>Clear</button>
        </div>
      </div>
    </div>
  );
}
