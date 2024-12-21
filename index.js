// index.js
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

// Quick helper to generate random board state
function randomBoard() {
  const pieceTypes = ["K", "Q", "R", "B", "N", "P"];
  const board = [];
  const usedPositions = new Set();

  // Randomly place ~8 pieces
  for (let i = 0; i < 8; i++) {
    const type = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    let row = Math.floor(Math.random() * 8);
    let col = Math.floor(Math.random() * 8);
    while (usedPositions.has(`${row},${col}`)) {
      row = Math.floor(Math.random() * 8);
      col = Math.floor(Math.random() * 8);
    }
    usedPositions.add(`${row},${col}`);
    board.push({ type, row, col });
  }
  return board;
}

function App() {
  const [board, setBoard] = useState([]);
  const [target, setTarget] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [inputPiece, setInputPiece] = useState("");
  const [inputRow, setInputRow] = useState("");
  const [inputCol, setInputCol] = useState("");
  const [feedback, setFeedback] = useState("");

  // Generate a new random board on mount
  useEffect(() => {
    const newBoard = randomBoard();
    setBoard(newBoard);
    // Randomly pick a piece from the board and a different target square
    const chosenIndex = Math.floor(Math.random() * newBoard.length);
    const chosenPiece = newBoard[chosenIndex];
    let newRow, newCol;
    do {
      newRow = Math.floor(Math.random() * 8);
      newCol = Math.floor(Math.random() * 8);
    } while (newRow === chosenPiece.row && newCol === chosenPiece.col);
    setTarget({ type: chosenPiece.type, row: newRow, col: newCol });
  }, []);

  const handleGuess = () => {
    if (guesses.length >= 6) return;
    const guess = { piece: inputPiece.trim().toUpperCase(), row: +inputRow, col: +inputCol };
    const newGuesses = [...guesses, guess];

    if (guess.piece === target.type && guess.row === target.row && guess.col === target.col) {
      setFeedback("Correct piece + square! You got it!");
    } else if (guess.piece === target.type) {
      setFeedback("Correct piece, wrong square.");
    } else {
      setFeedback("Wrong piece or wrong square.");
    }
    setGuesses(newGuesses);
    setInputPiece("");
    setInputRow("");
    setInputCol("");
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1rem" }}>
      <h1>Bullet-Wordle Chess</h1>
      <p>We scattered chess pieces randomly on an 8x8 board.</p>
      <p>
        One hidden goal: move the <strong>right piece</strong> to the <strong>right square</strong>.
        You have 6 guesses!
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Piece (e.g. K, Q, R, B, N, P)"
          value={inputPiece}
          onChange={(e) => setInputPiece(e.target.value)}
        />
        <input
          type="number"
          placeholder="Row (0-7)"
          value={inputRow}
          onChange={(e) => setInputRow(e.target.value)}
        />
        <input
          type="number"
          placeholder="Col (0-7)"
          value={inputCol}
          onChange={(e) => setInputCol(e.target.value)}
        />
        <button onClick={handleGuess} disabled={guesses.length >= 6}>
          Guess
        </button>
      </div>

      <div>
        <p>{feedback}</p>
        <p>Guesses used: {guesses.length} / 6</p>
      </div>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
