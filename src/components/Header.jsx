function Header() {
	return (
		<header className="bg-gray-900 text-white shadow-lg px-8 py-6">
			<h1 className="text-3xl font-bold tracking-tight">
				Limb Prosthetic Socket Designer
			</h1>
			<div className="text-sm text-gray-300 mt-2 flex gap-5">
				<p>1. Draw the lofted limb using the grid editors</p>
				<p>
					1.5 Now in the control panel (to the right), choose the visibility you
					want
				</p>
				<p>2. Generate the socket</p>
				<p>
					3. For each edit you do (thickness or boolean operation), please
					regenerate the socket
				</p>
			</div>
			<div className="text-sm text-gray-300 mt-2 flex gap-5">
				Note. As I'm using only CPU for this quick prototype, generating smooth
				limb or socket meshes may take some time (up to a minute for complex
				shapes). Thanks for your patience!
			</div>
		</header>
	);
}

export default Header;
