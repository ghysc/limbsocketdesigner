import * as THREE from "three";
import { NURBSSurface } from "three/examples/jsm/curves/NURBSSurface.js";
import { ParametricGeometry } from "three/examples/jsm/geometries/ParametricGeometry.js";

/**
 * Evaluate a closed cubic B-spline from polar control points.
 * Returns an array of {x, z} points in mm (2D cross-section).
 *
 * @param {Array<{angle: number, radius: number}>} controlPoints - polar control points
 * @param {number} numSamples - number of points to evaluate on the curve
 * @returns {Array<{x: number, z: number}>}
 */
export function evaluateClosedBSpline(controlPoints, numSamples = 64) {
	const n = controlPoints.length;
	if (n < 3) return [];

	// Convert polar to cartesian
	const pts = controlPoints.map((cp) => {
		const rad = (cp.angle * Math.PI) / 180;
		return { x: Math.cos(rad) * cp.radius, z: Math.sin(rad) * cp.radius };
	});

	// Wrap points for closed cubic B-spline (duplicate first 3 points at end)
	const wrapped = [...pts, pts[0], pts[1], pts[2]];

	const result = [];
	for (let i = 0; i < numSamples; i++) {
		const t = (i / numSamples) * n; // parameter over the original point count
		const seg = Math.floor(t);
		const u = t - seg;

		// Cubic B-spline basis functions
		const u2 = u * u;
		const u3 = u2 * u;
		const b0 = (-u3 + 3 * u2 - 3 * u + 1) / 6;
		const b1 = (3 * u3 - 6 * u2 + 4) / 6;
		const b2 = (-3 * u3 + 3 * u2 + 3 * u + 1) / 6;
		const b3 = u3 / 6;

		const p0 = wrapped[seg];
		const p1 = wrapped[seg + 1];
		const p2 = wrapped[seg + 2];
		const p3 = wrapped[seg + 3];

		result.push({
			x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
			z: b0 * p0.z + b1 * p1.z + b2 * p2.z + b3 * p3.z,
		});
	}

	return result;
}

/**
 * Create a lofted NURBS surface from multiple slice cross-sections.
 * Returns a Three.js BufferGeometry.
 *
 * @param {Array<{heightMM: number, controlPoints: Array}>} slices
 * @param {number} resolutionU - circumferential resolution
 * @param {number} resolutionV - height resolution
 * @returns {THREE.BufferGeometry}
 */
export function createLoftGeometry(
	slices,
	resolutionU = 64,
	resolutionV = 32,
) {
	if (slices.length < 2) return null;

	// Sort slices by height ascending
	const sorted = [...slices].sort((a, b) => a.heightMM - b.heightMM);

	// Evaluate each slice's B-spline curve
	const curves = sorted.map((slice) =>
		evaluateClosedBSpline(slice.controlPoints, resolutionU),
	);

	const heights = sorted.map((s) => s.heightMM);

	// Build geometry by interpolating between curves along height
	const positions = [];
	const normals = [];
	const indices = [];

	for (let v = 0; v <= resolutionV; v++) {
		const t = v / resolutionV;
		const y = heights[0] + t * (heights[heights.length - 1] - heights[0]);

		// Find the two slices surrounding this height
		let lower = 0;
		for (let i = 0; i < heights.length - 1; i++) {
			if (y >= heights[i] && y <= heights[i + 1]) {
				lower = i;
				break;
			}
		}
		const upper = Math.min(lower + 1, heights.length - 1);
		const blend =
			lower === upper
				? 0
				: (y - heights[lower]) / (heights[upper] - heights[lower]);

		// Interpolate between the two curves
		for (let u = 0; u <= resolutionU; u++) {
			const uIdx = u % resolutionU;
			const pLower = curves[lower][uIdx];
			const pUpper = curves[upper][uIdx];

			const x = pLower.x + blend * (pUpper.x - pLower.x);
			const z = pLower.z + blend * (pUpper.z - pLower.z);

			positions.push(x, y, z);
		}
	}

	// Generate triangle indices
	for (let v = 0; v < resolutionV; v++) {
		for (let u = 0; u < resolutionU; u++) {
			const row = resolutionU + 1;
			const a = v * row + u;
			const b = a + 1;
			const c = a + row;
			const d = c + 1;

			indices.push(a, c, b);
			indices.push(b, c, d);
		}
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(positions, 3),
	);
	geometry.setIndex(indices);
	geometry.computeVertexNormals();

	return geometry;
}
