// index.js
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

const PIECE_SYMBOLS = {
  'WK': '♔', 'BK': '♚',
  'WQ': '♕', 'BQ': '♛',
  'WR': '♖', 'BR': '♜',
  'WB': '♗', 'BB': '♝',
  'WN': '♘', 'BN': '♞',
  'WP': '♙', 'BP': '♟'
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
const isValidPawnPosition = (row, piece) => {
  console.log("Validating pawn position:", { row, piece });
  
  // Pawns can't be on first (row 0) or last (row 7) rank
  const isValid = row !== 0 && row !== 7;
  console.log("Pawn position valid?", isValid);
  
  return isValid;
};

const isPieceAttackingKing = (piece, board) => {
  // Find kings
  const whiteKing = board.find(p => p.color === 'W' && p.type === 'K');
  const blackKing = board.find(p => p.color === 'B' && p.type === 'K');
  const targetKing = piece.color === 'B' ? whiteKing : blackKing;
  
  if (!targetKing) return false;

  // Helper to check if path is clear
  const isPathClear = (startRow, startCol, endRow, endCol) => {
    const deltaRow = Math.sign(endRow - startRow);
    const deltaCol = Math.sign(endCol - startCol);
    let row = startRow + deltaRow;
    let col = startCol + deltaCol;

    while (row !== endRow || col !== endCol) {
      if (board.some(p => p.row === row && p.col === col)) {
        return false;
      }
      row += deltaRow;
      col += deltaCol;
    }
    return true;
  };

  switch (piece.type) {
    case 'R':
      return (piece.row === targetKing.row || piece.col === targetKing.col) &&
             isPathClear(piece.row, piece.col, targetKing.row, targetKing.col);
    
    case 'B':
      return Math.abs(piece.row - targetKing.row) === Math.abs(piece.col - targetKing.col) &&
             isPathClear(piece.row, piece.col, targetKing.row, targetKing.col);
    
    case 'Q':
      return (piece.row === targetKing.row || 
              piece.col === targetKing.col ||
              Math.abs(piece.row - targetKing.row) === Math.abs(piece.col - targetKing.col)) &&
             isPathClear(piece.row, piece.col, targetKing.row, targetKing.col);
    
    case 'N':
      const rowDiff = Math.abs(piece.row - targetKing.row);
      const colDiff = Math.abs(piece.col - targetKing.col);
      return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
    
    case 'P':
      const direction = piece.color === 'W' ? -1 : 1;
      return Math.abs(piece.col - targetKing.col) === 1 && 
             (piece.row + direction === targetKing.row);
    
    case 'K':
      const kRowDiff = Math.abs(piece.row - targetKing.row);
      const kColDiff = Math.abs(piece.col - targetKing.col);
      return kRowDiff <= 1 && kColDiff <= 1;
  }
  return false;
};

// Add this helper function after other helpers
const areKingsAdjacent = (board) => {
  const whiteKing = board.find(p => p.type === 'K');
  const blackKing = board.find(p => p.type === 'k');
  
  if (!whiteKing || !blackKing) return false;
  
  const rowDiff = Math.abs(whiteKing.row - blackKing.row);
  const colDiff = Math.abs(whiteKing.col - blackKing.col);
  
  return rowDiff <= 1 && colDiff <= 1;
};

// Add these helper functions for move validation
const isSquareOccupied = (row, col, board) => {
  return board.some(p => p.row === row && p.col === col);
};

const isPieceBetween = (start, end, board) => {
  const deltaRow = Math.sign(end.row - start.row);
  const deltaCol = Math.sign(end.col - start.col);
  let row = start.row + deltaRow;
  let col = start.col + deltaCol;

  while (row !== end.row || col !== end.col) {
    if (isSquareOccupied(row, col, board)) return true;
    row += deltaRow;
    col += deltaCol;
  }
  return false;
};

const getValidMoves = (piece, board) => {
  const moves = [];
  const isWhite = piece.color === 'W';
  
  // Helper to check if move would result in check
  const wouldBeInCheck = (toRow, toCol) => {
    // Create temporary board state
    const tempBoard = board.filter(p => 
      !(p.row === piece.row && p.col === piece.col)
    ).concat([{ ...piece, row: toRow, col: toCol }]);
    
    const king = tempBoard.find(p => 
      p.type === (isWhite ? 'K' : 'k')
    );
    
    return tempBoard.some(p => 
      (p.type.toUpperCase() === p.type) !== isWhite && // opponent piece
      isPieceAttackingKing(p, tempBoard)
    );
  };

  // Helper to add move if valid
  const addMove = (row, col) => {
    if (row < 0 || row > 7 || col < 0 || col > 7) return false;
    
    const occupyingPiece = board.find(p => p.row === row && p.col === col);
    if (occupyingPiece) {
      const occupyingIsWhite = occupyingPiece.color === 'W';
      if (occupyingIsWhite === isWhite) return false; // Can't capture own piece
      moves.push({ row, col }); // Can capture opponent's piece
      return false; // But can't continue past it
    }
    
    moves.push({ row, col });
    return true; // Continue only if square is empty
  };

  switch (piece.type.toUpperCase()) {
    case 'K':
      // Check each potential king move
      for (let drow = -1; drow <= 1; drow++) {
        for (let dcol = -1; dcol <= 1; dcol++) {
          if (drow === 0 && dcol === 0) continue;
          
          const newRow = piece.row + drow;
          const newCol = piece.col + dcol;
          
          // Skip if out of bounds
          if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) continue;
          
          // Create temporary board state for this move
          const tempBoard = board.filter(p => 
            !(p.row === piece.row && p.col === piece.col)
          );
          
          // Check if any opponent piece can attack this square
          const wouldBeAttacked = tempBoard.some(p => {
            const isOpponent = (p.type === p.type.toUpperCase()) !== isWhite;
            if (!isOpponent) return false;
            
            // Temporarily place king in new position
            const kingMove = { ...piece, row: newRow, col: newCol };
            tempBoard.push(kingMove);
            
            const isAttacking = isPieceAttackingKing(p, tempBoard);
            tempBoard.pop(); // Remove temporary king move
            return isAttacking;
          });
          
          if (!wouldBeAttacked) {
            addMove(newRow, newCol);
          }
        }
      }
      break;

    case 'Q':
      console.log("Calculating queen moves from:", { row: piece.row, col: piece.col });
      
      // Horizontal right
      for (let col = piece.col + 1; col < 8; col++) {
        const valid = addMove(piece.row, col);
        console.log("Right move:", { 
          to: convertToChessNotation(piece.row, col), 
          valid 
        });
        if (!valid) break;  // Stop if we hit a piece
      }
      
      // Horizontal left
      for (let col = piece.col - 1; col >= 0; col--) {
        const valid = addMove(piece.row, col);
        console.log("Left move:", { 
          to: convertToChessNotation(piece.row, col), 
          valid 
        });
        if (!valid) break;  // Stop if we hit a piece
      }
      
      // Vertical down
      for (let row = piece.row + 1; row < 8; row++) {
        const valid = addMove(row, piece.col);
        console.log("Down move:", { 
          to: convertToChessNotation(row, piece.col), 
          valid 
        });
        if (!valid) break;  // Stop if we hit a piece
      }
      
      // Vertical up
      for (let row = piece.row - 1; row >= 0; row--) {
        const valid = addMove(row, piece.col);
        console.log("Up move:", { 
          to: convertToChessNotation(row, piece.col), 
          valid 
        });
        if (!valid) break;  // Stop if we hit a piece
      }
      
      // Diagonal up-right
      for (let i = 1; i < 8; i++) {
        if (piece.row - i < 0 || piece.col + i >= 8) break;
        const valid = addMove(piece.row - i, piece.col + i);
        console.log("Diagonal up-right:", {
          to: convertToChessNotation(piece.row - i, piece.col + i),
          valid
        });
        if (!valid) break;  // Stop if we hit a piece
      }
      
      // Diagonal up-left
      for (let i = 1; i < 8; i++) {
        if (piece.row - i < 0 || piece.col - i < 0) break;
        const valid = addMove(piece.row - i, piece.col - i);
        console.log("Diagonal up-left:", {
          to: convertToChessNotation(piece.row - i, piece.col - i),
          valid
        });
        if (!valid) break;  // Stop if we hit a piece
      }
      
      // Diagonal down-right
      for (let i = 1; i < 8; i++) {
        if (piece.row + i >= 8 || piece.col + i >= 8) break;
        const valid = addMove(piece.row + i, piece.col + i);
        console.log("Diagonal down-right:", {
          to: convertToChessNotation(piece.row + i, piece.col + i),
          valid
        });
        if (!valid) break;  // Stop if we hit a piece
      }
      
      // Diagonal down-left
      for (let i = 1; i < 8; i++) {
        if (piece.row + i >= 8 || piece.col - i < 0) break;
        const valid = addMove(piece.row + i, piece.col - i);
        console.log("Diagonal down-left:", {
          to: convertToChessNotation(piece.row + i, piece.col - i),
          valid
        });
        if (!valid) break;  // Stop if we hit a piece
      }
      break;

    case 'R':
      console.log("Calculating rook moves from:", convertToChessNotation(piece.row, piece.col));
      console.log("Current board state:", board.map(p => 
        `${p.color}${p.type} at ${convertToChessNotation(p.row, p.col)}`
      ));

      // Horizontal
      for (let col = piece.col + 1; col < 8; col++) {
        const valid = addMove(piece.row, col);
        console.log("Right move:", {
          to: convertToChessNotation(piece.row, col),
          valid,
          wouldBeInCheck: wouldBeInCheck(piece.row, col)
        });
        if (!valid) break;
      }
      for (let col = piece.col - 1; col >= 0; col--) {
        const valid = addMove(piece.row, col);
        console.log("Left move:", {
          to: convertToChessNotation(piece.row, col),
          valid,
          wouldBeInCheck: wouldBeInCheck(piece.row, col)
        });
        if (!valid) break;
      }
      // Vertical
      for (let row = piece.row + 1; row < 8; row++) {
        const valid = addMove(row, piece.col);
        console.log("Down move:", {
          to: convertToChessNotation(row, piece.col),
          valid,
          wouldBeInCheck: wouldBeInCheck(row, piece.col)
        });
        if (!valid) break;
      }
      for (let row = piece.row - 1; row >= 0; row--) {
        const valid = addMove(row, piece.col);
        console.log("Up move:", {
          to: convertToChessNotation(row, piece.col),
          valid,
          wouldBeInCheck: wouldBeInCheck(row, piece.col)
        });
        if (!valid) break;
      }
      break;

    case 'B':
      // Diagonals
      for (let i = 1; i < 8; i++) {
        if (!addMove(piece.row + i, piece.col + i)) break;
      }
      for (let i = 1; i < 8; i++) {
        if (!addMove(piece.row + i, piece.col - i)) break;
      }
      for (let i = 1; i < 8; i++) {
        if (!addMove(piece.row - i, piece.col + i)) break;
      }
      for (let i = 1; i < 8; i++) {
        if (!addMove(piece.row - i, piece.col - i)) break;
      }
      break;

    case 'N':
      const knightMoves = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      knightMoves.forEach(([drow, dcol]) => {
        addMove(piece.row + drow, piece.col + dcol);
      });
      break;

    case 'P':
      const direction = isWhite ? -1 : 1;
      console.log("Calculating pawn moves:", {
        piece: `${piece.color}${piece.type}`,
        from: convertToChessNotation(piece.row, piece.col),
        direction
      });

      // Forward move
      if (!isSquareOccupied(piece.row + direction, piece.col, board)) {
        const valid = addMove(piece.row + direction, piece.col);
        console.log("Forward move:", {
          to: convertToChessNotation(piece.row + direction, piece.col),
          valid
        });
      }

      // Diagonal captures
      [-1, 1].forEach(dcol => {
        const targetRow = piece.row + direction;
        const targetCol = piece.col + dcol;
        const targetPiece = board.find(p => p.row === targetRow && p.col === targetCol);
        
        console.log("Checking diagonal capture:", {
          from: convertToChessNotation(piece.row, piece.col),
          to: convertToChessNotation(targetRow, targetCol),
          targetPiece: targetPiece ? `${targetPiece.color}${targetPiece.type}` : 'none',
          isOpponent: targetPiece && targetPiece.color !== piece.color
        });

        if (targetPiece && targetPiece.color !== piece.color) {
          const valid = addMove(targetRow, targetCol);
          console.log("Diagonal capture:", {
            to: convertToChessNotation(targetRow, targetCol),
            valid
          });
        }
      });
      break;
  }

  return moves;
};

