import * as THREE from "three";

/**
 * Creates a cube at the specified position
 */
function createCube(vertices, indices, vertexIndex, cx, cy, cz, hs) {
	// Define cube vertices (8 corners)
	const cubeVertices = [
		[cx - hs, cy - hs, cz - hs], // 0
		[cx + hs, cy - hs, cz - hs], // 1
		[cx + hs, cy + hs, cz - hs], // 2
		[cx - hs, cy + hs, cz - hs], // 3
		[cx - hs, cy - hs, cz + hs], // 4
		[cx + hs, cy - hs, cz + hs], // 5
		[cx + hs, cy + hs, cz + hs], // 6
		[cx - hs, cy + hs, cz + hs], // 7
	];

	// Add vertices
	for (const vertex of cubeVertices) {
		vertices.push(...vertex);
	}

	// Define cube faces (12 triangles = 2 per face)
	const baseIndex = vertexIndex;
	const faces = [
		// Front face (z-)
		[baseIndex, baseIndex + 1, baseIndex + 2],
		[baseIndex, baseIndex + 2, baseIndex + 3],
		// Back face (z+)
		[baseIndex + 4, baseIndex + 6, baseIndex + 5],
		[baseIndex + 4, baseIndex + 7, baseIndex + 6],
		// Top face (y+)
		[baseIndex + 3, baseIndex + 2, baseIndex + 6],
		[baseIndex + 3, baseIndex + 6, baseIndex + 7],
		// Bottom face (y-)
		[baseIndex, baseIndex + 5, baseIndex + 1],
		[baseIndex, baseIndex + 4, baseIndex + 5],
		// Right face (x+)
		[baseIndex + 1, baseIndex + 5, baseIndex + 6],
		[baseIndex + 1, baseIndex + 6, baseIndex + 2],
		// Left face (x-)
		[baseIndex + 4, baseIndex, baseIndex + 3],
		[baseIndex + 4, baseIndex + 3, baseIndex + 7],
	];

	for (const face of faces) {
		indices.push(...face);
	}
}

/**
 * Collect all active cells from a grid
 */
function collectActiveCells(grid, gridSize) {
	const cells = [];
	for (let row = 0; row < gridSize; row++) {
		for (let col = 0; col < gridSize; col++) {
			if (grid[row]?.[col]) {
				cells.push({ row, col });
			}
		}
	}
	return cells;
}

/**
 * Find the closest cell in targetCells to the given cell
 */
function findClosestCell(cell, targetCells) {
	if (targetCells.length === 0) return null;

	let closest = targetCells[0];
	let minDist = (cell.row - closest.row) ** 2 + (cell.col - closest.col) ** 2;

	for (let i = 1; i < targetCells.length; i++) {
		const target = targetCells[i];
		const dist = (cell.row - target.row) ** 2 + (cell.col - target.col) ** 2;
		if (dist < minDist) {
			minDist = dist;
			closest = target;
		}
	}
	return closest;
}

/**
 * Linear interpolation
 */
function lerp(a, b, t) {
	return a + (b - a) * t;
}

/**
 * Generates 3D voxel geometry from slices using organic loft interpolation
 * Each slice represents a cross-section at a certain height
 *
 * Rules:
 * - If only ONE slice has content: display a single layer of voxels
 * - If MULTIPLE slices have content: organic interpolation where each active cell
 *   connects to the closest active cell in the next slice
 *
 * @param {Array} slices - Array of slice objects { id, height, grid, label }
 * @param {number} gridSize - Size of each grid (default 20)
 * @param {number} cellSize - Size of each cell (default 1)
 */
