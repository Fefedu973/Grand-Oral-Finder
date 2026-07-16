"use client";

import { Button } from "@grand-oral-finder/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@grand-oral-finder/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@grand-oral-finder/ui/components/popover";
import { useQuery } from "@tanstack/react-query";
import {
	CheckIcon,
	ChevronsUpDownIcon,
	MapPinIcon,
	SchoolIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { orpc } from "@/utils/orpc";

export type SchoolOption = {
	uai: string;
	name: string;
	city: string;
	postalCode: string | null;
	academy: string | null;
	sector: string | null;
};

type SchoolComboboxProps = {
	value: SchoolOption | null;
	onChange: (school: SchoolOption) => void;
	invalid?: boolean;
};

export function SchoolCombobox({
	value,
	onChange,
	invalid,
}: SchoolComboboxProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState("");
	const normalizedQuery = query.trim();
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		const timeout = window.setTimeout(() => {
			setDebouncedQuery(normalizedQuery);
		}, 250);
		return () => window.clearTimeout(timeout);
	}, [normalizedQuery]);

	const schools = useQuery({
		...orpc.schools.search.queryOptions({
			input: { query: debouncedQuery || "--" },
		}),
		enabled: debouncedQuery.length >= 2,
		staleTime: 30 * 60 * 1000,
	});

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						className="h-10 w-full justify-between rounded-md px-3 text-left font-normal text-sm"
						aria-invalid={invalid}
					/>
				}
			>
				<span className="min-w-0 truncate">
					{value
						? `${value.name} · ${value.city}`
						: "Rechercher un lycée ou une ville"}
				</span>
				<ChevronsUpDownIcon className="text-muted-foreground" />
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-[min(34rem,calc(100vw-2rem))] rounded-md p-0"
			>
				<Command shouldFilter={false}>
					<CommandInput
						value={query}
						onValueChange={setQuery}
						placeholder="Nom, ville ou code postal"
					/>
					<CommandList className="max-h-80">
						{normalizedQuery.length < 2 ? (
							<div className="px-3 py-8 text-center text-muted-foreground">
								Saisissez au moins deux caractères.
							</div>
						) : schools.isLoading || debouncedQuery !== normalizedQuery ? (
							<div className="px-3 py-8 text-center text-muted-foreground">
								Recherche dans l’annuaire national…
							</div>
						) : schools.isError ? (
							<div className="px-3 py-8 text-center text-destructive">
								L’annuaire est momentanément indisponible. Réessayez dans un
								instant.
							</div>
						) : (
							<CommandEmpty>Aucun lycée trouvé.</CommandEmpty>
						)}
						{schools.data?.map((school) => (
							<CommandItem
								key={school.uai}
								value={school.uai}
								onSelect={() => {
									onChange(school);
									setOpen(false);
								}}
								className="items-start rounded-sm py-3"
							>
								<SchoolIcon className="mt-0.5 text-muted-foreground" />
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium">
										{school.name}
									</span>
									<span className="mt-0.5 flex items-center gap-1 text-muted-foreground">
										<MapPinIcon className="size-3" />
										{school.city}
										{school.postalCode ? ` · ${school.postalCode}` : ""}
										{school.sector ? ` · ${school.sector}` : ""}
									</span>
								</span>
								{value?.uai === school.uai ? (
									<CheckIcon className="mt-0.5" />
								) : null}
							</CommandItem>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
