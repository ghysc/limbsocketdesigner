import { useState, useRef } from "react";
import useStore from "../stores/useStore";
import { getConvexHull, fillPolygon } from "../utils/convexHull";

function GridEditor({ title, gridType }) {
	const grid = useStore((state) =>
		gridType === "front" ? state.frontGrid : state.sideGrid,
	);
	const setGridCell = useStore((state) => state.setGridCell);
	const clearGrid = useStore((state) => state.clearGrid);

	const [isDrawing, setIsDrawing] = useState(false);
	const [drawMode, setDrawMode] = useState(true);
	const drawnPointsRef = useRef([]);
	const previousCellsRef = useRef([]);

	const updateConvexShape = (points, shouldFill) => {
		// Clear previous cells
		previousCellsRef.current.forEach(cell => {
			setGridCell(gridType, cell.row, cell.col, false);
		});

		if (points.length === 0) {
			previousCellsRef.current = [];
			return;
		}

		// Find leftmost and rightmost points
		let minCol = Infinity;
		let maxCol = -Infinity;
		points.forEach(p => {
			minCol = Math.min(minCol, p.col);
			maxCol = Math.max(maxCol, p.col);
		});

		// Add points that extend to top of grid (row 0)
		const extendedPoints = [...points];
		extendedPoints.push({ row: 0, col: minCol });
		extendedPoints.push({ row: 0, col: maxCol });

		// Compute convex hull with extended points
		const hull = getConvexHull(extendedPoints);

		// Fill the convex polygon
		const filledCells = fillPolygon(hull, 20);

		// Update grid
		filledCells.forEach(cell => {
			setGridCell(gridType, cell.row, cell.col, shouldFill);
		});

		previousCellsRef.current = filledCells;
	};

	const handleMouseDown = (row, col) => {
		const currentValue = grid[row][col];
		setDrawMode(!currentValue);
		setIsDrawing(true);
		drawnPointsRef.current = [{ row, col }];
		updateConvexShape(drawnPointsRef.current, !currentValue);
	};

	const handleMouseEnter = (row, col) => {
		if (isDrawing) {
			// Add point to list
			drawnPointsRef.current.push({ row, col });

			// Update convex shape
			updateConvexShape(drawnPointsRef.current, drawMode);
		}
	};

	const handleMouseUp = () => {
		setIsDrawing(false);
		drawnPointsRef.current = [];
		previousCellsRef.current = [];
	};

	const handleMouseLeave = () => {
		setIsDrawing(false);
		drawnPointsRef.current = [];
		previousCellsRef.current = [];
	};

	return (
		<div className="flex flex-col">
			<div className="bg-gray-700 rounded-t-lg px-2 py-1 flex justify-between items-center">
				<h3 className="font-semibold text-white text-sm">{title}</h3>
				<button
					onClick={() => clearGrid(gridType)}
					className="text-xs px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded"
				>
					Clear
				</button>
			</div>
			<div className="flex justify-center items-center bg-gray-200 p-2">
				<div
					className="border-2 border-black bg-gray-200"
					onMouseLeave={handleMouseLeave}
					onMouseUp={handleMouseUp}
					onDragStart={(e) => e.preventDefault()}
					style={{ userSelect: 'none' }}
				>
					{grid.map((row, rowIndex) => (
						<div key={rowIndex} className="flex">
							{row.map((cell, colIndex) => (
								<div
									key={`${rowIndex}-${colIndex}`}
									className={`w-4 h-4 border border-black cursor-pointer transition-colors ${
										cell ? "bg-orange-500" : "bg-gray-200 hover:bg-orange-100"
									}`}
									onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
									onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
								/>
							))}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default GridEditor;