// Update the randomBoard function
function randomBoard() {
  const pieceTypes = ["K", "Q", "R", "B", "N", "P", "P", "P", "P"];
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

      // Check pawn position - make sure to check both P and p
      if (type.charAt(1) === 'P' && !isValidPawnPosition(position.row, type)) {
        console.log("Rejecting invalid pawn position:", position);
        continue;
      }

      // Create temporary piece
      const tempPiece = {
        type: type.charAt(1),
        color: type.charAt(0),
        row: position.row,
        col: position.col
      };

      // Create temporary board with this new piece
      const tempBoard = [...board];
      tempBoard.push(tempPiece);

      // Check if this piece is attacking a king of the opposite color
      if (isPieceAttackingKing(tempPiece, tempBoard)) {
        continue;  // Skip this position if the piece would be attacking a king
      }

      return position;

    } while (attempts < maxAttempts);

    return null;
  };

  // Place kings first (required pieces)
  ['WK', 'BK'].forEach(kingType => {
    const pos = getValidPosition(kingType);
    if (pos) {
      usedPositions.add(`${pos.row},${pos.col}`);
      board.push({ 
        type: kingType.charAt(1), // K, Q, R, etc
        color: kingType.charAt(0), // W or B
        row: pos.row, 
        col: pos.col 
      });
    }
  });

  // Place remaining pieces
  for (let i = 0; i < 12; i++) {
    // Add pawns 4 times to the array to increase their probability
    const pieceTypes = ["K", "Q", "R", "B", "N", "P", "P", "P", "P"];
    const type = pieceTypes[Math.floor(Math.random() * pieceTypes.length)];
    if (type === 'K') continue; // Skip kings as they're already placed

    const color = Math.random() < 0.5 ? 'W' : 'B';
    const pos = getValidPosition(color + type);
    
    if (pos) {
      usedPositions.add(`${pos.row},${pos.col}`);
      board.push({ 
        type: type,
        color: color,
        row: pos.row,
        col: pos.col 
      });
    }
  }

  return board;
}

