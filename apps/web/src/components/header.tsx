"use client";

import { Button } from "@grand-oral-finder/ui/components/button";
import { FolderKeyIcon, GraduationCapIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur-lg">
			<div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
				<Link href="/" className="flex items-center gap-2 font-semibold">
					<span className="flex size-8 items-center justify-center rounded-md border bg-secondary">
						<GraduationCapIcon className="size-4" />
					</span>
					<span>Grand Oral Finder</span>
				</Link>
				<nav
					className="ml-auto flex items-center gap-1"
					aria-label="Navigation principale"
				>
					<Button
						render={<Link href="/" />}
						variant={pathname === "/" ? "secondary" : "ghost"}
						className="size-8 rounded-md px-0 sm:h-8 sm:w-auto sm:px-2.5"
						aria-label="Rechercher"
					>
						<SearchIcon />
						<span className="hidden sm:inline">Rechercher</span>
					</Button>
					<Button
						render={<Link href="/dashboard" />}
						variant={pathname.startsWith("/dashboard") ? "secondary" : "ghost"}
						className="size-8 rounded-md px-0 sm:h-8 sm:w-auto sm:px-2.5"
						aria-label="Mes déclarations"
					>
						<FolderKeyIcon />
						<span className="hidden sm:inline">Mes déclarations</span>
					</Button>
				</nav>
				<ModeToggle />
			</div>
		</header>
	);
}
