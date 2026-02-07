import { useRef, useCallback } from "react";
import useStore from "../stores/useStore";
import { evaluateClosedBSpline } from "../utils/nurbsLoft";

const EDITOR_SIZE = 200; // px
const PADDING = 20; // px

function SplineEditor({ slice }) {
	const setControlPointRadius = useStore(
		(state) => state.setControlPointRadius,
	);
	const clearSlice = useStore((state) => state.clearSlice);
	const svgRef = useRef(null);
	const draggingRef = useRef(null);

	// Find max radius for scaling
	const maxRadius = Math.max(...slice.controlPoints.map((cp) => cp.radius));
	const scale = (EDITOR_SIZE / 2 - PADDING) / Math.max(maxRadius * 1.3, 1);

	const toSVG = useCallback(
		(angle, radius) => {
			const rad = (angle * Math.PI) / 180;
			const cx = EDITOR_SIZE / 2;
			const cy = EDITOR_SIZE / 2;
			return {
				x: cx + Math.cos(rad) * radius * scale,
				y: cy - Math.sin(rad) * radius * scale, // SVG Y is inverted
			};
		},
		[scale],
	);

	const fromSVG = useCallback(
		(svgX, svgY) => {
			const cx = EDITOR_SIZE / 2;
			const cy = EDITOR_SIZE / 2;
			const dx = svgX - cx;
			const dy = -(svgY - cy); // SVG Y is inverted
			return Math.sqrt(dx * dx + dy * dy) / scale;
		},
		[scale],
	);

	// Evaluate the B-spline curve for display
	const curvePoints = evaluateClosedBSpline(slice.controlPoints, 128);
	const curvePath = curvePoints
		.map((p, i) => {
			const svg = toSVG(
				(Math.atan2(p.z, p.x) * 180) / Math.PI,
				Math.sqrt(p.x * p.x + p.z * p.z),
			);
			return `${i === 0 ? "M" : "L"} ${svg.x} ${svg.y}`;
		})
		.join(" ");

	const handleMouseDown = (e, pointIndex) => {
		e.preventDefault();
		draggingRef.current = pointIndex;
	};

	const handleMouseMove = useCallback(
		(e) => {
			if (draggingRef.current === null) return;
			const svg = svgRef.current;
			if (!svg) return;

			const rect = svg.getBoundingClientRect();
			const svgX = ((e.clientX - rect.left) / rect.width) * EDITOR_SIZE;
			const svgY = ((e.clientY - rect.top) / rect.height) * EDITOR_SIZE;
			const radius = Math.max(1, fromSVG(svgX, svgY));

			setControlPointRadius(slice.id, draggingRef.current, radius);
		},
		[slice.id, fromSVG, setControlPointRadius],
	);

	const handleMouseUp = useCallback(() => {
		draggingRef.current = null;
	}, []);

	return (
		<div className="flex flex-col">
			<div className="bg-gray-700 rounded-t-lg px-2 py-1 flex justify-between items-center">
				<div>
					<h3 className="font-semibold text-white text-sm">{slice.label}</h3>
					<span className="text-xs text-gray-400">
						Height: {Math.round(slice.heightMM)}mm
					</span>
				</div>
				<button
					onClick={() => clearSlice(slice.id)}
					className="text-xs px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded"
				>
					Reset
				</button>
			</div>
			<div className="flex justify-center items-center bg-gray-800 p-2">
				<svg
					ref={svgRef}
					width={EDITOR_SIZE}
					height={EDITOR_SIZE}
					className="cursor-crosshair"
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onMouseLeave={handleMouseUp}
				>
					{/* Grid circles */}
					{[0.25, 0.5, 0.75, 1.0].map((frac) => (
						<circle
							key={frac}
							cx={EDITOR_SIZE / 2}
							cy={EDITOR_SIZE / 2}
							r={maxRadius * frac * scale}
							fill="none"
							stroke="#374151"
							strokeWidth="0.5"
						/>
					))}

					{/* Cross lines */}
					<line
						x1={EDITOR_SIZE / 2}
						y1={PADDING}
						x2={EDITOR_SIZE / 2}
						y2={EDITOR_SIZE - PADDING}
						stroke="#374151"
						strokeWidth="0.5"
					/>
					<line
						x1={PADDING}
						y1={EDITOR_SIZE / 2}
						x2={EDITOR_SIZE - PADDING}
						y2={EDITOR_SIZE / 2}
						stroke="#374151"
						strokeWidth="0.5"
					/>

					{/* B-spline curve */}
					<path
						d={`${curvePath} Z`}
						fill="rgba(249, 115, 22, 0.15)"
						stroke="#f97316"
						strokeWidth="2"
					/>

					{/* Control point handles */}
					{slice.controlPoints.map((cp, i) => {
						const pos = toSVG(cp.angle, cp.radius);
						return (
							<circle
								key={i}
								cx={pos.x}
								cy={pos.y}
								r={draggingRef.current === i ? 6 : 4}
								fill={draggingRef.current === i ? "#fb923c" : "#f97316"}
								stroke="white"
								strokeWidth="1.5"
								className="cursor-grab active:cursor-grabbing"
								onMouseDown={(e) => handleMouseDown(e, i)}
							/>
						);
					})}

					{/* Center dot */}
					<circle
						cx={EDITOR_SIZE / 2}
						cy={EDITOR_SIZE / 2}
						r="2"
						fill="#6b7280"
					/>
				</svg>
			</div>
		</div>
	);
}

export default SplineEditor;
