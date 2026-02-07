import { create } from "zustand";
import {
	NUM_CONTROL_POINTS,
	DEFAULT_RADIUS_MM,
	DEFAULT_LIMB_HEIGHT_MM,
} from "../config";

// Seeded pseudo-random for reproducible organic shapes
function seededRandom(seed) {
	let s = seed;
	return () => {
		s = (s * 16807 + 0) % 2147483647;
		return (s - 1) / 2147483646;
	};
}

const createDefaultControlPoints = (radius = DEFAULT_RADIUS_MM) => {
	const step = 360 / NUM_CONTROL_POINTS;
	return Array.from({ length: NUM_CONTROL_POINTS }, (_, i) => ({
		angle: i * step,
		radius,
	}));
};

// Organic shape: slightly oval, with random variation per point
const createOrganicControlPoints = (baseRadius, ovalRatio, seed) => {
	const step = 360 / NUM_CONTROL_POINTS;
	const rand = seededRandom(seed);
	return Array.from({ length: NUM_CONTROL_POINTS }, (_, i) => {
		const angle = i * step;
		const rad = (angle * Math.PI) / 180;
		// Oval: wider on the medial-lateral axis (X), narrower anterior-posterior (Z)
		const ovalFactor = 1 + (ovalRatio - 1) * Math.abs(Math.cos(rad));
		// Random organic variation ±8%
		const noise = 1 + (rand() - 0.5) * 0.16;
		return { angle, radius: baseRadius * ovalFactor * noise };
	});
};

const useStore = create((set) => ({
	// Slices data (from top of residual limb to extremity)
	// Anatomically: top is widest, tapers toward extremity
	slices: [
		{
			id: 0,
			heightMM: DEFAULT_LIMB_HEIGHT_MM,
			controlPoints: createOrganicControlPoints(55, 1.1, 42),
			label: "Top",
		},
		{
			id: 1,
			heightMM: DEFAULT_LIMB_HEIGHT_MM * 0.75,
			controlPoints: createOrganicControlPoints(50, 1.08, 137),
			label: "Mid-top",
		},
		{
			id: 2,
			heightMM: DEFAULT_LIMB_HEIGHT_MM * 0.5,
			controlPoints: createOrganicControlPoints(42, 1.05, 256),
			label: "Mid-bottom",
		},
		{
			id: 3,
			heightMM: DEFAULT_LIMB_HEIGHT_MM * 0.25,
			controlPoints: createOrganicControlPoints(30, 1.02, 391),
			label: "Extremity",
		},
	],

	// Update a control point radius in a specific slice
	setControlPointRadius: (sliceId, pointIndex, radius) =>
		set((state) => ({
			socket: null,
			slices: state.slices.map((slice) =>
				slice.id === sliceId
					? {
							...slice,
							controlPoints: slice.controlPoints.map((cp, i) =>
								i === pointIndex ? { ...cp, radius } : cp,
							),
						}
					: slice,
			),
		})),

	// Reset a specific slice to default circle
	clearSlice: (sliceId) =>
		set((state) => ({
			socket: null,
			slices: state.slices.map((slice) =>
				slice.id === sliceId
					? { ...slice, controlPoints: createDefaultControlPoints() }
					: slice,
			),
		})),

	// Add a new slice
	addSlice: (heightMM, label) =>
		set((state) => {
			const maxId = Math.max(...state.slices.map((s) => s.id), -1);
			return {
				socket: null,
				slices: [
					...state.slices,
					{
						id: maxId + 1,
						heightMM,
						controlPoints: createDefaultControlPoints(),
						label: label || `Slice ${maxId + 2}`,
					},
				].sort((a, b) => b.heightMM - a.heightMM),
			};
		}),

	// Remove a slice
	removeSlice: (sliceId) =>
		set((state) => ({
			socket: null,
			slices: state.slices.filter((s) => s.id !== sliceId),
		})),

	// Socket generation
	socket: null,
	setSocket: (geometry) => set({ socket: geometry }),
	clearSocket: () => set({ socket: null }),

	socketThickness: 3, // mm
	setSocketThickness: (value) => set({ socketThickness: value }),

	blendRadius: 5, // mm, smooth boolean blend radius
	setBlendRadius: (value) => set({ blendRadius: value }),

	// Primitives for CSG operations
	primitives: [],
	selectedPrimitiveId: null,

	addPrimitive: (type) =>
		set((state) => {
			const newPrimitive = {
				id: `${type}-${Date.now()}`,
				type,
				position: [0, 0, 0],
				scale: [10, 10, 10], // mm
				operation: "union",
			};
			return {
				primitives: [...state.primitives, newPrimitive],
				selectedPrimitiveId: newPrimitive.id,
			};
		}),

	updatePrimitive: (id, updates) =>
		set((state) => ({
			primitives: state.primitives.map((p) =>
				p.id === id ? { ...p, ...updates } : p,
			),
		})),

	deletePrimitive: (id) =>
		set((state) => ({
			primitives: state.primitives.filter((p) => p.id !== id),
			selectedPrimitiveId:
				state.selectedPrimitiveId === id ? null : state.selectedPrimitiveId,
		})),

	setSelectedPrimitive: (id) => set({ selectedPrimitiveId: id }),
}));

export default useStore;
