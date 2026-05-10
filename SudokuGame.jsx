import React, { useMemo, useState } from 'react';
import './SudokuGame.css';

const GRID_SIZE = 9;

const createSolvedBoard = () => {
  const base = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  return Array.from({ length: GRID_SIZE }, (_, row) => (
    Array.from({ length: GRID_SIZE }, (_, col) => base[(col + row * 3 + Math.floor(row / 3)) % GRID_SIZE])
  ));
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
  next = bandOrder.flatMap((band) => {
    const rows = shuffle([0, 1, 2]).map((r) => next[band * 3 + r]);
    return rows;
  });

  const stackOrder = shuffle([0, 1, 2]);
  next = next.map((row) => (
    stackOrder.flatMap((stack) => shuffle([0, 1, 2]).map((c) => row[stack * 3 + c]))
  ));

  const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const map = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((n, i) => [n, digits[i]]));
  return next.map((row) => row.map((n) => map[n]));
};

const carvePuzzle = (board, clues = 38) => {
  const puzzle = board.map((row) => [...row]);
  const cells = shuffle(Array.from({ length: 81 }, (_, i) => i));
  const toRemove = 81 - clues;

  for (let i = 0; i < toRemove; i += 1) {
    const index = cells[i];
    const row = Math.floor(index / 9);
    const col = index % 9;
    puzzle[row][col] = 0;
  }

  return puzzle;
};

const generateSudoku = () => {
  const solved = randomizeBoard(createSolvedBoard());
  const puzzle = carvePuzzle(solved);
  return { puzzle, solved };
};

const SudokuGame = () => {
  const initial = useMemo(() => generateSudoku(), []);
  const [board, setBoard] = useState(initial.puzzle);
  const [solution] = useState(initial.solved);
  const [selectedCell, setSelectedCell] = useState(null);

  const isFixed = (row, col) => initial.puzzle[row][col] !== 0;

  const relatedToSelection = (row, col) => {
    if (!selectedCell) return false;
    const sameRow = selectedCell.row === row;
    const sameCol = selectedCell.col === col;
    const sameBox = Math.floor(selectedCell.row / 3) === Math.floor(row / 3)
      && Math.floor(selectedCell.col / 3) === Math.floor(col / 3);
    return sameRow || sameCol || sameBox;
  };

  const isInvalid = (row, col) => {
    const val = board[row][col];
    return val !== 0 && val !== solution[row][col];
  };

  const handleNumberInput = (num) => {
    if (!selectedCell) return;
    const { row, col } = selectedCell;
    if (isFixed(row, col)) return;

    setBoard((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = num;
      return next;
    });
  };

  const clearSelected = () => handleNumberInput(0);

  return (
    <div className="sudoku-shell">
      <div className="sudoku-panel">
        <header className="sudoku-header">
          <h1>Sudoku</h1>
          <p>Refined focus. Minimal interaction. Elegant play.</p>
        </header>

        <div className="sudoku-board" role="grid" aria-label="Sudoku board">
          {board.map((row, rowIndex) => (
            row.map((value, colIndex) => {
              const fixed = isFixed(rowIndex, colIndex);
              const selected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
              const related = relatedToSelection(rowIndex, colIndex);
              const invalid = isInvalid(rowIndex, colIndex);

              return (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  type="button"
                  className={[
                    'sudoku-cell',
                    fixed ? 'is-fixed' : '',
                    selected ? 'is-selected' : '',
                    related ? 'is-related' : '',
                    invalid ? 'is-invalid' : '',
                  ].join(' ')}
                  onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                  aria-label={`Row ${rowIndex + 1}, Column ${colIndex + 1}, ${value || 'empty'}`}
                >
                  {value || ''}
                </button>
              );
            })
          ))}
        </div>

        <div className="number-pad" aria-label="Number input keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} type="button" onClick={() => handleNumberInput(num)}>
              {num}
            </button>
          ))}
          <button type="button" className="clear" onClick={clearSelected}>
            Clear
          </button>
        </div>
      </div>
    </div>
  );
};

export default SudokuGame;
