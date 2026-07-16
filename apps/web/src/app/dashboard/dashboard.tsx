"use client";

import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@grand-oral-finder/ui/components/alert-dialog";
import { Badge } from "@grand-oral-finder/ui/components/badge";
import { Button } from "@grand-oral-finder/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@grand-oral-finder/ui/components/dialog";
import { Input } from "@grand-oral-finder/ui/components/input";
import { Skeleton } from "@grand-oral-finder/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	CalendarClockIcon,
	CopyIcon,
	Edit3Icon,
	KeyRoundIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	type ContributionDraft,
	ContributionForm,
} from "@/components/contribution-form";
import {
	addSubmissionAccessKey,
	formatSubmissionAccessKey,
	isSubmissionAccessKey,
	readSubmissionAccessKeys,
	removeSubmissionAccessKey,
} from "@/lib/submission-access";
import { client, orpc } from "@/utils/orpc";

type SubmissionRow = Awaited<
	ReturnType<typeof client.submissions.owned>
>[number];

function toDraft(row: SubmissionRow): ContributionDraft {
	return {
		accessKey: row.accessKey,
		school: {
			uai: row.schoolUai,
			name: row.schoolName,
			city: row.schoolCity,
			postalCode: row.schoolPostalCode,
			academy: row.schoolAcademy,
			sector: row.schoolSector,
		},
		examYear: row.examYear,
		track: row.track as "general" | "technological",
		series: row.series,
		commissionCode: row.commissionCode,
		codeSource: row.codeSource as "official" | "shared",
		examDay: row.examDay,
		examAt: row.examAt,
		subjectOne: row.subjectOne,
		subjectTwo: row.subjectTwo,
	};
}