export function generateLimbGeometry(slices, gridSize = 20, cellSize = 1) {
	const geometry = new THREE.BufferGeometry();
	const vertices = [];
	const indices = [];
	let vertexIndex = 0;

	// Track created voxels to avoid duplicates
	const createdVoxels = new Set();

	const addVoxel = (row, col, y) => {
		const key = `${Math.round(row)},${Math.round(col)},${y.toFixed(3)}`;
		if (createdVoxels.has(key)) return;
		createdVoxels.add(key);

		const cx = (Math.round(col) - gridSize / 2) * cellSize * 0.5;
		const cz = (Math.round(row) - gridSize / 2) * cellSize * 0.5;
		const hs = cellSize * 0.25;

		createCube(vertices, indices, vertexIndex, cx, y, cz, hs);
		vertexIndex += 8;
	};

	// Sort slices by height (descending - from top to bottom)
	const sortedSlices = [...slices].sort((a, b) => b.height - a.height);

	// Filter slices that have content
	const slicesWithContent = sortedSlices.filter((slice) =>
		slice.grid.some((row) => row.some((cell) => cell)),
	);

	if (slicesWithContent.length === 0) {
		// Return empty geometry
		vertices.push(0, 0, 0);
		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array(vertices), 3),
		);
		return geometry;
	}

	const heightScale = gridSize * cellSize * 0.5;

	// Case 1: Only ONE slice has content - single layer of voxels
	if (slicesWithContent.length === 1) {
		const slice = slicesWithContent[0];
		const y = slice.height * heightScale;

		for (let row = 0; row < gridSize; row++) {
			for (let col = 0; col < gridSize; col++) {
				if (slice.grid[row]?.[col]) {
					addVoxel(row, col, y);
				}
			}
		}
	} else {
		// Case 2: Multiple slices - organic interpolation
		const steps = 10; // Number of interpolation steps between slices

		// For each pair of consecutive slices with content
		for (let s = 0; s < slicesWithContent.length - 1; s++) {
			const slice1 = slicesWithContent[s]; // Upper slice
			const slice2 = slicesWithContent[s + 1]; // Lower slice

			const cells1 = collectActiveCells(slice1.grid, gridSize);
			const cells2 = collectActiveCells(slice2.grid, gridSize);

			const height1 = slice1.height * heightScale;
			const height2 = slice2.height * heightScale;

			// From top to bottom: each cell in slice1 connects to closest in slice2
			for (const cell1 of cells1) {
				const cell2 = findClosestCell(cell1, cells2);
				if (!cell2) continue;

				// Interpolate between cell1 and cell2
				for (let step = 0; step <= steps; step++) {
					const t = step / steps;
					const y = lerp(height1, height2, t);
					const row = lerp(cell1.row, cell2.row, t);
					const col = lerp(cell1.col, cell2.col, t);

					addVoxel(row, col, y);
				}
			}

			// From bottom to top: ensure cells in slice2 are also connected
			for (const cell2 of cells2) {
				const cell1 = findClosestCell(cell2, cells1);
				if (!cell1) continue;

				// Interpolate between cell1 and cell2
				for (let step = 0; step <= steps; step++) {
					const t = step / steps;
					const y = lerp(height1, height2, t);
					const row = lerp(cell1.row, cell2.row, t);
					const col = lerp(cell1.col, cell2.col, t);

					addVoxel(row, col, y);
				}
			}
		}
	}

	// Handle case where no vertices were created
	if (vertices.length === 0) {
		vertices.push(0, 0, 0);
	}

	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(new Float32Array(vertices), 3),
	);

	if (indices.length > 0) {
		geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
	}

	geometry.computeVertexNormals();

	return geometry;
}

/**
 * Marching cubes triangle lookup table
 */
