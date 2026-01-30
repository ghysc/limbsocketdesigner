function Header() {
	return (
		<header className="bg-gray-900 text-white shadow-lg px-8 py-6">
			<h1 className="text-3xl font-bold tracking-tight">
				Limb Prosthetic Socket Designer, made by Cyril Ghys
				(cyril.ghys@gmail.com)
			</h1>
			<div className="text-sm text-gray-300 mt-2 flex gap-5">
				<p>1. Draw the limb profile using the grid editors.</p>
				<p>
					2. In the control panel on the right, choose your visibility settings.
				</p>
				<p>3. Generate the socket.</p>
				<p>
					4. After each change (thickness or boolean operation), regenerate the
					socket.
				</p>
			</div>
			<div className="text-sm text-gray-300 mt-2">
				<strong>Note:</strong> This prototype runs on CPU only. Generating
				smooth limb or socket meshes can take some time (up to a minute for
				complex shapes). Boolean operations are not rendered dynamically. Thank
				for your patience!
			</div>
		</header>
	);
}

export default Header;