// Simplify the analyzeMoveDirection function
const analyzeMoveDirection = (guess, target) => {
  const rowDiff = target.row - target.startRow;
  const colDiff = target.col - target.startCol;
  const guessRowDiff = guess.row - guess.startRow;
  const guessColDiff = guess.col - guess.startCol;

  // For knight moves, treat all moves as special
  if (target.type === 'N') {
    return "Knight moves are special - try another pattern";
  }

  // Calculate the angles to compare directions
  const targetAngle = Math.atan2(rowDiff, colDiff);
  const guessAngle = Math.atan2(guessRowDiff, guessColDiff);
  
  // Compare the angles (with some tolerance for floating point)
  const anglesDiffer = Math.abs(targetAngle - guessAngle) > 0.01;

  if (anglesDiffer) {
    return "Wrong direction";
  }

  return "Right direction, but move is incorrect";
};

// Add these responsive style constants
const mobileBreakpoint = '768px';

const containerStyle = {
  fontFamily: "sans-serif", 
  padding: "1rem",
  maxWidth: "800px",
  margin: "0 auto",
  textAlign: "center",
  '@media screen and (maxWidth: 768px)': {
    padding: "0.5rem"
  }
};

const boardContainerStyle = {
  display: "flex",
  justifyContent: "center",
  marginBottom: "2rem",
  alignItems: "center",
  '@media (max-width: 768px)': {
    transform: 'scale(0.8)',
    margin: '-2rem 0'
  }
};

