"use client";

import { buttonVariants } from "@grand-oral-finder/ui/components/button";
import { cn } from "@grand-oral-finder/ui/lib/utils";
import { FolderKeyIcon, GraduationCapIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "./mode-toggle";

const navigation = [
	{
		href: "/",
		label: "Rechercher",
		icon: SearchIcon,
		isActive: (pathname: string) => pathname === "/",
	},
	{
		href: "/dashboard",
		label: "Mes déclarations",
		icon: FolderKeyIcon,
		isActive: (pathname: string) => pathname.startsWith("/dashboard"),
	},
] as const;

export default function Header() {
	const pathname = usePathname();

	return (
		<header className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur-lg">
			<div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
				<Link href="/" className="flex items-center gap-2 font-semibold">
					<span className="flex size-8 items-center justify-center rounded-lg border bg-secondary">
						<GraduationCapIcon className="size-4" />
					</span>
					<span>Grand Oral Finder</span>
				</Link>
				<nav
					className="ml-auto flex items-center gap-1"
					aria-label="Navigation principale"
				>
					{navigation.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							aria-label={item.label}
							className={cn(
								buttonVariants({
									variant: item.isActive(pathname) ? "secondary" : "ghost",
								}),
								"max-sm:size-8 max-sm:px-0",
							)}
						>
							<item.icon />
							<span className="hidden sm:inline">{item.label}</span>
						</Link>
					))}
					<ModeToggle />
				</nav>
			</div>
		</header>
	);
}
