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

  switch (piece.type.toUpperCase()) {
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
      const direction = piece.type === 'P' ? 1 : -1;
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
  const isWhite = piece.type === piece.type.toUpperCase();
  
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
      const occupyingIsWhite = occupyingPiece.type === occupyingPiece.type.toUpperCase();
      if (occupyingIsWhite === isWhite) return false; // Can't capture own piece
      // Can capture opponent's piece but can't continue past it
      if (!wouldBeInCheck(row, col)) {
        moves.push({ row, col });
      }
      return false;
    }
    
    if (!wouldBeInCheck(row, col)) {
      moves.push({ row, col });
    }
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
      // Horizontal
      for (let col = 0; col < 8; col++) {
        if (col === piece.col) continue;
        if (!addMove(piece.row, col)) break;
      }
      // Vertical
      for (let row = 0; row < 8; row++) {
        if (row === piece.row) continue;
        if (!addMove(row, piece.col)) break;
      }
      // Diagonals
      for (let i = 1; i < 8; i++) {
        // Up-right
        if (!addMove(piece.row - i, piece.col + i)) break;
      }
      for (let i = 1; i < 8; i++) {
        // Up-left
        if (!addMove(piece.row - i, piece.col - i)) break;
      }
      for (let i = 1; i < 8; i++) {
        // Down-right
        if (!addMove(piece.row + i, piece.col + i)) break;
      }
      for (let i = 1; i < 8; i++) {
        // Down-left
        if (!addMove(piece.row + i, piece.col - i)) break;
      }
      break;

    case 'R':
      // Horizontal
      for (let col = piece.col + 1; col < 8; col++) {
        if (!addMove(piece.row, col)) break;
      }
      for (let col = piece.col - 1; col >= 0; col--) {
        if (!addMove(piece.row, col)) break;
      }
      // Vertical
      for (let row = piece.row + 1; row < 8; row++) {
        if (!addMove(row, piece.col)) break;
      }
      for (let row = piece.row - 1; row >= 0; row--) {
        if (!addMove(row, piece.col)) break;
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
      // Forward move
      if (!isSquareOccupied(piece.row + direction, piece.col, board)) {
        addMove(piece.row + direction, piece.col);
      }
      // Captures
      [-1, 1].forEach(dcol => {
        const targetRow = piece.row + direction;
        const targetCol = piece.col + dcol;
        const targetPiece = board.find(p => p.row === targetRow && p.col === targetCol);
        if (targetPiece && (targetPiece.type === targetPiece.type.toUpperCase()) !== isWhite) {
          addMove(targetRow, targetCol);
        }
      });
      break;
  }

  return moves;
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
  const [inputStartSquare, setInputStartSquare] = useState("");
  const [startRow, setStartRow] = useState("");
  const [startCol, setStartCol] = useState("");
  const [piecePositions, setPiecePositions] = useState({});
  const [timeLeft, setTimeLeft] = useState(15);
  const [timerActive, setTimerActive] = useState(true);

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
          // Time's up - remove a guess
          setGuesses(prev => [...prev, { 
            piece: '?', 
            startRow: -1, 
            startCol: -1,
            row: -1, 
            col: -1,
            timeout: true 
          }]);
          setFeedback("Time's up! Lost a guess!");
          return 15; // Changed from 30 to 15
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timerActive, feedback]);

  const handleGuess = () => {
    if (guesses.length >= 6) return;
    
    // Find the piece at the start square
    const startPiece = board.find(p => p.row === startRow && p.col === startCol);
    if (!startPiece || startPiece.type !== inputPiece) {
      setFeedback("No matching piece at start square!");
      return;
    }

    // Get valid moves for the selected piece
    const validMoves = getValidMoves(startPiece, board);
    const isValidMove = validMoves.some(move => 
      move.row === inputRow && move.col === inputCol
    );

    if (!isValidMove) {
      setFeedback("Invalid move for this piece!");
      return;
    }

    const guess = { 
      piece: inputPiece,
      startRow,
      startCol, 
      row: inputRow,
      col: inputCol
    };
    const newGuesses = [...guesses, guess];

    const correctPiece = guess.piece === target.type;
    const correctStartSquare = guess.startRow === target.startRow && guess.startCol === target.startCol;
    const correctEndSquare = guess.row === target.row && guess.col === target.col;

    if (correctPiece && correctStartSquare && correctEndSquare) {
      setFeedback("Correct piece + squares! You got it!");
    } else {
      // Check piece differences
      const targetIsWhite = target.type === target.type.toUpperCase();
      const guessIsWhite = guess.piece === guess.piece.toUpperCase();
      const targetPieceType = target.type.toUpperCase();
      const guessPieceType = guess.piece.toUpperCase();
      
      const wrongPieceType = targetPieceType !== guessPieceType;
      const wrongColor = targetIsWhite !== guessIsWhite;
      const wrongStartSquare = !correctStartSquare;
      const wrongEndSquare = !correctEndSquare;

      let feedback = [];
      
      // Build detailed feedback
      if (wrongPieceType) {
        feedback.push(`Wrong piece type - not a ${PIECE_SYMBOLS[guessPieceType + (targetIsWhite ? '' : '').toLowerCase()]}`);
      } else if (wrongColor) {
        feedback.push(`Wrong color - try ${targetIsWhite ? '⚪' : '⚫'} ${PIECE_SYMBOLS[targetPieceType + (targetIsWhite ? '' : '').toLowerCase()]} instead`);
      } else if (wrongStartSquare) {
        feedback.push(`Right piece but wrong starting square`);
      }
      
      if (wrongEndSquare) {
        if (!wrongPieceType && !wrongColor && !wrongStartSquare) {
          feedback.push(`Right piece and start but wrong target square`);
        } else {
          feedback.push(`Wrong target square`);
        }
      }

      setFeedback(feedback.join(". "));
    }
    
    setGuesses(newGuesses);
    setInputPiece("");
    setInputStartSquare("");
    setInputSquare("");
    setStartRow("");
    setStartCol("");
    setInputRow("");
    setInputCol("");
    setTimeLeft(15); // Changed from 30 to 15
  };

  // Update the handleGiveUp function
  const handleGiveUp = () => {
    setTimerActive(false);
    setFeedback(
      `Game Over! The answer was: ${PIECE_SYMBOLS[target.type]} from ` +
      `${convertToChessNotation(target.startRow, target.startCol)} to ` +
      `${convertToChessNotation(target.row, target.col)}`
    );
    setGuesses([...guesses, { 
      piece: target.type, 
      startRow: target.startRow,
      startCol: target.startCol,
      row: target.row, 
      col: target.col 
    }]);
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
      cursor: "default",
      userSelect: "none",
      position: "relative"
    };

    const pieceStyle = {
      color: piece && piece.type === piece.type.toUpperCase() ? "#fff" : "#000",
      textShadow: piece && piece.type === piece.type.toUpperCase() ? 
        "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" : 
        "none"
    };

    return (
      <div key={`${row}-${col}`} style={squareStyle}>
        {piece && <span style={pieceStyle}>{PIECE_SYMBOLS[piece.type]}</span>}
      </div>
    );
  };

  // Add this function to generate piece options from current board
  const getPieceOptions = () => {
    const pieces = new Set(board.map(p => p.type));
    return Array.from(pieces).map(piece => ({
      value: piece,
      label: `${piece === piece.toUpperCase() ? '⚪' : '⚫'} ${PIECE_SYMBOLS[piece]} ${
        piece.toUpperCase() === 'K' ? 'King' :
        piece.toUpperCase() === 'Q' ? 'Queen' :
        piece.toUpperCase() === 'R' ? 'Rook' :
        piece.toUpperCase() === 'B' ? 'Bishop' :
        piece.toUpperCase() === 'N' ? 'Knight' : 'Pawn'
      }`
    })).sort((a, b) => a.label.localeCompare(b.label));
  };

  const handlePieceSelect = (e) => {
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

  return (
    <div style={{ 
      fontFamily: "sans-serif", 
      padding: "2rem",
      maxWidth: "800px",
      margin: "0 auto",
      textAlign: "center"
    }}>
      <h1 style={{ color: "#2c3e50" }}>Bulletle Chess</h1>
      
      <div style={{
        fontSize: "24px",
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
        gap: "12px",
        justifyContent: "center"
      }}>
        <select
          value={inputPiece}
          onChange={handlePieceSelect}
          style={{
            ...selectStyle,
            fontFamily: "sans-serif",
            fontSize: "16px"
          }}
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
          style={{
            padding: "8px 16px",
            backgroundColor: guesses.length >= 6 || feedback.includes("Game Over") ? "#ccc" : "#2c3e50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: (guesses.length >= 6 || feedback.includes("Game Over")) ? "not-allowed" : "pointer"
          }}
        >
          Guess
        </button>
        <button 
          onClick={handleGiveUp}
          disabled={feedback.includes("Game Over") || feedback.includes("Correct piece")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#dc3545",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: (feedback.includes("Game Over") || feedback.includes("Correct piece")) ? "not-allowed" : "pointer",
            opacity: (feedback.includes("Game Over") || feedback.includes("Correct piece")) ? 0.7 : 1
          }}
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
                    color: guess.piece === guess.piece.toUpperCase() ? "#000" : "#000",
                    marginRight: "4px"
                  }}>
                    {PIECE_SYMBOLS[guess.piece]}
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
  '&:focus': {
    borderColor: "#2c3e50"
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
  paddingRight: "32px"
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
  '&:hover': {
    backgroundColor: "#34495e"
  }
};

const inputContainerStyle = {
  marginBottom: "1.5rem",
  display: "flex",
  gap: "12px",
  justifyContent: "center",
  alignItems: "center"
};

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
