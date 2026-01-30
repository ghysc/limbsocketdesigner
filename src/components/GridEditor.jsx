import { useState, useRef } from "react";
import useStore from "../stores/useStore";
import { getConvexHull, fillPolygon } from "../utils/convexHull";

function GridEditor({ slice }) {
	const setSliceCell = useStore((state) => state.setSliceCell);
	const clearSlice = useStore((state) => state.clearSlice);

	const [isDrawing, setIsDrawing] = useState(false);
	const drawnPointsRef = useRef([]);

	const updateConvexShape = (points) => {
		if (points.length === 0) return;

		// Collect all cells that are currently true in the grid
		const allTrueCells = [];
		slice.grid.forEach((row, rowIndex) => {
			row.forEach((cell, colIndex) => {
				if (cell) {
					allTrueCells.push({ row: rowIndex, col: colIndex });
				}
			});
		});

		// Combine with newly drawn points
		const combinedPoints = [...allTrueCells, ...points];

		if (combinedPoints.length === 0) return;

		// Compute convex hull (NO extension to top anymore)
		const hull = getConvexHull(combinedPoints);

		// Fill the convex polygon
		const filledCells = fillPolygon(hull, 20);

		// Update grid - always fill (no erasing)
		filledCells.forEach((cell) => {
			setSliceCell(slice.id, cell.row, cell.col, true);
		});
	};

	const handleMouseDown = (row, col) => {
		// Always draw, never erase
		setIsDrawing(true);
		drawnPointsRef.current = [{ row, col }];
		updateConvexShape(drawnPointsRef.current);
	};

	const handleMouseEnter = (row, col) => {
		if (isDrawing) {
			// Add point to list
			drawnPointsRef.current.push({ row, col });

			// Update convex shape
			updateConvexShape(drawnPointsRef.current);
		}
	};

	const handleMouseUp = () => {
		setIsDrawing(false);
		drawnPointsRef.current = [];
	};

	const handleMouseLeave = () => {
		setIsDrawing(false);
		drawnPointsRef.current = [];
	};

	return (
		<div className="flex flex-col">
			<div className="bg-gray-700 rounded-t-lg px-2 py-1 flex justify-between items-center">
				<div>
					<h3 className="font-semibold text-white text-sm">{slice.label}</h3>
					<span className="text-xs text-gray-400">
						Height: {Math.round(slice.height * 100)}%
					</span>
				</div>
				<button
					onClick={() => clearSlice(slice.id)}
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
					style={{ userSelect: "none" }}
				>
					{slice.grid.map((row, rowIndex) => (
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
