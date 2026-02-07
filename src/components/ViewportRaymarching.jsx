import { useMemo } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Bounds } from "@react-three/drei";
import useStore from "../stores/useStore";
import { createLoftGeometry } from "../utils/nurbsLoft";

function LimbMesh() {
	const slices = useStore((state) => state.slices);

	const geometry = useMemo(
		() => createLoftGeometry(slices),
		[slices],
	);

	if (!geometry) return null;

	return (
		<mesh geometry={geometry}>
			<meshStandardMaterial
				color="#f97316"
				side={THREE.DoubleSide}
				transparent
				opacity={0.85}
			/>
		</mesh>
	);
}

function Scene() {
	return (
		<>
			<Bounds fit clip observe margin={1.5}>
				<LimbMesh />
			</Bounds>

			<Grid
				args={[500, 500]}
				cellSize={10}
				sectionSize={50}
				cellColor="#374151"
				sectionColor="#4b5563"
				fadeDistance={500}
			/>
			<ambientLight intensity={0.4} />
			<directionalLight position={[100, 200, 100]} intensity={0.8} />
			<pointLight position={[-100, 150, -100]} intensity={0.4} />
			<OrbitControls
				makeDefault
				rotateSpeed={0.5}
				enableDamping
				dampingFactor={0.05}
			/>
		</>
	);
}

function ViewportRaymarching() {
	return (
		<div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
			<Canvas camera={{ position: [150, 250, 150], fov: 50 }}>
				<Scene />
			</Canvas>
		</div>
	);
}

export default ViewportRaymarching;
