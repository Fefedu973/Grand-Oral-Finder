"use client";

import { Button } from "@grand-oral-finder/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@grand-oral-finder/ui/components/dropdown-menu";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export function ModeToggle() {
	const { setTheme } = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
				<SunIcon className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
				<MoonIcon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
				<span className="sr-only">Changer de thème</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuGroup>
					<DropdownMenuItem onClick={() => setTheme("light")}>
						<SunIcon />
						Clair
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("dark")}>
						<MoonIcon />
						Sombre
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme("system")}>
						<MonitorIcon />
						Système
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
