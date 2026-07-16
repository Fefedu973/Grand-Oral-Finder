"use client";

import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@grand-oral-finder/ui/components/combobox";
import { Spinner } from "@grand-oral-finder/ui/components/spinner";
import { useQuery } from "@tanstack/react-query";
import { MapPinIcon, SchoolIcon } from "lucide-react";
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
	onChange: (school: SchoolOption | null) => void;
	invalid?: boolean;
};

export function SchoolCombobox({
	value,
	onChange,
	invalid,
}: SchoolComboboxProps) {
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

	const searching = schools.isLoading || debouncedQuery !== normalizedQuery;

	return (
		<Combobox
			items={schools.data ?? []}
			value={value}
			onValueChange={(school) => onChange(school ?? null)}
			filter={null}
			itemToStringLabel={(school) =>
				school ? `${school.name} · ${school.city}` : ""
			}
			isItemEqualToValue={(a, b) => a?.uai === b?.uai}
			onInputValueChange={(nextValue, details) => {
				if (details.reason === "item-press") return;
				setQuery(nextValue);
			}}
		>
			<ComboboxInput
				placeholder="Rechercher un lycée ou une ville"
				aria-invalid={invalid}
				showClear
			/>
			<ComboboxContent>
				{normalizedQuery.length < 2 ? (
					<div className="px-3 py-8 text-center text-muted-foreground text-sm">
						Saisissez au moins deux caractères.
					</div>
				) : searching ? (
					<div className="flex items-center justify-center gap-2 px-3 py-8 text-muted-foreground text-sm">
						<Spinner />
						Recherche dans l’annuaire national…
					</div>
				) : schools.isError ? (
					<div className="px-3 py-8 text-center text-destructive text-sm">
						L’annuaire est momentanément indisponible. Réessayez dans un
						instant.
					</div>
				) : (
					<ComboboxEmpty>Aucun lycée trouvé.</ComboboxEmpty>
				)}
				<ComboboxList>
					{(school: SchoolOption) => (
						<ComboboxItem
							key={school.uai}
							value={school}
							className="items-start py-2"
						>
							<SchoolIcon className="mt-0.5 text-muted-foreground" />
							<span className="flex min-w-0 flex-1 flex-col">
								<span className="truncate font-medium">{school.name}</span>
								<span className="flex items-center gap-1 text-muted-foreground text-xs">
									<MapPinIcon className="size-3" />
									{school.city}
									{school.postalCode ? ` · ${school.postalCode}` : ""}
									{school.sector ? ` · ${school.sector}` : ""}
								</span>
							</span>
						</ComboboxItem>
					)}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
