import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import vertexShader from "../shaders/raymarching/vertex.glsl?raw";
import fragmentShader from "../shaders/raymarching/fragment.glsl?raw";

function RaymarchBox() {
	const materialRef = useRef();
	const { camera } = useThree();

	useFrame(() => {
		if (materialRef.current) {
			materialRef.current.uniforms.uCameraPosition.value.copy(camera.position);
		}
	});

	return (
		<mesh>
			<boxGeometry args={[1, 1, 1]} />
			<shaderMaterial
				ref={materialRef}
				vertexShader={vertexShader}
				fragmentShader={fragmentShader}
				uniforms={{ uCameraPosition: { value: camera.position.clone() } }}
			/>
		</mesh>
	);
}

function Scene() {
	return (
		<>
			<RaymarchBox />

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

function ViewportRaymarching() {
	return (
		<div className="w-full h-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
			<Canvas camera={{ position: [20, 40, 20], fov: 50 }}>
				<Scene />
			</Canvas>
		</div>
	);
}

export default ViewportRaymarching;
