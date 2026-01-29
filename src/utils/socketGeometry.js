import * as THREE from "three";
import { ConvexGeometry } from "three/addons/geometries/ConvexGeometry.js";
import { CSG } from "three-csg-ts";

/**
 * Extract Vector3 points from a BufferGeometry
 */
function extractPointsFromGeometry(geometry) {
	const positions = geometry.getAttribute("position");
	const points = [];

	for (let i = 0; i < positions.count; i++) {
		points.push(
			new THREE.Vector3(
				positions.getX(i),
				positions.getY(i),
				positions.getZ(i),
			),
		);
	}

	return points;
}

/**
 * Shrink points toward the centroid by a given amount
 */
function shrinkPoints(points, amount) {
	// Calculate centroid
	const centroid = new THREE.Vector3();
	for (const p of points) {
		centroid.add(p);
	}
	centroid.divideScalar(points.length);

	// Shrink each point toward centroid
	return points.map((p) => {
		const dir = new THREE.Vector3().subVectors(p, centroid).normalize();
		return new THREE.Vector3().copy(p).sub(dir.multiplyScalar(amount));
	});
}

/**
 * Find the maximum Y value in a geometry (top of the limb)
 */
function findTopY(geometry) {
	const positions = geometry.getAttribute("position");
	let maxY = -Infinity;

	for (let i = 0; i < positions.count; i++) {
		maxY = Math.max(maxY, positions.getY(i));
	}

	return maxY;
}

/**
 * Find the bounding box of a geometry
 */
function getBoundingBox(geometry) {
	geometry.computeBoundingBox();
	return geometry.boundingBox;
}

/**
 * Create a primitive mesh for CSG operations
 */
function createPrimitiveMesh(primitive) {
	let geometry;

	switch (primitive.type) {
		case "sphere":
			geometry = new THREE.SphereGeometry(0.5, 32, 32);
			break;
		case "cube":
			geometry = new THREE.BoxGeometry(1, 1, 1);
			break;
		case "cylinder":
			geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
			break;
		default:
			geometry = new THREE.BoxGeometry(1, 1, 1);
	}

	const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
	mesh.position.set(...primitive.position);
	mesh.scale.set(...primitive.scale);

	return mesh;
}

/**
 * Generate a socket from the limb geometry
 *
 * @param {THREE.BufferGeometry} limbGeometry - The smooth limb geometry
 * @param {number} thickness - Wall thickness in world units
 * @param {boolean} useConvexHull - Whether to use convex hull for outer surface
 * @param {Array} primitives - Array of primitives for CSG operations
 * @returns {THREE.BufferGeometry} The socket geometry
 */
export function generateSocket(
	limbGeometry,
	thickness = 0.5,
	useConvexHull = true,
	primitives = [],
) {
	if (!limbGeometry || !limbGeometry.getAttribute("position")) {
		return null;
	}

	// 1. Extract points from limb geometry
	const points = extractPointsFromGeometry(limbGeometry);

	if (points.length < 4) {
		console.warn("Not enough points to generate socket");
		return null;
	}

	// 2. Create outer surface
	let outerGeometry;
	if (useConvexHull) {
		outerGeometry = new ConvexGeometry(points);
	} else {
		outerGeometry = limbGeometry.clone();
	}

	// 3. Create inner surface (shrunk for wall thickness)
	const innerPoints = shrinkPoints(points, thickness);
	let innerGeometry;
	if (useConvexHull) {
		innerGeometry = new ConvexGeometry(innerPoints);
	} else {
		// For non-convex, shrink the geometry
		const shrunkPoints = shrinkPoints(points, thickness);
		innerGeometry = new ConvexGeometry(shrunkPoints);
	}

	// 4. Create meshes for CSG
	const dummyMaterial = new THREE.MeshBasicMaterial();
	const outerMesh = new THREE.Mesh(outerGeometry, dummyMaterial);
	const innerMesh = new THREE.Mesh(innerGeometry, dummyMaterial);

	outerMesh.updateMatrix();
	innerMesh.updateMatrix();

	// 5. Subtract inner from outer to create hollow shell
	let socketMesh = CSG.subtract(outerMesh, innerMesh);

	// 6. Cut the top to create opening
	const topY = findTopY(limbGeometry);
	const bbox = getBoundingBox(outerGeometry);
	const bboxSize = new THREE.Vector3();
	bbox.getSize(bboxSize);

	// Create a large box to cut the top
	const cutBoxSize = Math.max(bboxSize.x, bboxSize.z) * 2;
	const cutBoxGeometry = new THREE.BoxGeometry(cutBoxSize, cutBoxSize, cutBoxSize);
	const cutMesh = new THREE.Mesh(cutBoxGeometry, dummyMaterial);
	cutMesh.position.set(
		(bbox.min.x + bbox.max.x) / 2,
		topY + cutBoxSize / 2 - 0.1, // Slightly below top to ensure clean cut
		(bbox.min.z + bbox.max.z) / 2,
	);
	cutMesh.updateMatrix();

	socketMesh = CSG.subtract(socketMesh, cutMesh);

	// 7. Apply primitive CSG operations
	for (const primitive of primitives) {
		const primMesh = createPrimitiveMesh(primitive);
		primMesh.updateMatrix();

		try {
			switch (primitive.operation) {
				case "union":
					socketMesh = CSG.union(socketMesh, primMesh);
					break;
				case "subtract":
					socketMesh = CSG.subtract(socketMesh, primMesh);
					break;
				case "intersect":
					socketMesh = CSG.intersect(socketMesh, primMesh);
					break;
			}
		} catch (error) {
			console.warn(`CSG operation failed for primitive ${primitive.id}:`, error);
		}
	}

	// 8. Get the final geometry
	const finalGeometry = socketMesh.geometry;
	finalGeometry.computeVertexNormals();

	return finalGeometry;
}
