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

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const convertToChessNotation = (row, col) => {
  return FILES[col] + RANKS[row];
};

const convertFromChessNotation = (notation) => {
  const file = notation[0].toLowerCase();
  const rank = notation[1];
  return {
    row: RANKS.indexOf(rank),
    col: FILES.indexOf(file)
  };
};

// Add these helper functions after the imports
const isValidPawnPosition = (row, type) => {
  // Pawns can't be on the first or last rank
  return !(row === 0 || row === 7);
};

const isPieceAttackingKing = (piece, board) => {
  // Find kings
  const whiteKing = board.find(p => p.type === 'K');
  const blackKing = board.find(p => p.type === 'k');
  const targetKing = piece.type === piece.type.toLowerCase() ? whiteKing : blackKing;
  
  if (!targetKing) return false;

  switch (piece.type.toUpperCase()) {
    case 'R':
      return piece.row === targetKing.row || piece.col === targetKing.col;
    
    case 'B':
      return Math.abs(piece.row - targetKing.row) === Math.abs(piece.col - targetKing.col);
    
    case 'Q':
      return piece.row === targetKing.row || 
             piece.col === targetKing.col ||
             Math.abs(piece.row - targetKing.row) === Math.abs(piece.col - targetKing.col);
    
    case 'N':
      const rowDiff = Math.abs(piece.row - targetKing.row);
      const colDiff = Math.abs(piece.col - targetKing.col);
      return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    
    case 'P':
      const direction = piece.type === 'P' ? 1 : -1;
      return Math.abs(piece.col - targetKing.col) === 1 && 
             (piece.row + direction === targetKing.row);
    
    default:
      return false;
  }
};

// Update the randomBoard function
function randomBoard() {
  const pieceTypes = ["K", "Q", "R", "B", "N", "P"];
  const board = [];
  const usedPositions = new Set();

  // Helper to get a random valid position
  const getRandomPosition = () => {
    let row = Math.floor(Math.random() * 8);
    let col = Math.floor(Math.random() * 8);
    return { row, col };
  };

  // Helper to get a valid position for a piece
  const getValidPosition = (type, isBlack) => {
    let position;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      position = getRandomPosition();
      attempts++;

      // Check if position is already used
      if (usedPositions.has(`${position.row},${position.col}`)) continue;

      // Check pawn position
      if (type === 'P' && !isValidPawnPosition(position.row, type)) continue;

      // Create temporary piece to check if it would cause check
      const tempPiece = {
        type: isBlack ? type.toLowerCase() : type,
        row: position.row,
        col: position.col
      };

      // Check if this piece would cause check
      if (isPieceAttackingKing(tempPiece, board)) continue;

      return position;

    } while (attempts < maxAttempts);

    return null; // Return null if no valid position found
  };

  // Place kings first (required pieces)
  ['K', 'k'].forEach(kingType => {
    const pos = getValidPosition(kingType.toUpperCase(), kingType === 'k');
    if (pos) {
      usedPositions.add(`${pos.row},${pos.col}`);
      board.push({ type: kingType, row: pos.row, col: pos.col });
    }
  });

  // Place remaining pieces
  for (let i = 0; i < 6; i++) {
    const type = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    if (type === 'K') continue; // Skip kings as they're already placed

    const isBlack = Math.random() < 0.5;
    const pos = getValidPosition(type, isBlack);
    
    if (pos) {
      usedPositions.add(`${pos.row},${pos.col}`);
      board.push({ 
        type: isBlack ? type.toLowerCase() : type,
        row: pos.row,
        col: pos.col 
      });
    }
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
  const [inputSquare, setInputSquare] = useState("");
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
    
    const guess = { 
      piece: inputPiece.trim().toUpperCase(), 
      row: inputRow,
      col: inputCol
    };
    const newGuesses = [...guesses, guess];

    if (guess.piece === target.type && 
        guess.row === target.row && 
        guess.col === target.col) {
      setFeedback("Correct piece + square! You got it!");
    } else if (guess.piece === target.type) {
      setFeedback("Correct piece, wrong square.");
    } else {
      setFeedback("Wrong piece or wrong square.");
    }
    
    setGuesses(newGuesses);
    setInputPiece("");
    setInputSquare("");
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
      userSelect: "none",
      position: "relative"
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
        marginBottom: "2rem",
        alignItems: "center"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          marginRight: "5px"
        }}>
          {RANKS.map(rank => (
            <div key={rank} style={{
              height: "50px",
              width: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px"
            }}>
              {rank}
            </div>
          ))}
        </div>

        <div>
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

          <div style={{
            display: "flex",
            marginTop: "5px",
            marginLeft: "25px"
          }}>
            {FILES.map(file => (
              <div key={file} style={{
                width: "50px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px"
              }}>
                {file.toUpperCase()}
              </div>
            ))}
          </div>
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
          type="text"
          placeholder="Square (e.g. e4)"
          value={inputSquare}
          onChange={(e) => {
            const value = e.target.value.toLowerCase();
            setInputSquare(value);
            if (value.length === 2) {
              const { row, col } = convertFromChessNotation(value);
              setInputRow(row);
              setInputCol(col);
            }
          }}
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
              Guess {index + 1}: {PIECE_SYMBOLS[guess.piece]} to {convertToChessNotation(guess.row, guess.col)}
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