const MARCHING_CUBES_TABLE = [
	[],
	[[0, 8, 3]],
	[[0, 1, 9]],
	[
		[1, 8, 3],
		[9, 8, 1],
	],
	[[1, 2, 10]],
	[
		[0, 8, 3],
		[1, 2, 10],
	],
	[
		[9, 2, 10],
		[0, 2, 9],
	],
	[
		[2, 8, 3],
		[2, 10, 8],
		[10, 9, 8],
	],
	[[3, 11, 2]],
	[
		[0, 11, 2],
		[8, 11, 0],
	],
	[
		[1, 9, 0],
		[2, 3, 11],
	],
	[
		[1, 11, 2],
		[1, 9, 11],
		[9, 8, 11],
	],
	[
		[3, 10, 1],
		[11, 10, 3],
	],
	[
		[0, 10, 1],
		[0, 8, 10],
		[8, 11, 10],
	],
	[
		[3, 9, 0],
		[3, 11, 9],
		[11, 10, 9],
	],
	[
		[9, 8, 10],
		[10, 8, 11],
	],
	[[4, 7, 8]],
	[
		[4, 3, 0],
		[7, 3, 4],
	],
	[
		[0, 1, 9],
		[8, 4, 7],
	],
	[
		[4, 1, 9],
		[4, 7, 1],
		[7, 3, 1],
	],
	[
		[1, 2, 10],
		[8, 4, 7],
	],
	[
		[3, 4, 7],
		[3, 0, 4],
		[1, 2, 10],
	],
	[
		[9, 2, 10],
		[9, 0, 2],
		[8, 4, 7],
	],
	[
		[2, 10, 9],
		[2, 9, 7],
		[2, 7, 3],
		[7, 4, 9],
	],
	[
		[8, 4, 7],
		[3, 11, 2],
	],
	[
		[11, 4, 7],
		[11, 2, 4],
		[2, 0, 4],
	],
	[
		[9, 0, 1],
		[8, 4, 7],
		[2, 3, 11],
	],
	[
		[4, 7, 11],
		[9, 4, 11],
		[9, 11, 2],
		[9, 2, 1],
	],
	[
		[3, 10, 1],
		[3, 11, 10],
		[7, 8, 4],
	],
	[
		[1, 11, 10],
		[1, 4, 11],
		[1, 0, 4],
		[7, 11, 4],
	],
	[
		[4, 8, 0],
		[7, 11, 10],
		[1, 9, 0],
		[11, 10, 9],
		[3, 11, 9],
		[4, 7, 9],
	],
	[
		[4, 11, 7],
		[9, 11, 4],
		[9, 10, 11],
		[9, 1, 10],
	],
	[
		[1, 4, 0],
		[5, 4, 1],
	],
	[
		[1, 5, 4],
		[1, 4, 8],
		[1, 8, 3],
	],
	[
		[5, 9, 4],
		[0, 9, 5],
	],
	[
		[0, 5, 4],
		[1, 5, 4],
		[8, 3, 5],
		[3, 4, 5],
	],
	[
		[5, 4, 1],
		[2, 10, 1],
	],
	[
		[8, 3, 0],
		[5, 4, 1],
		[2, 10, 1],
	],
	[
		[4, 5, 9],
		[10, 2, 0],
		[10, 0, 9],
	],
	[
		[5, 3, 2],
		[4, 5, 2],
		[10, 2, 8],
		[8, 2, 5],
		[8, 5, 3],
	],
	[
		[4, 1, 5],
		[2, 3, 11],
	],
	[
		[11, 5, 2],
		[8, 5, 0],
		[3, 11, 5],
		[4, 8, 5],
		[2, 5, 0],
	],
	[
		[11, 4, 5],
		[9, 4, 5],
		[9, 5, 2],
		[9, 2, 1],
		[11, 9, 4],
		[3, 11, 9],
	],
	[
		[2, 5, 9],
		[2, 9, 10],
		[2, 4, 9],
		[2, 11, 4],
		[8, 4, 11],
	],
	[
		[5, 10, 1],
		[5, 4, 10],
		[7, 10, 4],
	],
	[
		[10, 5, 4],
		[2, 10, 4],
		[0, 2, 4],
		[3, 0, 4],
		[7, 4, 3],
	],
	[
		[0, 4, 5],
		[1, 4, 5],
		[1, 5, 10],
		[7, 4, 1],
		[3, 7, 1],
	],
	[
		[4, 5, 7],
		[5, 10, 7],
		[10, 1, 7],
		[1, 3, 7],
	],
	[
		[7, 4, 5],
		[3, 7, 5],
		[3, 5, 1],
		[11, 3, 5],
	],
	[
		[1, 11, 5],
		[1, 5, 4],
		[5, 11, 3],
		[5, 3, 0],
		[5, 0, 4],
	],
	[
		[0, 5, 4],
		[0, 9, 5],
		[7, 3, 11],
	],
	[
		[4, 5, 9],
		[7, 4, 11],
	],
	[
		[9, 7, 8],
		[5, 9, 7],
	],
	[
		[9, 3, 0],
		[9, 7, 3],
		[5, 9, 7],
	],
	[
		[0, 7, 8],
		[0, 1, 7],
		[1, 5, 7],
	],
	[
		[1, 7, 3],
		[1, 5, 7],
	],
	[
		[9, 7, 8],
		[9, 5, 7],
		[10, 1, 2],
	],
	[
		[10, 1, 2],
		[5, 0, 9],
		[5, 3, 0],
		[5, 7, 3],
	],
	[
		[8, 0, 2],
		[8, 2, 5],
		[8, 5, 7],
		[10, 5, 2],
	],
	[
		[2, 10, 5],
		[2, 5, 3],
		[3, 5, 7],
	],
	[
		[7, 8, 9],
		[5, 7, 9],
		[5, 9, 2],
		[5, 2, 11],
		[5, 11, 3],
	],
	[
		[9, 2, 0],
		[9, 7, 2],
		[9, 5, 7],
		[11, 2, 7],
	],
	[
		[0, 3, 8],
		[1, 2, 11],
		[5, 7, 9],
	],
	[
		[5, 1, 9],
		[5, 7, 1],
		[7, 3, 1],
		[11, 2, 7],
	],
	[
		[8, 1, 3],
		[8, 5, 1],
		[8, 9, 5],
		[10, 1, 5],
		[11, 3, 5],
	],
	[
		[0, 9, 1],
		[5, 11, 3],
	],
	[
		[8, 0, 5],
		[0, 1, 5],
		[5, 1, 10],
	],
	[[10, 5, 1]],
	[
		[5, 8, 9],
		[5, 7, 8],
	],
	[
		[9, 7, 0],
		[9, 5, 7],
		[0, 7, 3],
	],
	[
		[0, 5, 8],
		[0, 1, 5],
		[8, 5, 7],
	],
	[
		[1, 5, 3],
		[3, 5, 7],
	],
	[
		[5, 8, 9],
		[5, 7, 8],
		[1, 2, 10],
	],
	[
		[9, 7, 0],
		[9, 5, 7],
		[10, 1, 2],
		[0, 7, 3],
	],
	[
		[10, 8, 0],
		[10, 5, 8],
		[1, 10, 0],
		[7, 8, 5],
	],
	[
		[10, 5, 2],
		[1, 10, 5],
		[5, 7, 3],
		[5, 3, 2],
	],
	[
		[2, 5, 8],
		[2, 8, 9],
		[2, 9, 10],
		[5, 7, 8],
	],
	[
		[9, 2, 0],
		[10, 5, 2],
	],
	[
		[0, 3, 8],
		[1, 2, 10],
	],
	[[1, 2, 10]],
	[[7, 5, 4]],
	[
		[7, 4, 8],
		[0, 8, 3],
	],
	[
		[0, 9, 1],
		[8, 4, 7],
	],
	[
		[4, 3, 1],
		[4, 1, 9],
		[4, 7, 3],
	],
	[
		[1, 2, 10],
		[8, 4, 7],
	],
	[
		[3, 4, 7],
		[0, 4, 3],
		[1, 2, 10],
	],
	[
		[9, 4, 7],
		[9, 7, 10],
		[9, 10, 2],
		[0, 9, 2],
	],
	[
		[2, 10, 9],
		[3, 4, 7],
		[3, 7, 9],
		[3, 9, 2],
	],
	[
		[8, 4, 7],
		[3, 2, 11],
	],
	[
		[4, 7, 11],
		[0, 4, 11],
		[0, 11, 2],
	],
	[
		[9, 0, 1],
		[4, 7, 8],
		[2, 3, 11],
	],
	[
		[1, 2, 11],
		[1, 11, 9],
		[4, 7, 11],
		[9, 11, 4],
	],
	[
		[3, 10, 1],
		[3, 11, 10],
		[7, 8, 4],
	],
	[
		[1, 11, 10],
		[0, 4, 7],
		[0, 7, 3],
		[0, 11, 4],
		[3, 11, 0],
	],
	[
		[4, 8, 0],
		[10, 3, 11],
		[10, 9, 3],
		[10, 1, 9],
		[4, 7, 10],
		[0, 10, 3],
	],
	[
		[4, 10, 9],
		[4, 7, 10],
		[7, 11, 10],
		[1, 10, 11],
	],
	[
		[5, 4, 7],
		[1, 2, 10],
	],
	[
		[8, 3, 0],
		[5, 4, 7],
		[1, 2, 10],
	],
	[
		[9, 0, 2],
		[9, 2, 10],
		[5, 4, 7],
	],
	[
		[2, 10, 9],
		[2, 9, 3],
		[3, 9, 4],
		[3, 4, 7],
	],
	[
		[4, 7, 5],
		[3, 1, 2],
		[3, 2, 11],
	],
	[
		[0, 2, 4],
		[4, 2, 7],
		[2, 11, 7],
		[1, 2, 4],
		[0, 4, 1],
	],
	[
		[7, 5, 4],
		[11, 2, 3],
		[1, 0, 9],
	],
	[
		[4, 7, 9],
		[7, 11, 9],
		[11, 2, 9],
		[2, 1, 9],
	],
	[
		[5, 4, 7],
		[10, 1, 2],
		[8, 3, 11],
	],
	[
		[3, 11, 2],
		[0, 4, 7],
		[0, 7, 1],
		[1, 7, 5],
	],
	[
		[8, 0, 9],
		[1, 10, 2],
	],
	[[1, 10, 2]],
	[
		[7, 8, 4],
		[5, 7, 4],
	],
	[
		[3, 0, 4],
		[7, 3, 4],
		[5, 7, 4],
	],
	[
		[1, 9, 0],
		[5, 7, 4],
		[8, 7, 5],
	],
	[
		[1, 4, 9],
		[1, 7, 4],
		[1, 3, 7],
	],
	[
		[1, 2, 10],
		[4, 7, 8],
		[5, 4, 7],
	],
	[
		[4, 3, 0],
		[4, 7, 3],
		[5, 4, 7],
		[1, 2, 10],
	],
	[
		[9, 5, 4],
		[10, 2, 0],
		[10, 0, 8],
		[10, 8, 7],
		[10, 7, 5],
	],
	[
		[10, 2, 1],
		[9, 5, 4],
		[8, 7, 5],
		[8, 5, 4],
	],
	[
		[8, 4, 7],
		[11, 2, 3],
	],
	[
		[11, 4, 7],
		[2, 4, 11],
		[0, 4, 2],
	],
	[
		[3, 11, 2],
		[4, 8, 1],
		[4, 1, 9],
		[4, 7, 8],
		[8, 9, 1],
	],
	[
		[1, 4, 11],
		[1, 9, 4],
		[2, 11, 4],
		[7, 11, 9],
	],
	[
		[3, 10, 1],
		[11, 10, 3],
		[4, 8, 7],
		[5, 4, 7],
	],
	[
		[0, 4, 7],
		[7, 3, 11],
		[10, 1, 5],
		[11, 10, 5],
		[10, 3, 5],
		[1, 10, 3],
		[1, 3, 0],
	],
	[
		[0, 9, 3],
		[3, 9, 11],
		[11, 9, 10],
		[5, 4, 8],
		[8, 7, 5],
	],
	[
		[7, 5, 4],
		[9, 11, 10],
		[9, 2, 11],
		[9, 1, 2],
	],
	[
		[8, 4, 5],
		[7, 8, 5],
		[3, 1, 10],
	],
	[
		[1, 10, 3],
		[3, 10, 7],
		[7, 10, 5],
	],
	[
		[0, 8, 5],
		[8, 7, 5],
		[0, 5, 9],
		[1, 9, 10],
	],
	[
		[9, 10, 5],
		[9, 5, 1],
	],
	[
		[5, 7, 4],
		[4, 8, 3],
		[4, 3, 1],
		[4, 1, 5],
	],
	[
		[5, 7, 4],
		[0, 3, 1],
		[0, 1, 5],
	],
	[
		[5, 7, 4],
		[4, 8, 0],
		[1, 0, 9],
	],
	[
		[1, 5, 9],
		[5, 7, 1],
		[7, 3, 1],
	],
	[
		[8, 4, 5],
		[7, 8, 5],
		[1, 2, 10],
	],
	[
		[0, 4, 7],
		[3, 0, 7],
		[2, 1, 10],
	],
	[
		[10, 8, 0],
		[10, 4, 8],
		[9, 4, 10],
		[2, 10, 0],
		[4, 5, 10],
	],
	[
		[2, 10, 4],
		[10, 5, 4],
		[2, 4, 1],
	],
	[
		[5, 8, 4],
		[3, 2, 11],
	],
	[
		[0, 5, 2],
		[5, 4, 2],
		[4, 11, 2],
		[3, 11, 2],
	],
	[
		[3, 2, 11],
		[0, 9, 1],
		[4, 8, 5],
	],
	[
		[1, 2, 11],
		[4, 5, 9],
		[4, 9, 1],
		[4, 1, 11],
	],
	[
		[3, 10, 1],
		[11, 10, 3],
		[8, 5, 4],
	],
	[
		[0, 10, 1],
		[3, 10, 0],
		[11, 10, 3],
		[4, 5, 8],
	],
	[
		[8, 0, 10],
		[0, 9, 10],
		[3, 10, 11],
		[4, 5, 8],
	],
	[
		[10, 4, 5],
		[9, 4, 10],
		[11, 10, 9],
		[1, 9, 10],
	],
	[
		[5, 7, 8],
		[1, 2, 10],
	],
	[
		[1, 2, 10],
		[4, 7, 5],
		[0, 3, 8],
	],
	[
		[10, 9, 2],
		[9, 0, 2],
		[4, 7, 5],
		[8, 7, 4],
	],
	[
		[4, 5, 7],
		[2, 10, 9],
		[3, 2, 9],
		[1, 3, 9],
	],
	[
		[8, 5, 7],
		[2, 3, 10],
		[11, 10, 3],
		[10, 1, 3],
	],
	[
		[1, 10, 2],
		[0, 11, 3],
		[0, 5, 11],
		[0, 4, 5],
	],
	[
		[3, 8, 0],
		[5, 10, 2],
		[5, 2, 11],
		[5, 11, 3],
	],
	[
		[11, 5, 2],
		[10, 5, 11],
		[1, 2, 5],
	],
	[
		[5, 8, 7],
		[1, 3, 2],
	],
	[
		[2, 3, 0],
		[1, 2, 5],
		[3, 5, 7],
		[3, 7, 5],
	],
	[
		[0, 7, 8],
		[0, 1, 7],
		[2, 7, 5],
		[1, 2, 5],
	],
	[
		[1, 2, 5],
		[2, 7, 5],
		[3, 7, 2],
	],
	[
		[3, 2, 11],
		[5, 8, 7],
		[1, 5, 2],
	],
	[
		[2, 11, 3],
		[1, 2, 0],
		[0, 2, 5],
	],
	[
		[3, 8, 7],
		[5, 2, 11],
		[5, 11, 3],
	],
	[
		[11, 2, 5],
		[1, 5, 2],
	],
	[
		[5, 8, 9],
		[5, 7, 8],
		[3, 2, 11],
	],
	[
		[0, 9, 2],
		[9, 5, 2],
		[11, 2, 7],
		[7, 5, 2],
	],
	[
		[0, 3, 8],
		[1, 2, 11],
	],
	[[1, 2, 11]],
	[
		[9, 7, 8],
		[9, 5, 7],
		[10, 1, 2],
	],
	[
		[10, 1, 2],
		[0, 9, 5],
		[0, 5, 7],
		[0, 7, 3],
	],
	[
		[8, 0, 2],
		[8, 2, 5],
		[8, 5, 7],
		[10, 2, 1],
	],
	[
		[2, 10, 1],
		[2, 1, 5],
		[2, 5, 3],
		[3, 5, 7],
	],
	[
		[7, 9, 5],
		[7, 8, 9],
		[3, 2, 11],
	],
	[
		[9, 2, 0],
		[9, 7, 2],
		[5, 7, 9],
		[11, 2, 7],
	],
	[
		[0, 3, 8],
		[1, 2, 11],
	],
	[[1, 2, 11]],
	[
		[1, 10, 2],
		[9, 7, 5],
		[8, 7, 9],
	],
	[
		[10, 2, 1],
		[0, 9, 5],
		[3, 0, 5],
		[3, 5, 7],
	],
	[
		[0, 8, 5],
		[0, 5, 2],
		[2, 5, 10],
		[8, 7, 5],
	],
	[
		[5, 2, 10],
		[5, 3, 2],
		[7, 3, 5],
	],
	[
		[9, 5, 8],
		[5, 7, 8],
		[3, 2, 11],
	],
	[
		[0, 9, 5],
		[0, 5, 3],
		[3, 5, 7],
		[11, 2, 3],
	],
	[
		[8, 0, 3],
		[1, 2, 11],
	],
	[[1, 2, 11]],
	[
		[10, 1, 2],
		[9, 5, 7],
		[8, 9, 7],
	],
	[
		[10, 1, 2],
		[0, 9, 3],
		[3, 9, 5],
		[3, 5, 7],
	],
	[
		[10, 8, 2],
		[8, 0, 2],
		[5, 7, 9],
	],
	[
		[10, 2, 5],
		[2, 3, 5],
		[3, 7, 5],
	],
	[
		[2, 3, 11],
		[9, 5, 8],
		[5, 7, 8],
	],
	[
		[2, 3, 11],
		[0, 9, 5],
		[5, 7, 0],
		[7, 3, 0],
	],
	[
		[0, 3, 8],
		[2, 3, 11],
	],
	[[2, 3, 11]],
];

