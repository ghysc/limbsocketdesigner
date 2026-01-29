import { create } from "zustand";

const createEmptyGrid = () => {
	return Array(20)
		.fill(null)
		.map(() => Array(20).fill(false));
};

const useStore = create((set) => ({
	// Slices data (from top of residual limb to extremity)
	slices: [
		{ id: 0, height: 1, grid: createEmptyGrid(), label: "Top" },
		{ id: 1, height: 0.75, grid: createEmptyGrid(), label: "Mid-top" },
		{ id: 2, height: 0.5, grid: createEmptyGrid(), label: "Mid-bottom" },
		{ id: 3, height: 0.25, grid: createEmptyGrid(), label: "Extremity" },
	],

	// Update a cell in a specific slice (also clears socket as topology changes)
	setSliceCell: (sliceId, row, col, value) =>
		set((state) => ({
			socket: null, // Clear socket when grid changes
			slices: state.slices.map((slice) =>
				slice.id === sliceId
					? {
							...slice,
							grid: slice.grid.map((r, i) =>
								i === row ? r.map((c, j) => (j === col ? value : c)) : [...r],
							),
						}
					: slice,
			),
		})),

	// Clear a specific slice (also clears socket)
	clearSlice: (sliceId) =>
		set((state) => ({
			socket: null, // Clear socket when grid changes
			slices: state.slices.map((slice) =>
				slice.id === sliceId ? { ...slice, grid: createEmptyGrid() } : slice,
			),
		})),

	// Limb settings
	limbVisibility: "voxel", // 'none', 'voxel', 'smooth'
	setLimbVisibility: (visibility) => set({ limbVisibility: visibility }),

	// Inflation for smooth mode (socket creation)
	inflation: 0,
	setInflation: (value) => set({ inflation: value }),

	// Smooth normals for better lighting
	smoothNormals: true,
	setSmoothNormals: (value) => set({ smoothNormals: value }),

	// Socket generation
	socket: null,
	setSocket: (geometry) => set({ socket: geometry }),
	clearSocket: () => set({ socket: null }),

	socketThickness: 0.5,
	setSocketThickness: (value) => set({ socketThickness: value }),

	socketUseConvexHull: true,
	setSocketUseConvexHull: (value) => set({ socketUseConvexHull: value }),

	// 3D Mesh data
	generatedMesh: null,
	setGeneratedMesh: (mesh) => set({ generatedMesh: mesh }),

	// Primitives for CSG operations
	primitives: [],
	selectedPrimitiveId: null,

	// Add primitive
	addPrimitive: (type) =>
		set((state) => {
			const newPrimitive = {
				id: `${type}-${Date.now()}`,
				type,
				position: [0, 0, 0],
				scale: [1, 1, 1],
				operation: "union",
			};
			return {
				primitives: [...state.primitives, newPrimitive],
				selectedPrimitiveId: newPrimitive.id,
			};
		}),

	// Update primitive
	updatePrimitive: (id, updates) =>
		set((state) => ({
			primitives: state.primitives.map((p) =>
				p.id === id ? { ...p, ...updates } : p,
			),
		})),

	// Delete primitive
	deletePrimitive: (id) =>
		set((state) => ({
			primitives: state.primitives.filter((p) => p.id !== id),
			selectedPrimitiveId:
				state.selectedPrimitiveId === id ? null : state.selectedPrimitiveId,
		})),

	// Select primitive
	setSelectedPrimitive: (id) => set({ selectedPrimitiveId: id }),

	// Final mesh after CSG operations
	finalMesh: null,
	setFinalMesh: (mesh) => set({ finalMesh: mesh }),
}));

export default useStore;