export default function Dashboard() {
	const [accessKeys, setAccessKeys] = useState<string[] | null>(null);
	const [editing, setEditing] = useState<SubmissionRow | null>(null);
	const [importKey, setImportKey] = useState("");
	const [importing, setImporting] = useState(false);

	useEffect(() => {
		setAccessKeys(readSubmissionAccessKeys());
	}, []);

	const submissions = useQuery({
		...orpc.submissions.owned.queryOptions({
			input: { accessKeys: accessKeys ?? [] },
		}),
		enabled: accessKeys !== null,
	});

	async function refresh() {
		await submissions.refetch();
	}

	async function importDeclaration(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (!isSubmissionAccessKey(importKey)) {
			toast.error("Cette clé de récupération n’est pas valide.");
			return;
		}

		setImporting(true);
		try {
			const formatted = formatSubmissionAccessKey(importKey);
			const rows = await client.submissions.owned({ accessKeys: [formatted] });
			if (rows.length === 0) {
				toast.error("Aucune déclaration ne correspond à cette clé.");
				return;
			}
			const stored = addSubmissionAccessKey(formatted);
			if (!stored) {
				toast.error(
					"Le navigateur bloque le stockage local. La clé n’a pas pu être conservée sur cet appareil.",
				);
				return;
			}
			setAccessKeys(readSubmissionAccessKeys());
			setImportKey("");
			toast.success("Déclaration ajoutée à cet appareil.");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Import impossible.",
			);
		} finally {
			setImporting(false);
		}
	}

	if (accessKeys === null || submissions.isLoading) {
		return (
			<div className="mt-10 grid gap-3">
				<Skeleton className="h-24 w-full rounded-md" />
				<Skeleton className="h-32 w-full rounded-md" />
			</div>
		);
	}

	return (
		<>
			<section className="mt-8 grid gap-4 border-y py-5 md:grid-cols-[1fr_minmax(20rem,28rem)] md:items-center">
				<div>
					<div className="flex items-center gap-2 font-medium text-sm">
						<KeyRoundIcon className="size-4" />
						Importer une déclaration
					</div>
					<p className="mt-1 text-muted-foreground text-xs leading-5">
						Utilisez la clé privée affichée lors de l’enregistrement pour
						retrouver une déclaration sur cet appareil.
					</p>
				</div>
				<form className="flex min-w-0 gap-2" onSubmit={importDeclaration}>
					<Input
						value={importKey}
						onChange={(event) => setImportKey(event.target.value)}
						placeholder="GOF-XXXX-XXXX-…"
						className="h-9 min-w-0 rounded-md font-mono text-xs uppercase"
						autoComplete="off"
						spellCheck={false}
					/>
					<Button
						type="submit"
						variant="outline"
						className="h-9 rounded-md"
						disabled={importing || !importKey.trim()}
					>
						{importing ? "Import…" : "Importer"}
					</Button>
				</form>
			</section>

			{submissions.data?.length ? (
				<div className="divide-y border-b">
					{submissions.data.map((row) => (
						<article
							key={row.id}
							className="grid gap-5 py-6 md:grid-cols-[1fr_auto] md:items-center"
						>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<h2 className="truncate font-semibold">{row.schoolName}</h2>
									<Badge variant="secondary" className="rounded-md">
										{row.examYear}
									</Badge>
									<Badge variant="outline" className="rounded-md font-mono">
										{row.commissionCode}
									</Badge>
								</div>
								<p className="mt-1 text-muted-foreground text-sm">
									{row.schoolCity} ·{" "}
									{row.track === "general" ? "Voie générale" : row.series}
								</p>
								<p className="mt-3 text-sm">
									{row.subjectOne}{" "}
									<span className="text-muted-foreground">/</span>{" "}
									{row.subjectTwo}
								</p>
								<p className="mt-2 text-muted-foreground text-xs">
									Passage le{" "}
									{new Intl.DateTimeFormat("fr-FR", {
										dateStyle: "long",
										timeStyle: "short",
									}).format(new Date(row.examAt))}
									{" · "}version {row.version}
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="rounded-md"
									onClick={async () => {
										await navigator.clipboard.writeText(row.accessKey);
										toast.success("Clé copiée.");
									}}
								>
									<CopyIcon />
									<span className="sr-only">Copier la clé de récupération</span>
								</Button>
								<Button
									variant="outline"
									className="rounded-md"
									onClick={() => setEditing(row)}
								>
									<Edit3Icon />
									Modifier
								</Button>
								<DeleteButton
									accessKey={row.accessKey}
									onDeleted={async () => {
										removeSubmissionAccessKey(row.accessKey);
										setAccessKeys(readSubmissionAccessKeys());
										await refresh();
									}}
								/>
							</div>
						</article>
					))}
				</div>
			) : (
				<section className="border-b py-14 text-center">
					<CalendarClockIcon className="mx-auto size-8 text-muted-foreground" />
					<h2 className="mt-5 font-semibold text-lg">
						Aucune déclaration sur cet appareil
					</h2>
					<p className="mx-auto mt-2 max-w-md text-muted-foreground text-sm leading-6">
						Lancez une recherche puis enregistrez-la, ou importez une clé de
						récupération existante.
					</p>
					<Button render={<Link href="/" />} className="mt-6 rounded-md">
						<PlusIcon />
						Créer une déclaration
					</Button>
				</section>
			)}

			<Dialog
				open={Boolean(editing)}
				onOpenChange={(open) => !open && setEditing(null)}
			>
				<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto rounded-md sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>Modifier la déclaration</DialogTitle>
						<DialogDescription>
							L’enregistrement remplace la version précédente sans créer de
							doublon.
						</DialogDescription>
					</DialogHeader>
					{editing ? (
						<ContributionForm
							key={editing.id}
							mode="save"
							initial={toDraft(editing)}
							onSaved={async () => {
								setEditing(null);
								await refresh();
							}}
						/>
					) : null}
				</DialogContent>
			</Dialog>
		</>
	);
}

function DeleteButton({
	accessKey,
	onDeleted,
}: {
	accessKey: string;
	onDeleted: () => Promise<void>;
}) {
	const [open, setOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);

	async function remove() {
		setDeleting(true);
		try {
			await client.submissions.remove({ accessKey });
			await onDeleted();
			setOpen(false);
			toast.success("Déclaration supprimée.");
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Suppression impossible.",
			);
		} finally {
			setDeleting(false);
		}
	}

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger
				render={<Button variant="ghost" size="icon" className="rounded-md" />}
			>
				<Trash2Icon />
				<span className="sr-only">Supprimer la déclaration</span>
			</AlertDialogTrigger>
			<AlertDialogContent className="rounded-md">
				<AlertDialogHeader>
					<AlertDialogTitle>Supprimer cette déclaration ?</AlertDialogTitle>
					<AlertDialogDescription>
						Elle ne sera plus comptabilisée dans les estimations. Cette action
						est définitive.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<Button
						variant="outline"
						className="rounded-md"
						onClick={() => setOpen(false)}
					>
						Annuler
					</Button>
					<Button
						variant="destructive"
						className="rounded-md"
						onClick={remove}
						disabled={deleting}
					>
						{deleting ? "Suppression…" : "Supprimer"}
					</Button>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