const inputContainerStyle = {
  marginBottom: "1.5rem",
  display: "flex",
  gap: "12px",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap",
  '@media (max-width: 768px)': {
    gap: "8px"
  }
};

const inputStyle = {
  padding: "8px 12px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
  width: "160px",
  fontFamily: "monospace",
  textAlign: "center",
  outline: "none",
  transition: "border-color 0.2s ease",
  '@media (max-width: 768px)': {
    width: "120px",
    padding: "6px 8px",
    fontSize: "12px"
  }
};

const selectStyle = {
  ...inputStyle,
  width: "180px",
  fontFamily: "sans-serif",
  appearance: "none",
  backgroundImage: "url('data:image/svg+xml;utf8,<svg fill=\"black\" height=\"24\" viewBox=\"0 0 24 24\" width=\"24\" xmlns=\"http://www.w3.org/2000/svg\"><path d=\"M7 10l5 5 5-5z\"/></svg>')",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
  paddingRight: "32px",
  '@media (max-width: 768px)': {
    width: "140px"
  }
};

const buttonStyle = {
  padding: "8px 16px",
  backgroundColor: "#2c3e50",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "14px",
  transition: "background-color 0.2s ease",
  '@media (max-width: 768px)': {
    padding: "6px 12px",
    fontSize: "12px"
  }
};

// Update the square size to be responsive
const squareSize = window.innerWidth <= 768 ? 40 : 50;

const squareStyle = {
  width: `${squareSize}px`,
  height: `${squareSize}px`,
  // ... rest of square style
};

