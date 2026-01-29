import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, TransformControls } from "@react-three/drei";
import * as THREE from "three";
import useStore from "../stores/useStore";
import {
	generateLimbGeometry,
	generateLimbGeometrySmooth,
} from "../utils/limbGeometry";

function Primitive({ primitive, isSelected }) {
	const meshRef = useRef();
	const updatePrimitive = useStore((state) => state.updatePrimitive);
	const setSelectedPrimitive = useStore((state) => state.setSelectedPrimitive);
	const [transformMode, setTransformMode] = useState("translate");

	useEffect(() => {
		const handleKeyDown = (e) => {
			if (!isSelected) return;
			if (e.key === "g" || e.key === "G") setTransformMode("translate");
			if (e.key === "s" || e.key === "S") setTransformMode("scale");
			if (e.key === "r" || e.key === "R") setTransformMode("rotate");
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isSelected]);

	const handleTransform = () => {
		if (meshRef.current) {
			updatePrimitive(primitive.id, {
				position: meshRef.current.position.toArray(),
				scale: meshRef.current.scale.toArray(),
			});
		}
	};

	return (
		<>
			<mesh
				ref={meshRef}
				position={primitive.position}
				scale={primitive.scale}
				onClick={(e) => {
					e.stopPropagation();
					setSelectedPrimitive(primitive.id);
				}}
			>
				{primitive.type === "sphere" && <sphereGeometry args={[0.5, 32, 32]} />}
				{primitive.type === "cube" && <boxGeometry args={[1, 1, 1]} />}
				{primitive.type === "cylinder" && (
					<cylinderGeometry args={[0.5, 0.5, 1, 32]} />
				)}
				<meshStandardMaterial
					color={isSelected ? "#fbbf24" : "#10b981"}
					transparent
					opacity={0.7}
					wireframe={primitive.operation === "subtract"}
				/>
			</mesh>
			{isSelected && (
				<TransformControls
					object={meshRef}
					mode={transformMode}
					onObjectChange={handleTransform}
				/>
			)}
		</>
	);
}

function LimbMesh() {
	const slices = useStore((state) => state.slices);
	const limbVisibility = useStore((state) => state.limbVisibility);
	const inflation = useStore((state) => state.inflation) || 0;

	// Compute geometry directly (useMemo pattern for expensive computations)
	const geometry = useMemo(() => {
		try {
			if (limbVisibility === "none") {
				return null;
			}

			if (limbVisibility === "smooth") {
				return generateLimbGeometrySmooth(slices, 20, 1, inflation);
			}

			// Default: voxel mode
			return generateLimbGeometry(slices, 20, 1);
		} catch (error) {
			console.error("Error generating limb geometry:", error);
			return null;
		}
	}, [slices, limbVisibility, inflation]);

	if (!geometry) return null;

	return (
		<mesh geometry={geometry}>
			<meshStandardMaterial
				color="#ef4444"
				transparent
				opacity={0.8}
				side={THREE.DoubleSide}
			/>
		</mesh>
	);
}

function Scene() {
	const finalMesh = useStore((state) => state.finalMesh);
	const generatedMesh = useStore((state) => state.generatedMesh);
	const primitives = useStore((state) => state.primitives);
	const selectedPrimitiveId = useStore((state) => state.selectedPrimitiveId);

	// Display final mesh if available, otherwise show generated mesh
	const displayMesh = finalMesh || generatedMesh;

	return (
		<>
			<ambientLight intensity={0.5} />
			<directionalLight position={[10, 10, 5]} intensity={1} />
			<pointLight position={[-10, -10, -5]} intensity={0.5} />

			{/* Limb mesh from grids */}
			<LimbMesh />

			{/* Main mesh */}
			{displayMesh && (
				<mesh geometry={displayMesh}>
					<meshStandardMaterial color="#3b82f6" />
				</mesh>
			)}

			{/* Primitives */}
			{primitives.map((primitive) => (
				<Primitive
					key={primitive.id}
					primitive={primitive}
					isSelected={primitive.id === selectedPrimitiveId}
				/>
			))}

			<Grid args={[20, 20]} cellColor="#6b7280" sectionColor="#3b82f6" />
			<OrbitControls
				makeDefault
				rotateSpeed={0.5}
				enableDamping
				dampingFactor={0.05}
			/>
		</>
	);
}

function Viewport3D() {
	const setSelectedPrimitive = useStore((state) => state.setSelectedPrimitive);

	return (
		<div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
			<Canvas
				camera={{ position: [20, 40, 20], fov: 50 }}
				onPointerMissed={() => setSelectedPrimitive(null)}
			>
				<Scene />
			</Canvas>
		</div>
	);
}

export default Viewport3D;
