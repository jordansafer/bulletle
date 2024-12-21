// index.js
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

const PIECE_SYMBOLS = {
  'K': '♔', 'k': '♚',
  'Q': '♕', 'q': '♛',
  'R': '♖', 'r': '♜',
  'B': '♗', 'b': '♝',
  'N': '♘', 'n': '♞',
  'P': '♙', 'p': '♟'
};

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

  const renderSquare = (row, col) => {
    const isLight = (row + col) % 2 === 0;
    const piece = board.find(p => p.row === row && p.col === col);
    const squareStyle = {
      width: "50px",
      height: "50px",
      backgroundColor: isLight ? "#f0d9b5" : "#b58863",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "32px",
      color: "#2c3e50",
      cursor: "default",
      userSelect: "none"
    };

    return (
      <div key={`${row}-${col}`} style={squareStyle}>
        {piece && PIECE_SYMBOLS[piece.type]}
      </div>
    );
  };

  return (
    <div style={{ 
      fontFamily: "sans-serif", 
      padding: "2rem",
      maxWidth: "800px",
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h1 style={{ color: "#2c3e50" }}>Bullet-Wordle Chess</h1>
      <p>We scattered chess pieces randomly on an 8x8 board.</p>
      <p>
        One hidden goal: move the <strong>right piece</strong> to the <strong>right square</strong>.
        You have 6 guesses!
      </p>

      <div style={{ 
        display: "flex",
        justifyContent: "center",
        marginBottom: "2rem"
      }}>
        <div style={{
          display: "inline-block",
          border: "2px solid #2c3e50",
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          {[...Array(8)].map((_, row) => (
            <div key={row} style={{ display: "flex" }}>
              {[...Array(8)].map((_, col) => renderSquare(row, col))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ 
        marginBottom: "1.5rem",
        display: "flex",
        gap: "10px",
        justifyContent: "center"
      }}>
        <input
          type="text"
          placeholder="Piece (e.g. K, Q, R, B, N, P)"
          value={inputPiece}
          onChange={(e) => setInputPiece(e.target.value)}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Row (0-7)"
          value={inputRow}
          onChange={(e) => setInputRow(e.target.value)}
          style={inputStyle}
        />
        <input
          type="number"
          placeholder="Col (0-7)"
          value={inputCol}
          onChange={(e) => setInputCol(e.target.value)}
          style={inputStyle}
        />
        <button 
          onClick={handleGuess} 
          disabled={guesses.length >= 6}
          style={{
            padding: "8px 16px",
            backgroundColor: guesses.length >= 6 ? "#ccc" : "#2c3e50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: guesses.length >= 6 ? "not-allowed" : "pointer"
          }}
        >
          Guess
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <p style={{ 
          color: feedback.includes("Correct piece + square") ? "green" : "black",
          fontWeight: "bold"
        }}>{feedback}</p>
        <p>Guesses used: {guesses.length} / 6</p>
        
        <div style={{ marginTop: "1rem" }}>
          {guesses.map((guess, index) => (
            <div key={index} style={{ marginBottom: "5px" }}>
              Guess {index + 1}: {PIECE_SYMBOLS[guess.piece]} to ({guess.row}, {guess.col})
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: "8px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
  width: "200px"
};

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
