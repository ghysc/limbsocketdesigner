// Graham scan algorithm to compute convex hull
function cross(o, a, b) {
  return (a.col - o.col) * (b.row - o.row) - (a.row - o.row) * (b.col - o.col);
}

export function getConvexHull(points) {
  if (points.length < 3) return points;

  // Remove duplicates
  const uniquePoints = Array.from(
    new Set(points.map(p => `${p.row},${p.col}`))
  ).map(s => {
    const [row, col] = s.split(',').map(Number);
    return { row, col };
  });

  if (uniquePoints.length < 3) return uniquePoints;

  // Sort points by col, then by row
  uniquePoints.sort((a, b) => a.col === b.col ? a.row - b.row : a.col - b.col);

  // Build lower hull
  const lower = [];
  for (let i = 0; i < uniquePoints.length; i++) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], uniquePoints[i]) <= 0) {
      lower.pop();
    }
    lower.push(uniquePoints[i]);
  }

  // Build upper hull
  const upper = [];
  for (let i = uniquePoints.length - 1; i >= 0; i--) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], uniquePoints[i]) <= 0) {
      upper.pop();
    }
    upper.push(uniquePoints[i]);
  }

  // Remove last point of each half because it's repeated
  lower.pop();
  upper.pop();

  return lower.concat(upper);
}

// Fill polygon using scanline algorithm
export function fillPolygon(hull, gridSize = 20) {
  if (hull.length < 3) return [];

  const filledCells = new Set();

  // Get bounding box
  let minRow = Infinity, maxRow = -Infinity;
  let minCol = Infinity, maxCol = -Infinity;

  for (const point of hull) {
    minRow = Math.min(minRow, point.row);
    maxRow = Math.max(maxRow, point.row);
    minCol = Math.min(minCol, point.col);
    maxCol = Math.max(maxCol, point.col);
  }

  // Clamp to grid bounds
  minRow = Math.max(0, minRow);
  maxRow = Math.min(gridSize - 1, maxRow);
  minCol = Math.max(0, minCol);
  maxCol = Math.min(gridSize - 1, maxCol);

  // For each row, find intersections with polygon edges
  for (let row = minRow; row <= maxRow; row++) {
    const intersections = [];

    // Check each edge of the polygon
    for (let i = 0; i < hull.length; i++) {
      const p1 = hull[i];
      const p2 = hull[(i + 1) % hull.length];

      // Check if edge crosses this scanline
      if ((p1.row <= row && p2.row > row) || (p2.row <= row && p1.row > row)) {
        // Calculate intersection point
        const col = p1.col + (row - p1.row) * (p2.col - p1.col) / (p2.row - p1.row);
        intersections.push(col);
      }
    }

    // Sort intersections
    intersections.sort((a, b) => a - b);

    // Fill between pairs of intersections
    for (let i = 0; i < intersections.length; i += 2) {
      if (i + 1 < intersections.length) {
        const startCol = Math.max(minCol, Math.ceil(intersections[i]));
        const endCol = Math.min(maxCol, Math.floor(intersections[i + 1]));

        for (let col = startCol; col <= endCol; col++) {
          filledCells.add(`${row},${col}`);
        }
      }
    }
  }

  // Convert back to array of {row, col} objects
  return Array.from(filledCells).map(key => {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
  });
}
