import Header from "./components/Header";
import GridEditor from "./components/GridEditor";
import Viewport3D from "./components/Viewport3D";
import ControlPanel from "./components/ControlPanel";

function App() {
	return (
		<div className="h-screen bg-gray-800 flex flex-col overflow-hidden">
			<Header />

			<main className="flex-1  p-4 overflow-hidden">
				<div className="grid grid-cols-12 gap-4 h-full">
					{/* Left column: Grid editors */}
					<div className="col-span-3 flex flex-col gap-4">
						<GridEditor title="Front View" gridType="front" />
						<GridEditor title="Side View" gridType="side" />
					</div>

					{/* Center column: 3D Viewport */}
					<div className="col-span-7">
						<Viewport3D />
					</div>

					{/* Right column: Control Panel */}
					<div className="col-span-2">
						<ControlPanel />
					</div>
				</div>
			</main>
		</div>
	);
}

export default App;