/**
 * Generates smooth mesh using marching cubes algorithm
 */
export function generateLimbGeometrySmooth(
	frontGrid,
	sideGrid,
	gridSize = 20,
	cellSize = 1,
) {
	const geometry = new THREE.BufferGeometry();
	const vertices = [];
	const indices = [];
	const vertexMap = new Map();

	// Edge mapping for marching cubes (12 edges per cube)
	const edges = [
		[0, 1],
		[1, 2],
		[2, 3],
		[3, 0], // bottom face edges
		[4, 5],
		[5, 6],
		[6, 7],
		[7, 4], // top face edges
		[0, 4],
		[1, 5],
		[2, 6],
		[3, 7], // vertical edges
	];

	// Check if voxel is occupied
	const isOccupied = (y, x, z) => {
		if (
			y < 0 ||
			y >= gridSize ||
			x < 0 ||
			x >= gridSize ||
			z < 0 ||
			z >= gridSize
		)
			return false;
		const frontActive = frontGrid[gridSize - y]?.[x];
		const sideActive = sideGrid[gridSize - y]?.[z];
		return frontActive && sideActive;
	};

	// Add vertex to geometry
	const addVertex = (y, x, z) => {
		const key = `${y},${x},${z}`;
		if (!vertexMap.has(key)) {
			const vx = (x - gridSize / 2) * cellSize * 0.5;
			const vy = y * cellSize * 0.5;
			const vz = -(z - gridSize / 2) * cellSize * 0.5;
			vertices.push(vx, vy, vz);
			vertexMap.set(key, vertices.length / 3 - 1);
		}
		return vertexMap.get(key);
	};

	// Process each cube
	for (let y = 0; y < gridSize - 1; y++) {
		for (let x = 0; x < gridSize - 1; x++) {
			for (let z = 0; z < gridSize - 1; z++) {
				// Get the 8 corner values for this cube
				const corners = [
					isOccupied(y, x, z),
					isOccupied(y, x + 1, z),
					isOccupied(y + 1, x + 1, z),
					isOccupied(y + 1, x, z),
					isOccupied(y, x, z + 1),
					isOccupied(y, x + 1, z + 1),
					isOccupied(y + 1, x + 1, z + 1),
					isOccupied(y + 1, x, z + 1),
				];

				// Calculate cube index
				let cubeIndex = 0;
				for (let i = 0; i < 8; i++) {
					if (corners[i]) cubeIndex |= 1 << i;
				}

				// Skip if fully inside or fully outside
				if (cubeIndex === 0 || cubeIndex === 255) continue;

				// Corner coordinates
				const cornerCoords = [
					[y, x, z],
					[y, x + 1, z],
					[y + 1, x + 1, z],
					[y + 1, x, z],
					[y, x, z + 1],
					[y, x + 1, z + 1],
					[y + 1, x + 1, z + 1],
					[y + 1, x, z + 1],
				];

				// Create vertices at edge intersections
				const edgeVertices = [];
				for (let e = 0; e < edges.length; e++) {
					const [c1, c2] = edges[e];
					// Only create vertex if edge crosses surface
					if (corners[c1] !== corners[c2]) {
						const [y1, x1, z1] = cornerCoords[c1];
						const [y2, x2, z2] = cornerCoords[c2];
						// Place vertex at midpoint of edge
						edgeVertices[e] = addVertex(
							(y1 + y2) / 2,
							(x1 + x2) / 2,
							(z1 + z2) / 2,
						);
					}
				}

				// Use marching cubes lookup table to create triangles
				const triangles = MARCHING_CUBES_TABLE[cubeIndex];
				for (const tri of triangles) {
					let validTriangle = true;
					const triIndices = [];

					for (const edgeIdx of tri) {
						if (edgeVertices[edgeIdx] === undefined) {
							validTriangle = false;
							break;
						}
						triIndices.push(edgeVertices[edgeIdx]);
					}

					if (validTriangle && triIndices.length === 3) {
						indices.push(...triIndices);
					}
				}
			}
		}
	}

	if (vertices.length === 0) vertices.push(0, 0, 0);

	geometry.setAttribute(
		"position",
		new THREE.BufferAttribute(new Float32Array(vertices), 3),
	);
	if (indices.length > 0)
		geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
	geometry.computeVertexNormals();

	return geometry;
}
