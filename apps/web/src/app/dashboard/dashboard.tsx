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
import {
	Button,
	buttonVariants,
} from "@grand-oral-finder/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@grand-oral-finder/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@grand-oral-finder/ui/components/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@grand-oral-finder/ui/components/drawer";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@grand-oral-finder/ui/components/empty";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@grand-oral-finder/ui/components/input-group";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@grand-oral-finder/ui/components/item";
import { Skeleton } from "@grand-oral-finder/ui/components/skeleton";
import { Spinner } from "@grand-oral-finder/ui/components/spinner";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@grand-oral-finder/ui/components/tooltip";
import { useMediaQuery } from "@grand-oral-finder/ui/hooks/use-media-query";
import { useQuery } from "@tanstack/react-query";
import {
	CalendarClockIcon,
	Edit3Icon,
	KeyRoundIcon,
	PlusIcon,
	Trash2Icon,
	TrendingUpIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
	type ContributionDraft,
	ContributionForm,
} from "@/components/contribution-form";
import { CopyButton } from "@/components/copy-button";
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
			<div className="mt-10 flex flex-col gap-3">
				<Skeleton className="h-28 w-full" />
				<Skeleton className="h-32 w-full" />
			</div>
		);
	}

	return (
		<>
			<Card className="mt-8">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<KeyRoundIcon className="size-4" />
						Importer une déclaration
					</CardTitle>
					<CardDescription>
						Utilisez la clé privée affichée lors de l’enregistrement pour
						retrouver une déclaration sur cet appareil.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={importDeclaration}>
						<InputGroup className="sm:max-w-md">
							<InputGroupInput
								value={importKey}
								onChange={(event) => setImportKey(event.target.value)}
								placeholder="GOF-XXXX-XXXX-…"
								className="font-mono text-xs uppercase"
								autoComplete="off"
								spellCheck={false}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupButton
									type="submit"
									variant="secondary"
									disabled={importing || !importKey.trim()}
								>
									{importing ? <Spinner data-icon="inline-start" /> : null}
									{importing ? "Import…" : "Importer"}
								</InputGroupButton>
							</InputGroupAddon>
						</InputGroup>
					</form>
				</CardContent>
			</Card>

			{submissions.data?.length ? (
				<ItemGroup className="mt-6 gap-3">
					{submissions.data.map((row) => (
						<Item key={row.id} variant="outline" className="p-4">
							<ItemContent>
								<ItemTitle className="flex-wrap">
									{row.schoolName}
									<Badge variant="secondary">{row.examYear}</Badge>
									<Badge variant="outline" className="font-mono">
										{row.commissionCode}
									</Badge>
								</ItemTitle>
								<ItemDescription>
									{row.schoolCity} ·{" "}
									{row.track === "general" ? "Voie générale" : row.series}
								</ItemDescription>
								<p className="mt-2 text-sm">
									{row.subjectOne}{" "}
									<span className="text-muted-foreground">/</span>{" "}
									{row.subjectTwo}
								</p>
								<p className="mt-1 text-muted-foreground text-xs">
									Passage le{" "}
									{new Intl.DateTimeFormat("fr-FR", {
										dateStyle: "long",
										timeStyle: "short",
									}).format(new Date(row.examAt))}
									{" · "}version {row.version}
								</p>
							</ItemContent>
							<ItemActions className="self-start">
								<Tooltip>
									<TooltipTrigger
										render={
											<CopyButton
												value={row.accessKey}
												variant="ghost"
												size="icon"
												label="Copier la clé de récupération"
											/>
										}
									/>
									<TooltipContent>Copier la clé de récupération</TooltipContent>
								</Tooltip>
								<Link
									href={{ pathname: "/resultat", query: { id: row.id } }}
									className={buttonVariants({ variant: "outline" })}
								>
									<TrendingUpIcon data-icon="inline-start" />
									Résultat
								</Link>
								<Button variant="outline" onClick={() => setEditing(row)}>
									<Edit3Icon data-icon="inline-start" />
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
							</ItemActions>
						</Item>
					))}
				</ItemGroup>
			) : (
				<Empty className="mt-6 border border-dashed">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<CalendarClockIcon />
						</EmptyMedia>
						<EmptyTitle>Aucune déclaration sur cet appareil</EmptyTitle>
						<EmptyDescription>
							Lancez une recherche puis enregistrez-la, ou importez une clé de
							récupération existante.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Link href="/" className={buttonVariants()}>
							<PlusIcon data-icon="inline-start" />
							Créer une déclaration
						</Link>
					</EmptyContent>
				</Empty>
			)}

			<EditDeclarationDialog
				editing={editing}
				onOpenChange={(open) => !open && setEditing(null)}
				onSaved={async () => {
					setEditing(null);
					await refresh();
				}}
			/>
		</>
	);
}

function EditDeclarationDialog({
	editing,
	onOpenChange,
	onSaved,
}: {
	editing: SubmissionRow | null;
	onOpenChange: (open: boolean) => void;
	onSaved: () => Promise<void>;
}) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const form = editing ? (
		<ContributionForm
			key={editing.id}
			mode="save"
			initial={toDraft(editing)}
			onSaved={onSaved}
		/>
	) : null;

	if (isDesktop) {
		return (
			<Dialog open={Boolean(editing)} onOpenChange={onOpenChange}>
				<DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-4xl">
					<DialogHeader>
						<DialogTitle>Modifier la déclaration</DialogTitle>
						<DialogDescription>
							L’enregistrement remplace la version précédente sans créer de
							doublon.
						</DialogDescription>
					</DialogHeader>
					{form}
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={Boolean(editing)} onOpenChange={onOpenChange}>
			<DrawerContent className="max-h-[calc(100dvh-1rem)]">
				<DrawerHeader className="text-left">
					<DrawerTitle>Modifier la déclaration</DrawerTitle>
					<DrawerDescription>
						L’enregistrement remplace la version précédente sans créer de
						doublon.
					</DrawerDescription>
				</DrawerHeader>
				<div className="flex-1 overflow-y-auto p-4">{form}</div>
			</DrawerContent>
		</Drawer>
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
	const isDesktop = useMediaQuery("(min-width: 768px)");

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

	if (isDesktop) {
		return (
			<AlertDialog open={open} onOpenChange={setOpen}>
				<AlertDialogTrigger render={<Button variant="ghost" size="icon" />}>
					<Trash2Icon />
					<span className="sr-only">Supprimer la déclaration</span>
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer cette déclaration ?</AlertDialogTitle>
						<AlertDialogDescription>
							Elle ne sera plus comptabilisée dans les estimations. Cette action
							est définitive.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<Button variant="outline" onClick={() => setOpen(false)}>
							Annuler
						</Button>
						<Button variant="destructive" onClick={remove} disabled={deleting}>
							{deleting ? <Spinner data-icon="inline-start" /> : null}
							{deleting ? "Suppression…" : "Supprimer"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen} disablePointerDismissal>
			<DrawerTrigger render={<Button variant="ghost" size="icon" />}>
				<Trash2Icon />
				<span className="sr-only">Supprimer la déclaration</span>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader className="text-left">
					<DrawerTitle>Supprimer cette déclaration ?</DrawerTitle>
					<DrawerDescription>
						Elle ne sera plus comptabilisée dans les estimations. Cette action
						est définitive.
					</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter className="pt-2">
					<Button variant="destructive" onClick={remove} disabled={deleting}>
						{deleting ? <Spinner data-icon="inline-start" /> : null}
						{deleting ? "Suppression…" : "Supprimer"}
					</Button>
					<DrawerClose render={<Button variant="outline" />}>
						Annuler
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
