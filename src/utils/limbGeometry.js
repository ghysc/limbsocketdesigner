import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

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
 * Builds a Map of all occupied voxel positions from slices
 * Used by both generateLimbGeometry (voxel) and generateLimbGeometrySmooth (SDF)
 *
 * @param {Array} slices - Array of slice objects { id, height, grid, label }
 * @param {number} gridSize - Size of each grid (default 20)
 * @param {number} heightScale - Scale factor for height
 * @returns {Map} Map of voxel keys to {row, col, y} objects
 */
function buildOccupiedVoxels(slices, gridSize, heightScale) {
	const voxelMap = new Map();

	const addVoxel = (row, col, y) => {
		const r = Math.round(row);
		const c = Math.round(col);
		const yRounded = Math.round(y * 1000) / 1000;
		const key = `${r},${c},${yRounded}`;
		if (!voxelMap.has(key)) {
			voxelMap.set(key, { row: r, col: c, y: yRounded });
		}
	};

	// Sort slices by height (descending - from top to bottom)
	const sortedSlices = [...slices].sort((a, b) => b.height - a.height);

	// Filter slices that have content
	const slicesWithContent = sortedSlices.filter((slice) =>
		slice.grid.some((row) => row.some((cell) => cell)),
	);

	if (slicesWithContent.length === 0) {
		return voxelMap;
	}

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
		const steps = 10;

		for (let s = 0; s < slicesWithContent.length - 1; s++) {
			const slice1 = slicesWithContent[s];
			const slice2 = slicesWithContent[s + 1];

			const cells1 = collectActiveCells(slice1.grid, gridSize);
			const cells2 = collectActiveCells(slice2.grid, gridSize);

			const height1 = slice1.height * heightScale;
			const height2 = slice2.height * heightScale;

			// From top to bottom
			for (const cell1 of cells1) {
				const cell2 = findClosestCell(cell1, cells2);
				if (!cell2) continue;

				for (let step = 0; step <= steps; step++) {
					const t = step / steps;
					const y = lerp(height1, height2, t);
					const row = lerp(cell1.row, cell2.row, t);
					const col = lerp(cell1.col, cell2.col, t);
					addVoxel(row, col, y);
				}
			}

			// From bottom to top
			for (const cell2 of cells2) {
				const cell1 = findClosestCell(cell2, cells1);
				if (!cell1) continue;

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

	return voxelMap;
}

/**
 * Generates 3D voxel geometry from slices using organic loft interpolation
 * Each slice represents a cross-section at a certain height
 *
 * @param {Array} slices - Array of slice objects { id, height, grid, label }
 * @param {number} gridSize - Size of each grid (default 20)
 * @param {number} cellSize - Size of each cell (default 1)
 */
export function generateLimbGeometry(slices, gridSize = 20, cellSize = 1) {
	const geometry = new THREE.BufferGeometry();
	const vertices = [];
	const indices = [];

	const heightScale = gridSize * cellSize;
	const hs = cellSize * 0.25;

	// Build occupied voxels using the common function
	const voxelMap = buildOccupiedVoxels(slices, gridSize, heightScale);

	if (voxelMap.size === 0) {
		vertices.push(0, 0, 0);
		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array(vertices), 3),
		);
		return geometry;
	}

	// Create cubes for each voxel
	let vertexIndex = 0;
	for (const voxel of voxelMap.values()) {
		const cx = (voxel.col - gridSize / 2) * cellSize * 0.5;
		const cz = (voxel.row - gridSize / 2) * cellSize * 0.5;

		createCube(vertices, indices, vertexIndex, cx, voxel.y, cz, hs);
		vertexIndex += 8;
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
 * Generates smooth mesh using SDF + Marching Cubes (Three.js implementation)
 *
 * @param {Array} slices - Array of slice objects { id, height, grid, label }
 * @param {number} gridSize - Size of each grid (default 20)
 * @param {number} cellSize - Size of each cell (default 1)
 * @param {number} inflation - Inflation amount for socket (default 0)
 * @returns {THREE.BufferGeometry} Smooth mesh geometry
 */
export function generateLimbGeometrySmooth(
	slices,
	gridSize = 20,
	cellSize = 1,
	inflation = 0,
	smoothNormals = false,
) {
	const heightScale = gridSize * cellSize;

	// Step 1: Build occupied voxels using the common function
	const voxelMap = buildOccupiedVoxels(slices, gridSize, heightScale);

	if (voxelMap.size === 0) {
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3),
		);
		return geometry;
	}

	// Find bounds of voxels (with padding for marching cubes)
	const voxels = Array.from(voxelMap.values());
	let minY = Infinity,
		maxY = -Infinity;
	let minRow = Infinity,
		maxRow = -Infinity;
	let minCol = Infinity,
		maxCol = -Infinity;

	for (const v of voxels) {
		minY = Math.min(minY, v.y);
		maxY = Math.max(maxY, v.y);
		minRow = Math.min(minRow, v.row);
		maxRow = Math.max(maxRow, v.row);
		minCol = Math.min(minCol, v.col);
		maxCol = Math.max(maxCol, v.col);
	}

	// Add padding to ensure marching cubes can close the surface
	// Padding must be > shellThickness (2.0) to ensure surface closes properly
	const padding = 4;
	minRow -= padding; // No clamping - allow SDF to extend beyond grid
	maxRow += padding;
	minCol -= padding;
	maxCol += padding;
	const yPadding = Math.max((maxY - minY) * 0.3, 3); // At least 3 units
	minY -= yPadding;
	maxY += yPadding;

	const yRange = maxY - minY || 1;
	const rowRange = maxRow - minRow || 1;
	const colRange = maxCol - minCol || 1;

	// Step 2: Use Three.js MarchingCubes with setCell
	const resolution = 32;
	const dummyMaterial = new THREE.MeshBasicMaterial();
	const mc = new MarchingCubes(resolution, dummyMaterial, true, true, 100000);

	// Three.js MC: values > isolation are "inside"
	// fieldValue = shellThickness - minDist
	// surface at: minDist = shellThickness - isolation
	// So negative isolation = bigger mesh, positive = smaller
	// We want positive inflation = bigger, so use -inflation
	mc.isolation = -inflation;
	mc.reset();

	// Normalize Y to be in similar scale as row/col for distance calculation
	const yToGridScale = Math.max(rowRange, colRange) / yRange;

	// Fill the field using setCell
	for (let iz = 0; iz < resolution; iz++) {
		for (let iy = 0; iy < resolution; iy++) {
			for (let ix = 0; ix < resolution; ix++) {
				// Map grid coordinates to voxel space
				const voxelCol = minCol + (ix / (resolution - 1)) * colRange;
				const voxelY = minY + (iy / (resolution - 1)) * yRange;
				const voxelRow = minRow + (iz / (resolution - 1)) * rowRange;

				// Find distance to nearest occupied voxel
				let minDist = Infinity;
				for (const v of voxels) {
					const dx = voxelCol - v.col;
					const dy = (voxelY - v.y) * yToGridScale;
					const dz = voxelRow - v.row;
					const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
					minDist = Math.min(minDist, dist);
				}

				// Convert distance to field value
				// High value = inside, low value = outside
				// Shell thickness controls default surface distance from voxel skeleton
				const shellThickness = 1.2;
				const fieldValue = shellThickness - minDist;

				mc.setCell(ix, iy, iz, fieldValue);
			}
		}
	}

	// Generate geometry
	mc.update();
	const mcGeometry = mc.geometry.clone();

	// Compute world scale and offset
	// MC outputs in [-1, 1] range (span of 2), so divide by 2
	// Voxel positions use cellSize * 0.5 factor
	const worldScaleX = (colRange * cellSize * 0.5) / 2;
	const worldScaleY = yRange / 2;
	const worldScaleZ = (rowRange * cellSize * 0.5) / 2;
	// Offset maps MC center (0) to world center
	const worldOffsetX = ((minCol + maxCol) / 2 - gridSize / 2) * cellSize * 0.5;
	const worldOffsetY = (minY + maxY) / 2;
	const worldOffsetZ = ((minRow + maxRow) / 2 - gridSize / 2) * cellSize * 0.5;

	// Transform vertices from MC space [-1,1] to world space
	const positions = mcGeometry.getAttribute("position");
	if (!positions) {
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute(
			"position",
			new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3),
		);
		return geometry;
	}

	const vertices = positions.array;
	for (let i = 0; i < vertices.length; i += 3) {
		// MC outputs in [-1, 1] range, transform to world coordinates
		vertices[i] = vertices[i] * worldScaleX + worldOffsetX;
		vertices[i + 1] = vertices[i + 1] * worldScaleY + worldOffsetY;
		vertices[i + 2] = vertices[i + 2] * worldScaleZ + worldOffsetZ;
	}

	// Smooth normals: merge duplicate vertices so normals interpolate across faces
	if (smoothNormals) {
		const mergedGeometry = BufferGeometryUtils.mergeVertices(mcGeometry);
		mergedGeometry.computeVertexNormals();
		return mergedGeometry;
	}

	mcGeometry.computeVertexNormals();
	return mcGeometry;
}
