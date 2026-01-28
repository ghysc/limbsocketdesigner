import * as THREE from "three";

/**
 * Generates 3D voxel geometry from front and side grid profiles
 * Creates cubes for each voxel that is present in both grids
 *
 * Axis mapping:
 * - Grid Y (row) → 3D Y
 * - Grid X (col) from front → 3D X
 * - Grid X (col) from side → 3D Z
 */
export function generateLimbGeometry(
	frontGrid,
	sideGrid,
	gridSize = 20,
	cellSize = 1,
) {
	const geometry = new THREE.BufferGeometry();
	const vertices = [];
	const indices = [];
	let vertexIndex = 0;

	// Iterate through all Y levels (rows)
	for (let y = 0; y < gridSize; y++) {
		// Iterate through all X positions (cols from front grid)
		for (let x = 0; x < gridSize; x++) {
			// Iterate through all Z positions (cols from side grid)
			for (let z = 0; z < gridSize; z++) {
				// Check if this voxel is present in both grids
				const frontActive = frontGrid[gridSize - y]?.[x];
				const sideActive = sideGrid[gridSize - y]?.[z];

				// Only create cube if active in both grids
				if (frontActive && sideActive) {
					// Calculate cube center position
					const cx = (x - gridSize / 2) * cellSize * 0.5;
					const cy = y * cellSize * 0.5;
					const cz = -(z - gridSize / 2) * cellSize * 0.5;
					const hs = cellSize * 0.25;

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

					vertexIndex += 8;
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
 * Generates smooth mesh using the same voxel geometry (for now)
 */
export function generateLimbGeometrySmooth(
	frontGrid,
	sideGrid,
	gridSize = 20,
	cellSize = 1,
) {
	// For now, return the same as voxel mode
	// In the future, we can add subdivision surface algorithms here
	return generateLimbGeometry(frontGrid, sideGrid, gridSize, cellSize);
}
