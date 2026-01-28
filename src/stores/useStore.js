import { create } from "zustand";

const createEmptyGrid = () => {
	return Array(20)
		.fill(null)
		.map(() => Array(20).fill(false));
};

const useStore = create((set) => ({
	// 2D Grid data
	frontGrid: createEmptyGrid(),
	sideGrid: createEmptyGrid(),

	// Update grid cell
	setGridCell: (gridType, row, col, value) =>
		set((state) => {
			const grid = gridType === "front" ? "frontGrid" : "sideGrid";
			const newGrid = state[grid].map((r, i) =>
				i === row ? r.map((c, j) => (j === col ? value : c)) : [...r],
			);
			return { [grid]: newGrid };
		}),

	// Clear grid
	clearGrid: (gridType) =>
		set({
			[gridType === "front" ? "frontGrid" : "sideGrid"]: createEmptyGrid(),
		}),

	// Limb settings
	limbVisibility: "voxel", // 'none', 'voxel', 'smooth'
	setLimbVisibility: (visibility) => set({ limbVisibility: visibility }),

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
