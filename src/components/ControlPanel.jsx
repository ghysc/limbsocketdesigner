import useStore from "../stores/useStore";

function ControlPanel() {
	const primitives = useStore((state) => state.primitives);
	const selectedPrimitiveId = useStore((state) => state.selectedPrimitiveId);
	const addPrimitive = useStore((state) => state.addPrimitive);
	const updatePrimitive = useStore((state) => state.updatePrimitive);
	const deletePrimitive = useStore((state) => state.deletePrimitive);
	const setSelectedPrimitive = useStore((state) => state.setSelectedPrimitive);
	const limbVisibility = useStore((state) => state.limbVisibility);
	const setLimbVisibility = useStore((state) => state.setLimbVisibility);
	const inflation = useStore((state) => state.inflation);
	const setInflation = useStore((state) => state.setInflation);

	const selectedPrimitive = primitives.find(
		(p) => p.id === selectedPrimitiveId,
	);

	const handleAddShape = (type) => {
		addPrimitive(type);
	};

	const handlePositionChange = (axis, value) => {
		if (!selectedPrimitive) return;
		const newPosition = [...selectedPrimitive.position];
		const axisIndex = { x: 0, y: 1, z: 2 }[axis];
		newPosition[axisIndex] = parseFloat(value) || 0;
		updatePrimitive(selectedPrimitive.id, { position: newPosition });
	};

	const handleScaleChange = (axis, value) => {
		if (!selectedPrimitive) return;
		const newScale = [...selectedPrimitive.scale];
		const axisIndex = { x: 0, y: 1, z: 2 }[axis];
		newScale[axisIndex] = parseFloat(value) || 0.1;
		updatePrimitive(selectedPrimitive.id, { scale: newScale });
	};

	const handleOperationChange = (operation) => {
		if (!selectedPrimitive) return;
		updatePrimitive(selectedPrimitive.id, { operation });
	};

	return (
		<div className="bg-gray-200 rounded-lg shadow p-4 space-y-4 overflow-y-auto">
			<div>
				<h3 className="font-semibold text-gray-700 mb-2">Limb</h3>
				<div className="space-y-2">
					<p className="text-sm text-gray-600">Visibility Mode</p>
					<div className="grid grid-cols-3 gap-2">
						<button
							onClick={() => setLimbVisibility("none")}
							className={`px-3 py-2 rounded text-sm font-medium transition ${
								limbVisibility === "none"
									? "bg-blue-500 text-white"
									: "bg-gray-300 hover:bg-gray-400"
							}`}
						>
							None
						</button>
						<button
							onClick={() => setLimbVisibility("voxel")}
							className={`px-3 py-2 rounded text-sm font-medium transition ${
								limbVisibility === "voxel"
									? "bg-blue-500 text-white"
									: "bg-gray-300 hover:bg-gray-400"
							}`}
						>
							Voxel
						</button>
						<button
							onClick={() => setLimbVisibility("smooth")}
							className={`px-3 py-2 rounded text-sm font-medium transition ${
								limbVisibility === "smooth"
									? "bg-blue-500 text-white"
									: "bg-gray-300 hover:bg-gray-400"
							}`}
						>
							Smooth
						</button>
					</div>
					{limbVisibility === "smooth" && (
						<div className="mt-3">
							<div className="flex justify-between items-center mb-1">
								<label className="text-sm text-gray-600">Inflation</label>
								<span className="text-sm font-medium text-gray-700">
									{inflation.toFixed(1)}
								</span>
							</div>
							<input
								type="range"
								min="0"
								max="2"
								step="0.1"
								value={inflation}
								onChange={(e) => setInflation(parseFloat(e.target.value))}
								className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
							/>
						</div>
					)}
				</div>
			</div>

			<div>
				<h3 className="font-semibold text-gray-700 mb-2">Add Shape</h3>
				<div className="grid grid-cols-3 gap-2">
					<button
						onClick={() => handleAddShape("sphere")}
						className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
					>
						Sphere
					</button>
					<button
						onClick={() => handleAddShape("cube")}
						className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
					>
						Cube
					</button>
					<button
						onClick={() => handleAddShape("cylinder")}
						className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
					>
						Cylinder
					</button>
				</div>
			</div>

			<div>
				<h3 className="font-semibold text-gray-700 mb-2">Primitives</h3>
				<div className="space-y-1 max-h-32 overflow-y-auto">
					{primitives.length === 0 ? (
						<p className="text-sm text-gray-500">No primitives added</p>
					) : (
						primitives.map((primitive) => (
							<div
								key={primitive.id}
								className={`flex items-center justify-between p-2 rounded cursor-pointer ${
									primitive.id === selectedPrimitiveId
										? "bg-blue-100 border border-blue-300"
										: "bg-gray-50 hover:bg-gray-100"
								}`}
								onClick={() => setSelectedPrimitive(primitive.id)}
							>
								<span className="text-sm font-medium">{primitive.type}</span>
								<button
									onClick={(e) => {
										e.stopPropagation();
										deletePrimitive(primitive.id);
									}}
									className="text-red-500 hover:text-red-700 text-xs"
								>
									Delete
								</button>
							</div>
						))
					)}
				</div>
			</div>

			{selectedPrimitive && (
				<>
					<div>
						<h3 className="font-semibold text-gray-700 mb-2">Operation</h3>
						<div className="grid grid-cols-3 gap-2">
							<button
								onClick={() => handleOperationChange("union")}
								className={`px-2 py-1 rounded text-sm ${
									selectedPrimitive.operation === "union"
										? "bg-blue-500 text-white"
										: "bg-gray-200 hover:bg-gray-300"
								}`}
							>
								Union
							</button>
							<button
								onClick={() => handleOperationChange("subtract")}
								className={`px-2 py-1 rounded text-sm ${
									selectedPrimitive.operation === "subtract"
										? "bg-blue-500 text-white"
										: "bg-gray-200 hover:bg-gray-300"
								}`}
							>
								Subtract
							</button>
							<button
								onClick={() => handleOperationChange("intersect")}
								className={`px-2 py-1 rounded text-sm ${
									selectedPrimitive.operation === "intersect"
										? "bg-blue-500 text-white"
										: "bg-gray-200 hover:bg-gray-300"
								}`}
							>
								Intersect
							</button>
						</div>
					</div>

					<div>
						<h3 className="font-semibold text-gray-700 mb-2">Position</h3>
						<div className="space-y-2">
							{["x", "y", "z"].map((axis, idx) => (
								<div key={axis} className="flex items-center gap-2">
									<label className="text-sm font-medium w-4">
										{axis.toUpperCase()}
									</label>
									<input
										type="number"
										step="0.1"
										value={selectedPrimitive.position[idx]}
										onChange={(e) => handlePositionChange(axis, e.target.value)}
										className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
									/>
								</div>
							))}
						</div>
					</div>

					<div>
						<h3 className="font-semibold text-gray-700 mb-2">Scale</h3>
						<div className="space-y-2">
							{["x", "y", "z"].map((axis, idx) => (
								<div key={axis} className="flex items-center gap-2">
									<label className="text-sm font-medium w-4">
										{axis.toUpperCase()}
									</label>
									<input
										type="number"
										step="0.1"
										min="0.1"
										value={selectedPrimitive.scale[idx]}
										onChange={(e) => handleScaleChange(axis, e.target.value)}
										className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
									/>
								</div>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}

export default ControlPanel;