function App() {
  const [board, setBoard] = useState([]);
  const [target, setTarget] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [inputPiece, setInputPiece] = useState("");
  const [inputRow, setInputRow] = useState("");
  const [inputCol, setInputCol] = useState("");
  const [inputSquare, setInputSquare] = useState("");
  const [feedback, setFeedback] = useState("");
  const [inputStartSquare, setInputStartSquare] = useState("");
  const [startRow, setStartRow] = useState("");
  const [startCol, setStartCol] = useState("");
  const [piecePositions, setPiecePositions] = useState({});
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(true);
  const [draggedPiece, setDraggedPiece] = useState(null);
  const [dragStartSquare, setDragStartSquare] = useState(null);
  const [dragOverSquare, setDragOverSquare] = useState(null);
  const [dragImage, setDragImage] = useState(null);
  const [validMovesForDraggedPiece, setValidMovesForDraggedPiece] = useState([]);

  // Generate a new random board on mount
  useEffect(() => {
    let newBoard;
    let validTarget;
    
    // Keep trying until we get a valid board and target move
    do {
      newBoard = randomBoard();
      if (areKingsAdjacent(newBoard)) continue;

      // Record positions of all pieces
      const positions = {};
      newBoard.forEach(piece => {
        if (!positions[piece.type]) {
          positions[piece.type] = [];
        }
        positions[piece.type].push({
          row: piece.row,
          col: piece.col
        });
      });
      setPiecePositions(positions);

      // Pick a random piece and try to find a valid move for it
      const chosenIndex = Math.floor(Math.random() * newBoard.length);
      const chosenPiece = newBoard[chosenIndex];
      
      // Get all valid moves for the chosen piece
      const validMoves = getValidMoves(chosenPiece, newBoard);
      
      if (validMoves.length > 0) {
        // Pick a random valid move as the target
        const targetMove = validMoves[Math.floor(Math.random() * validMoves.length)];
        validTarget = { 
          type: chosenPiece.type,
          color: chosenPiece.color,
          startRow: chosenPiece.row,
          startCol: chosenPiece.col,
          row: targetMove.row, 
          col: targetMove.col 
        };
      }
    } while (!validTarget || areKingsAdjacent(newBoard));
    
    setBoard(newBoard);
    setTarget(validTarget);
  }, []);

  useEffect(() => {
    if (!timerActive || feedback.includes("Game Over") || feedback.includes("Correct piece")) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          console.log("=== TIMER TIMEOUT ===");
          console.log("1. Current guesses count:", guesses.length);
          
          setGuesses(prev => {
            const newGuesses = [...prev, { 
              piece: '?', 
              startRow: -1, 
              startCol: -1,
              row: -1, 
              col: -1,
              timeout: true 
            }];
            
            console.log("2. New guesses count after timeout:", newGuesses.length);
            
            if (newGuesses.length >= 6) {
              console.log("3. Triggering game over after timeout");
              setFeedback(`Game Over! The answer was: ${PIECE_SYMBOLS[target.color + target.type]} from ` +
                `${convertToChessNotation(target.startRow, target.startCol)} to ` +
                `${convertToChessNotation(target.row, target.col)}`);
              setTimerActive(false);
            } else {
              setFeedback("Time's up! Lost a guess!");
            }
            
            return newGuesses;
          });
          
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, feedback]);

  const handleGuess = () => {
    console.log("=== HANDLE GUESS ===");
    console.log("1. Current guesses count:", guesses.length);

    // Check for game over first
    if (guesses.length >= 6) {
      console.log("2. Game over - max guesses reached");
      setFeedback(`Game Over! The answer was: ${PIECE_SYMBOLS[target.color + target.type]} from ` +
        `${convertToChessNotation(target.startRow, target.startCol)} to ` +
        `${convertToChessNotation(target.row, target.col)}`);
      setTimerActive(false);
      return;
    }

    if (!inputPiece || !inputStartSquare || !inputSquare) return;
    
    // Create guess using the selected piece's info
    const selectedPiece = board.find(p => p.row === startRow && p.col === startCol);
    const guess = { 
      type: selectedPiece?.type || '',
      color: selectedPiece?.color || '',
      startRow,
      startCol, 
      row: inputRow,
      col: inputCol
    };

    const newGuesses = [...guesses, guess];
    setGuesses(newGuesses);

    if (guess.type === target.type && 
        guess.color === target.color &&
        guess.startRow === target.startRow && 
        guess.startCol === target.startCol &&
        guess.row === target.row && 
        guess.col === target.col) {
      setFeedback("Correct piece + squares! You got it!");
    } else {
      const wrongPieceType = guess.type !== target.type;
      const wrongColor = guess.color !== target.color;
      const wrongStartSquare = guess.startRow !== target.startRow || guess.startCol !== target.startCol;
      const wrongEndSquare = guess.row !== target.row || guess.col !== target.col;

      let feedback = [];
      
      if (wrongPieceType) {
        feedback.push("Wrong piece type");
      } else if (wrongColor) {
        feedback.push(`Wrong color - try ${target.color === 'W' ? '⚪' : '⚫'} instead`);
      } else if (wrongStartSquare) {
        feedback.push("Right piece but wrong starting square");
      }
      
      if (wrongEndSquare) {
        if (!wrongPieceType && !wrongColor && !wrongStartSquare) {
          feedback.push(analyzeMoveDirection(guess, target));
        } else {
          feedback.push("Wrong target square");
        }
      }

      setFeedback(feedback.join(". "));
    }
    
    setInputPiece("");
    setInputStartSquare("");
    setInputSquare("");
    setStartRow("");
    setStartCol("");
    setInputRow("");
    setInputCol("");
    setTimeLeft(15); // Changed from 30 to 15

    // After setting new guesses, check if this was the last move
    const newGuessCount = guesses.length + 1;
    console.log("3. New guess count after move:", newGuessCount);
    
    if (newGuessCount >= 6 && !feedback.includes("Correct")) {
      console.log("4. Triggering game over after final move");
      setFeedback(`Game Over! The answer was: ${PIECE_SYMBOLS[target.color + target.type]} from ` +
        `${convertToChessNotation(target.startRow, target.startCol)} to ` +
        `${convertToChessNotation(target.row, target.col)}`);
      setTimerActive(false);
    }
  };

  // Update the handleGiveUp function
  const handleGiveUp = () => {
    setTimerActive(false);
    setFeedback(
      `Game Over! The answer was: ${PIECE_SYMBOLS[target.color + target.type]} from ` +
      `${convertToChessNotation(target.startRow, target.startCol)} to ` +
      `${convertToChessNotation(target.row, target.col)}`
    );
    setGuesses([...guesses, target]);
  };

  const handleDragStart = (piece, row, col) => {
    // Create a fresh copy of the piece to avoid reference issues
    setDraggedPiece({...piece});
    setDragStartSquare({ row, col });
  };

  const handleDrop = (toRow, toCol, piece, startSquare, validMoves) => {
    console.log("=== HANDLE DROP ===");
    console.log("1. Move attempt:", {
      piece: `${piece.color}${piece.type}`,
      from: convertToChessNotation(startSquare.row, startSquare.col),
      to: convertToChessNotation(toRow, toCol),
      isLastMove: guesses.length === 5
    });

    if (guesses.length >= 6) {
      console.log("2. Blocked - max guesses reached");
      setFeedback(`Game Over! The answer was: ${PIECE_SYMBOLS[target.color + target.type]} from ` +
        `${convertToChessNotation(target.startRow, target.startCol)} to ` +
        `${convertToChessNotation(target.row, target.col)}`);
      setTimerActive(false);
      return;
    }

    // Create the guess object before using it
    const guess = {
      type: piece.type,
      color: piece.color,
      startRow: startSquare.row,
      startCol: startSquare.col,
      row: toRow,
      col: toCol
    };

    setGuesses(prevGuesses => {
      const newGuesses = [...prevGuesses, guess];
      console.log("3. Processing move:", {
        guessCount: newGuesses.length,
        target: `${target.color}${target.type} from ${convertToChessNotation(target.startRow, target.startCol)} to ${convertToChessNotation(target.row, target.col)}`,
        guess: `${piece.color}${piece.type} from ${convertToChessNotation(startSquare.row, startSquare.col)} to ${convertToChessNotation(toRow, toCol)}`
      });

      if (newGuesses.length >= 6) {
        console.log("4. Game over - showing solution");
        setFeedback(`Game Over! The answer was: ${PIECE_SYMBOLS[target.color + target.type]} from ` +
          `${convertToChessNotation(target.startRow, target.startCol)} to ` +
          `${convertToChessNotation(target.row, target.col)}`);
        setTimerActive(false);
      }

      return newGuesses;
    });

    // Reset timer
    setTimeLeft(15);
  };

  const renderSquare = (row, col) => {
    const isGameOver = guesses.length >= 6;
    if (isGameOver && !feedback.includes("Game Over")) {
      console.log("Setting game over feedback in renderSquare");
      setFeedback(`Game Over! The answer was: ${PIECE_SYMBOLS[target.color + target.type]} from ` +
        `${convertToChessNotation(target.startRow, target.startCol)} to ` +
        `${convertToChessNotation(target.row, target.col)}`);
      setTimerActive(false);
    }

    const isLight = (row + col) % 2 === 0;
    const piece = board.find(p => p.row === row && p.col === col);
    const isDragOver = dragOverSquare && dragOverSquare.row === row && dragOverSquare.col === col;
    const isValidMove = !isGameOver && validMovesForDraggedPiece.some(move => 
      move.row === row && move.col === col
    );
    
    const squareStyle = {
      width: "50px",
      height: "50px",
      backgroundColor: isDragOver ? 
        (isValidMove ? "#aaffaa" : "#ffaaaa") : // Green for valid, red for invalid
        (isLight ? "#f0d9b5" : "#b58863"),
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "32px",
      cursor: isGameOver ? "default" : (piece ? "grab" : "default"),
      userSelect: "none",
      position: "relative",
      transition: "background-color 0.2s"
    };

    const pieceStyle = {
      color: piece && piece.color === 'W' ? "#fff" : "#000",
      textShadow: piece && piece.color === 'W' ? 
        "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" : 
        "none",
      cursor: "grab",
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: draggedPiece && draggedPiece === piece ? 0.3 : 1 // Make original piece semi-transparent while dragging
    };

    return (
      <div 
        key={`${row}-${col}`} 
        style={squareStyle}
        onMouseDown={(e) => {
          if (!piece || feedback.includes("Game Over") || feedback.includes("Correct piece") || guesses.length >= 6) {
            console.log("Blocked interaction:", { 
              reason: feedback.includes("Game Over") ? "game over" : 
                      feedback.includes("Correct piece") ? "already solved" : 
                      guesses.length >= 6 ? "max guesses" : "no piece",
              guessCount: guesses.length
            });
            return;
          }

          e.preventDefault();
          
          const draggedPiece = board.find(p => p.row === row && p.col === col);
          const startSquare = { row, col };
          const validMoves = getValidMoves(draggedPiece, board);

          console.log("=== DRAG START ===");
          console.log("1. Found piece:", draggedPiece);
          console.log("2. Calculated valid moves:", validMoves);
          console.log("3. Creating closure values:", {
            draggedPiece,
            startSquare,
            validMovesCount: validMoves.length,
            validMovesList: validMoves,
            currentGuessCount: guesses.length
          });

          // Set state but also keep values in closure
          setValidMovesForDraggedPiece(validMoves);
          setDraggedPiece(draggedPiece);
          setDragStartSquare(startSquare);
          console.log("2. Setting state with:", { draggedPiece, startSquare });

          // Create floating piece element
          const dragEl = document.createElement('div');
          dragEl.style.position = 'fixed';
          dragEl.style.pointerEvents = 'none';
          dragEl.style.zIndex = 1000;
          dragEl.style.fontSize = '64px';
          dragEl.style.color = piece.color === 'W' ? "#fff" : "#000";
          dragEl.style.textShadow = piece.color === 'W' ? 
            "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" : 
            "none";
          dragEl.innerHTML = PIECE_SYMBOLS[piece.color + piece.type];
          document.body.appendChild(dragEl);
          setDragImage(dragEl);

          const updateDragImage = (e) => {
            if (dragEl) {
              dragEl.style.left = `${e.clientX - 32}px`;
              dragEl.style.top = `${e.clientY - 32}px`;
            }
          };
          updateDragImage(e);

          const handleMouseMove = (e) => {
            e.preventDefault();
            updateDragImage(e);
            
            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const square = elements.find(el => el.getAttribute('data-square'));
            if (square) {
              const [row, col] = square.getAttribute('data-square').split(',').map(Number);
              setDragOverSquare({ row, col });
            }
          };

          const handleMouseUp = (e) => {
            console.log("=== DROP START ===");
            console.log("4. Closure values available:", {
              draggedPiece,
              startSquare,
              validMoves,
              validMovesCount: validMoves.length
            });

            const elements = document.elementsFromPoint(e.clientX, e.clientY);
            const square = elements.find(el => el.getAttribute('data-square'));
            
            if (square) {
              const [dropRow, dropCol] = square.getAttribute('data-square').split(',').map(Number);
              console.log("5. Drop target:", { dropRow, dropCol });
              
              const isValidMove = validMoves.some(move => {
                const matches = move.row === dropRow && move.col === dropCol;
                console.log("Validating move:", {
                  from: convertToChessNotation(startSquare.row, startSquare.col),
                  to: convertToChessNotation(dropRow, dropCol),
                  possibleMove: convertToChessNotation(move.row, move.col),
                  matches,
                  allValidMoves: validMoves.map(m => convertToChessNotation(m.row, m.col))
                });
                return matches;
              });
              console.log("6. Move validation:", {
                isValid: isValidMove,
                dropTarget: { dropRow, dropCol },
                validMoves
              });

              if (isValidMove) {
                console.log("7. Pre-handleDrop:", {
                  draggedPiece,
                  startSquare,
                  validMoves,
                  dropTarget: { dropRow, dropCol }
                });
                handleDrop(dropRow, dropCol, draggedPiece, startSquare, validMoves);
              }
            }

            console.log("8. State before cleanup:", {
              draggedPiece,
              startSquare,
              validMovesForDraggedPiece
            });
            // Move cleanup to after handleDrop
            console.log("6. Cleaning up state:", {
              hadDraggedPiece: !!draggedPiece,
              hadStartSquare: !!dragStartSquare
            });

            // Cleanup
            if (dragEl) dragEl.remove();
            setDragImage(null);
            setDraggedPiece(null);
            setDragStartSquare(null);
            setDragOverSquare(null);
            setValidMovesForDraggedPiece([]);
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
          };

          document.addEventListener('mousemove', handleMouseMove);
          document.addEventListener('mouseup', handleMouseUp);
        }}
        data-square={`${row},${col}`}
      >
        {piece && (
          <div style={pieceStyle}>
            {PIECE_SYMBOLS[piece.color + piece.type]}
          </div>
        )}
      </div>
    );
  };

  // Add this function to generate piece options from current board
  const getPieceOptions = () => {
    const pieces = new Set(board.map(p => p.color + p.type));
    return Array.from(pieces).map(piece => ({
      value: piece,
      label: `${piece.startsWith('W') ? '⚪' : '⚫'} ${PIECE_SYMBOLS[piece]} ${
        piece.endsWith('K') ? 'King' :
        piece.endsWith('Q') ? 'Queen' :
        piece.endsWith('R') ? 'Rook' :
        piece.endsWith('B') ? 'Bishop' :
        piece.endsWith('N') ? 'Knight' : 'Pawn'
      }`
    })).sort((a, b) => a.label.localeCompare(b.label));
  };

  const handlePieceSelect = (e) => {
    setDraggedPiece(null);
    setDragStartSquare(null);
    setDragOverSquare(null);
    const selectedPiece = e.target.value;
    setInputPiece(selectedPiece);
    
    // If there's only one piece of this type, automatically set its position
    if (piecePositions[selectedPiece]?.length === 1) {
      const pos = piecePositions[selectedPiece][0];
      const notation = convertToChessNotation(pos.row, pos.col);
      setInputStartSquare(notation);
      setStartRow(pos.row);
      setStartCol(pos.col);
    } else {
      // Clear start square if there are multiple pieces of this type
      setInputStartSquare("");
      setStartRow("");
      setStartCol("");
    }
  };

  // Clean up drag image on unmount
  useEffect(() => {
    return () => {
      if (dragImage) {
        dragImage.remove();
      }
    };
  }, [dragImage]);

  return (
    <div style={containerStyle}>
      <h1 style={{ 
        color: "#2c3e50",
        fontSize: window.innerWidth <= 768 ? "24px" : "32px",
        margin: window.innerWidth <= 768 ? "0.5rem 0" : "1rem 0"
      }}>
        Bulletle Chess
      </h1>
      
      <div style={{
        fontSize: window.innerWidth <= 768 ? "20px" : "24px",
        fontWeight: "bold",
        color: timeLeft <= 5 ? "#dc3545" : "#2c3e50",
        marginBottom: "1rem",
        transition: "color 0.3s ease"
      }}>
        Time to move: {Math.floor(timeLeft)}s
      </div>

      <p>We scattered chess pieces randomly on an 8x8 board.</p>
      <p>
        One hidden goal: move the <strong>right piece</strong> to the <strong>right square</strong>.
        You have 6 guesses!
      </p>

      <div style={boardContainerStyle}>
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

      <div style={inputContainerStyle}>
        <select
          value={inputPiece}
          onChange={handlePieceSelect}
          style={selectStyle}
        >
          <option value="">Select a piece</option>
          {getPieceOptions().map(option => {
            const count = piecePositions[option.value]?.length || 0;
            return (
              <option key={option.value} value={option.value}>
                {option.label} {count > 1 ? `(${count})` : ''}
              </option>
            );
          })}
        </select>
        <input
          type="text"
          placeholder={inputPiece && piecePositions[inputPiece]?.length > 1 ? 
            `From: ${piecePositions[inputPiece]
              .map(p => convertToChessNotation(p.row, p.col))
              .join(' or ')}` : 
            "From square (e.g. e2)"
          }
          value={inputStartSquare}
          onChange={(e) => {
            const value = e.target.value.toLowerCase();
            setInputStartSquare(value);
            if (value.length === 2) {
              const { row, col } = convertFromChessNotation(value);
              // Verify this is a valid starting position for the selected piece
              if (piecePositions[inputPiece]?.some(p => p.row === row && p.col === col)) {
                setStartRow(row);
                setStartCol(col);
              } else {
                setFeedback("Selected piece is not at that square!");
              }
            }
          }}
          style={inputStyle}
        />
        <input
          type="text"
          placeholder="To square (e.g. e4)"
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
          disabled={guesses.length >= 6 || feedback.includes("Game Over")}
          style={buttonStyle}
        >
          Guess
        </button>
        <button 
          onClick={handleGiveUp}
          disabled={feedback.includes("Game Over") || feedback.includes("Correct piece")}
          style={buttonStyle}
        >
          Give Up
        </button>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <p style={{ 
          color: feedback.includes("Correct piece + square") ? "green" : "black",
          fontWeight: "bold",
          fontSize: "16px"
        }}>{feedback}</p>
        <p>Guesses used: {guesses.length} / 6</p>
        
        <div style={{ marginTop: "1rem" }}>
          {guesses.map((guess, index) => (
            <div key={index} style={{ marginBottom: "5px" }}>
              Guess {index + 1}: {guess.timeout ? (
                <span style={{ color: "#dc3545" }}>Time's up!</span>
              ) : (
                <>
                  <span style={{
                    color: guess.color === 'W' ? "#fff" : "#000",
                    textShadow: guess.color === 'W' ? 
                      "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" : 
                      "none",
                    marginRight: "4px"
                  }}>
                    {PIECE_SYMBOLS[guess.color + guess.type]}
                  </span>
                  from {convertToChessNotation(guess.startRow, guess.startCol)} to {convertToChessNotation(guess.row, guess.col)}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
