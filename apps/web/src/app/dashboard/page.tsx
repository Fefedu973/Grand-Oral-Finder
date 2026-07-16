import Dashboard from "./dashboard";

export default function DashboardPage() {
	return (
		<main className="mx-auto min-h-[calc(100svh-7rem)] w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
			<div className="max-w-2xl">
				<p className="font-medium text-muted-foreground text-xs uppercase">
					Accès local
				</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Mes déclarations
				</h1>
				<p className="mt-3 text-muted-foreground text-sm leading-6">
					Les clés enregistrées dans ce navigateur donnent accès à vos
					déclarations, sans compte ni email.
				</p>
			</div>
			<Dashboard />
		</main>
	);
}
