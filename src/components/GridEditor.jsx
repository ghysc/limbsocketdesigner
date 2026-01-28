import { useState } from "react";
import useStore from "../stores/useStore";

function GridEditor({ title, gridType }) {
	const grid = useStore((state) =>
		gridType === "front" ? state.frontGrid : state.sideGrid,
	);
	const setGridCell = useStore((state) => state.setGridCell);
	const clearGrid = useStore((state) => state.clearGrid);

	const [isDrawing, setIsDrawing] = useState(false);
	const [drawMode, setDrawMode] = useState(true); // true = fill, false = erase

	const handleMouseDown = (row, col) => {
		const currentValue = grid[row][col];
		setDrawMode(!currentValue); // If cell is empty, we'll fill. If filled, we'll erase
		setGridCell(gridType, row, col, !currentValue);
		setIsDrawing(true);
	};

	const handleMouseEnter = (row, col) => {
		if (isDrawing) {
			setGridCell(gridType, row, col, drawMode);
		}
	};

	const handleMouseUp = () => {
		setIsDrawing(false);
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
					onMouseLeave={handleMouseUp}
					onMouseUp={handleMouseUp}
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
