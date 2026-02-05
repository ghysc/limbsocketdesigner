import { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import useStore from "../stores/useStore";
import vertexShader from "../shaders/raymarching/vertex.glsl?raw";
import fragmentShader from "../shaders/raymarching/fragment.glsl?raw";

const BOX_SIZE = [1, 1, 1];

const voxelData = new Uint8Array(20 * 20 * 4);
const voxelTexture = new THREE.Data3DTexture(voxelData, 20, 20, 4);
voxelTexture.format = THREE.RedFormat;
voxelTexture.type = THREE.UnsignedByteType;
voxelTexture.minFilter = THREE.LinearFilter;
voxelTexture.magFilter = THREE.LinearFilter;
voxelTexture.wrapS = THREE.ClampToEdgeWrapping;
voxelTexture.wrapT = THREE.ClampToEdgeWrapping;
voxelTexture.wrapR = THREE.ClampToEdgeWrapping;

function RaymarchBox() {
	const materialRef = useRef();
	const slices = useStore((state) => state.slices);

	useEffect(() => {
		const sortedSlices = [...slices].sort((a, b) => a.height - b.height);
		sortedSlices.forEach((slice, z) => {
			slice.grid.forEach((row, y) => {
				row.forEach((cell, x) => {
					voxelData[z * 20 * 20 + y * 20 + x] = cell ? 255 : 0;
				});
			});
		});
		voxelTexture.needsUpdate = true;
	}, [slices]);

	const uniforms = useMemo(
		() => ({
			uVoxelData: { value: voxelTexture },
			uBoxSize: { value: new THREE.Vector3(...BOX_SIZE) },
		}),
		[],
	);

	return (
		<mesh>
			<boxGeometry args={BOX_SIZE} />
			<shaderMaterial
				ref={materialRef}
				glslVersion={THREE.GLSL3}
				vertexShader={vertexShader}
				fragmentShader={fragmentShader}
				uniforms={uniforms}
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
