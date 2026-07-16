"use client";

import {
	GENERAL_SPECIALTIES,
	TECHNOLOGICAL_SERIES,
} from "@grand-oral-finder/api/domain/grand-oral";
import { Badge } from "@grand-oral-finder/ui/components/badge";
import { Button } from "@grand-oral-finder/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@grand-oral-finder/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@grand-oral-finder/ui/components/field";
import { Input } from "@grand-oral-finder/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@grand-oral-finder/ui/components/select";
import { Separator } from "@grand-oral-finder/ui/components/separator";
import { useForm } from "@tanstack/react-form";
import {
	ArrowRightIcon,
	BarChart3Icon,
	CheckCircle2Icon,
	CopyIcon,
	InfoIcon,
	KeyRoundIcon,
	SaveIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
	addSubmissionAccessKey,
	getOrCreateDeviceToken,
} from "@/lib/submission-access";
import { client } from "@/utils/orpc";

import { SchoolCombobox, type SchoolOption } from "./school-combobox";

const now = new Date();
const defaultExamYear =
	now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();

const formSchema = z
	.object({
		schoolUai: z
			.string()
			.regex(/^\d{7}[A-Z]$/, "Sélectionnez le centre d’examen."),
		examYear: z
			.number()
			.int()
			.min(2021)
			.max(now.getFullYear() + 2),
		track: z.enum(["general", "technological"]),
		series: z.string(),
		commissionCode: z.string().trim().min(2, "Renseignez un code de groupe."),
		codeSource: z.enum(["official", "shared"]),
		examDate: z.string().min(1, "Renseignez la date de passage."),
		examTime: z.string().min(1, "Renseignez l’heure de passage."),
		subjectOne: z
			.string()
			.trim()
			.min(2, "Renseignez le premier sujet ou enseignement."),
		subjectTwo: z
			.string()
			.trim()
			.min(2, "Renseignez le second sujet ou enseignement."),
	})
	.refine((value) => value.subjectOne !== value.subjectTwo, {
		message: "Les deux sujets doivent être différents.",
		path: ["subjectTwo"],
	})
	.refine((value) => value.track === "general" || value.series.length > 0, {
		message: "Sélectionnez votre série.",
		path: ["series"],
	});

type Prediction = Awaited<
	ReturnType<typeof client.submissions.create>
>["prediction"];

export type ContributionDraft = {
	accessKey?: string;
	school: SchoolOption;
	examYear: number;
	track: "general" | "technological";
	series: string;
	commissionCode: string;
	codeSource: "official" | "shared";
	examDay?: string;
	examAt: string | Date;
	subjectOne: string;
	subjectTwo: string;
};

type ContributionFormProps = {
	initial?: ContributionDraft;
	mode?: "contribute" | "save";
	onSaved?: () => void;
};

function splitDate(value?: string | Date, examDay?: string) {
	const date = value ? new Date(value) : new Date();
	const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
	return {
		date: examDay ?? local.toISOString().slice(0, 10),
		time: local.toISOString().slice(11, 16),
	};
}

export function ContributionForm({
	initial,
	mode = "contribute",
	onSaved,
}: ContributionFormProps) {
	const initialDate = useMemo(
		() => splitDate(initial?.examAt, initial?.examDay),
		[initial?.examAt, initial?.examDay],
	);
	const [selectedSchool, setSelectedSchool] = useState<SchoolOption | null>(
		initial?.school ?? null,
	);
	const [prediction, setPrediction] = useState<Prediction | null>(null);
	const [saving, setSaving] = useState(false);
	const [currentAccessKey, setCurrentAccessKey] = useState(
		initial?.accessKey ?? null,
	);
	const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);

	const form = useForm({
		defaultValues: {
			schoolUai: initial?.school.uai ?? "",
			examYear: initial?.examYear ?? defaultExamYear,
			track: initial?.track ?? ("general" as const),
			series: initial?.series ?? "",
			commissionCode: initial?.commissionCode ?? "",
			codeSource: initial?.codeSource ?? ("official" as const),
			examDate: initialDate.date,
			examTime: initialDate.time,
			subjectOne: initial?.subjectOne ?? "",
			subjectTwo: initial?.subjectTwo ?? "",
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			const common = {
				schoolUai: value.schoolUai,
				examYear: value.examYear,
				track: value.track,
				series: value.track === "general" ? "" : value.series,
				commissionCode: value.commissionCode,
				codeSource: value.codeSource,
				examDay: value.examDate,
				subjectOne: value.subjectOne,
				subjectTwo: value.subjectTwo,
			};

			const data = {
				...common,
				examAt: new Date(
					`${value.examDate}T${value.examTime}:00`,
				).toISOString(),
			};

			setSaving(true);
			try {
				let result: { prediction: Prediction };
				if (currentAccessKey) {
					result = await client.submissions.update({
						accessKey: currentAccessKey,
						data,
					});
				} else {
					const created = await client.submissions.create({
						deviceToken: getOrCreateDeviceToken(),
						data,
					});
					const stored = addSubmissionAccessKey(created.accessKey);
					setCurrentAccessKey(created.accessKey);
					setRecoveryDialogOpen(true);
					if (!stored) {
						toast.warning(
							"Le navigateur n’a pas pu enregistrer la clé. Copiez-la avant de fermer le dialogue.",
						);
					}
					result = created;
				}
				setPrediction(result.prediction);
				toast.success(
					currentAccessKey
						? "Déclaration mise à jour."
						: "Déclaration enregistrée et ajoutée à l’estimation.",
				);
				if (mode === "save") onSaved?.();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Une erreur est survenue.",
				);
			} finally {
				setSaving(false);
			}
		},
	});

	async function copyAccessKey() {
		if (!currentAccessKey) return;
		await navigator.clipboard.writeText(currentAccessKey);
		toast.success("Clé copiée.");
	}

	return (
		<>
			<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
				<form
					className="min-w-0"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					<FieldGroup>
						<form.Field name="schoolUai">
							{(field) => {
								const invalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={invalid}>
										<FieldLabel>Centre d’examen</FieldLabel>
										<SchoolCombobox
											value={selectedSchool}
											invalid={invalid}
											onChange={(school) => {
												setSelectedSchool(school);
												field.handleChange(school.uai);
											}}
										/>
										<FieldDescription>
											Choisissez le centre indiqué sur votre convocation, pas
											forcément votre lycée d’origine.
										</FieldDescription>
										{invalid ? (
											<FieldError errors={field.state.meta.errors} />
										) : null}
									</Field>
								);
							}}
						</form.Field>

						<div className="grid gap-5 sm:grid-cols-2">
							<form.Field name="examYear">
								{(field) => (
									<Field>
										<FieldLabel>Session du bac</FieldLabel>
										<Select
											value={String(field.state.value)}
											onValueChange={(value) =>
												value && field.handleChange(Number(value))
											}
										>
											<SelectTrigger className="h-10 w-full rounded-md text-sm">
												<span>{field.state.value}</span>
											</SelectTrigger>
											<SelectContent className="rounded-md">
												{[
													defaultExamYear + 1,
													defaultExamYear,
													defaultExamYear - 1,
													defaultExamYear - 2,
												]
													.filter(
														(value, index, values) =>
															values.indexOf(value) === index,
													)
													.map((year) => (
														<SelectItem key={year} value={String(year)}>
															{year}
														</SelectItem>
													))}
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>

							<form.Field name="track">
								{(field) => (
									<Field>
										<FieldLabel>Voie</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={(value) => {
												if (value === "general" || value === "technological") {
													field.handleChange(value);
												}
											}}
										>
											<SelectTrigger className="h-10 w-full rounded-md text-sm">
												<span>
													{field.state.value === "general"
														? "Générale"
														: "Technologique"}
												</span>
											</SelectTrigger>
											<SelectContent className="rounded-md">
												<SelectItem value="general">Générale</SelectItem>
												<SelectItem value="technological">
													Technologique
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
						</div>

						<form.Subscribe selector={(state) => state.values.track}>
							{(track) =>
								track === "technological" ? (
									<form.Field name="series">
										{(field) => {
											const invalid =
												field.state.meta.isTouched && !field.state.meta.isValid;
											return (
												<Field data-invalid={invalid}>
													<FieldLabel>Série technologique</FieldLabel>
													<Select
														value={field.state.value}
														onValueChange={(value) =>
															value && field.handleChange(value)
														}
													>
														<SelectTrigger
															className="h-10 w-full rounded-md text-sm"
															aria-invalid={invalid}
														>
															<span>
																{field.state.value || "Sélectionner une série"}
															</span>
														</SelectTrigger>
														<SelectContent className="rounded-md">
															{TECHNOLOGICAL_SERIES.map((series) => (
																<SelectItem key={series} value={series}>
																	{series}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
													{invalid ? (
														<FieldError errors={field.state.meta.errors} />
													) : null}
												</Field>
											);
										}}
									</form.Field>
								) : null
							}
						</form.Subscribe>

						<div className="grid gap-5 sm:grid-cols-2">
							<form.Field name="commissionCode">
								{(field) => {
									const invalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={field.name}>
												Numéro de commission ou code de groupe
											</FieldLabel>
											<Input
												id={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												placeholder="Ex. 0421 ou BCG10"
												className="h-10 rounded-md text-sm uppercase"
												aria-invalid={invalid}
												autoComplete="off"
											/>
											{invalid ? (
												<FieldError errors={field.state.meta.errors} />
											) : (
												<FieldDescription>
													Vous pouvez saisir COM0421 ou 0421 : le préfixe est
													normalisé automatiquement.
												</FieldDescription>
											)}
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="codeSource">
								{(field) => (
									<Field>
										<FieldLabel>Origine du code</FieldLabel>
										<Select
											value={field.state.value}
											onValueChange={(value) => {
												if (value === "official" || value === "shared")
													field.handleChange(value);
											}}
										>
											<SelectTrigger className="h-10 w-full rounded-md text-sm">
												<span>
													{field.state.value === "official"
														? "Convocation officielle"
														: "Code partagé localement"}
												</span>
											</SelectTrigger>
											<SelectContent className="rounded-md">
												<SelectItem value="official">
													Convocation officielle
												</SelectItem>
												<SelectItem value="shared">
													Code partagé localement
												</SelectItem>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>
						</div>

						<div className="grid gap-5 sm:grid-cols-2">
							<form.Field name="examDate">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>
											Date de passage
										</FieldLabel>
										<Input
											id={field.name}
											type="date"
											value={field.state.value}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											className="h-10 rounded-md text-sm"
										/>
									</Field>
								)}
							</form.Field>
							<form.Field name="examTime">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>Heure</FieldLabel>
										<Input
											id={field.name}
											type="time"
											value={field.state.value}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											className="h-10 rounded-md text-sm"
										/>
									</Field>
								)}
							</form.Field>
						</div>

						<form.Subscribe selector={(state) => state.values.track}>
							{(track) => (
								<div className="grid gap-5 sm:grid-cols-2">
									{(["subjectOne", "subjectTwo"] as const).map(
										(name, index) => (
											<form.Field key={name} name={name}>
												{(field) => {
													const invalid =
														field.state.meta.isTouched &&
														!field.state.meta.isValid;
													return (
														<Field data-invalid={invalid}>
															<FieldLabel htmlFor={field.name}>
																{track === "general"
																	? `Spécialité ${index + 1}`
																	: `Enseignement ou thème ${index + 1}`}
															</FieldLabel>
															{track === "general" ? (
																<Select
																	value={field.state.value}
																	onValueChange={(value) =>
																		value && field.handleChange(value)
																	}
																>
																	<SelectTrigger
																		className="h-10 w-full rounded-md text-sm"
																		aria-invalid={invalid}
																	>
																		<span className="truncate">
																			{field.state.value ||
																				"Sélectionner une spécialité"}
																		</span>
																	</SelectTrigger>
																	<SelectContent className="rounded-md">
																		{GENERAL_SPECIALTIES.map((specialty) => (
																			<SelectItem
																				key={specialty}
																				value={specialty}
																			>
																				{specialty}
																			</SelectItem>
																		))}
																	</SelectContent>
																</Select>
															) : (
																<Input
																	id={field.name}
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(event) =>
																		field.handleChange(event.target.value)
																	}
																	placeholder="Intitulé court"
																	className="h-10 rounded-md text-sm"
																	aria-invalid={invalid}
																/>
															)}
															{invalid ? (
																<FieldError errors={field.state.meta.errors} />
															) : null}
														</Field>
													);
												}}
											</form.Field>
										),
									)}
								</div>
							)}
						</form.Subscribe>

						<div className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center">
							<form.Subscribe
								selector={(state) => ({
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
								})}
							>
								{({ canSubmit, isSubmitting }) => (
									<Button
										type="submit"
										size="lg"
										className="h-10 rounded-md px-4 text-sm"
										disabled={!canSubmit || isSubmitting || saving}
									>
										{mode === "save" ? <SaveIcon /> : <BarChart3Icon />}
										{isSubmitting || saving
											? "Traitement…"
											: mode === "save"
												? currentAccessKey
													? "Mettre à jour"
													: "Enregistrer"
												: currentAccessKey
													? "Mettre à jour l’analyse"
													: "Contribuer et analyser"}
									</Button>
								)}
							</form.Subscribe>
							<p className="text-muted-foreground text-xs">
								Aucun nom, email ou compte n’est demandé.
							</p>
						</div>
					</FieldGroup>
				</form>

				<aside className="lg:border-l lg:pl-8">
					{prediction ? (
						<PredictionPanel prediction={prediction} />
					) : (
						<div className="sticky top-24 space-y-5">
							<div className="flex size-10 items-center justify-center rounded-md bg-secondary">
								<InfoIcon className="text-muted-foreground" />
							</div>
							<div>
								<h2 className="font-semibold">Estimation collective</h2>
								<p className="mt-2 text-muted-foreground text-sm leading-6">
									Le calcul compare uniquement des candidats du même centre, de
									la même session, du même jour et du même code de groupe.
								</p>
							</div>
							<Separator />
							<p className="text-muted-foreground text-xs leading-5">
								L’outil cherche une spécialité pivot probable, pas la question
								que le jury choisira. Certaines académies masquent aussi le
								numéro de commission sur les convocations.
							</p>
						</div>
					)}
				</aside>
			</div>

			<Dialog open={recoveryDialogOpen} onOpenChange={setRecoveryDialogOpen}>
				<DialogContent className="rounded-md sm:max-w-md">
					<DialogHeader>
						<div className="mb-2 flex size-9 items-center justify-center rounded-md bg-secondary">
							<KeyRoundIcon className="size-4" />
						</div>
						<DialogTitle>Conservez votre clé de récupération</DialogTitle>
						<DialogDescription>
							Elle est enregistrée dans ce navigateur. Copiez-la pour retrouver
							et modifier votre déclaration depuis un autre appareil.
						</DialogDescription>
					</DialogHeader>
					<div className="break-all rounded-md border bg-muted/50 p-3 font-mono text-sm">
						{currentAccessKey}
					</div>
					<p className="text-muted-foreground text-xs leading-5">
						Nous ne connaissons pas cette clé et ne pourrons pas la renvoyer par
						email. Toute personne qui la possède peut modifier la déclaration.
					</p>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							className="rounded-md"
							onClick={copyAccessKey}
						>
							<CopyIcon />
							Copier la clé
						</Button>
						<Button
							type="button"
							className="rounded-md"
							onClick={() => setRecoveryDialogOpen(false)}
						>
							J’ai compris
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function PredictionPanel({ prediction }: { prediction: Prediction }) {
	const confidenceLabels = {
		none: "Données insuffisantes",
		low: "Indice faible",
		medium: "Indice modéré",
		high: "Indice plus solide",
	} as const;
	const statusMessages = {
		"unsupported-track":
			"L’organisation des commissions technologiques peut reposer sur une spécialité pivot ou sur deux spécialistes. Aucun pronostic fiable n’est produit pour cette voie.",
		insufficient:
			"Il faut au moins quatre autres déclarations du même groupe avant d’afficher une tendance.",
		ambiguous:
			"Les déclarations comparables ne départagent pas suffisamment vos deux spécialités.",
		trend:
			"La spécialité ci-dessous est la plus présente parmi les déclarations comparables.",
	} as const;
	const statusLabel =
		prediction.status === "trend"
			? confidenceLabels[prediction.confidence]
			: prediction.status === "ambiguous"
				? "Signal contradictoire"
				: prediction.status === "unsupported-track"
					? "Voie non prise en charge"
					: "Données insuffisantes";

	return (
		<div className="sticky top-24 space-y-5" aria-live="polite">
			<div className="flex items-center justify-between gap-3">
				<div className="flex size-10 items-center justify-center rounded-md bg-secondary">
					{prediction.likelyPivot ? (
						<CheckCircle2Icon className="text-emerald-600 dark:text-emerald-400" />
					) : (
						<InfoIcon className="text-muted-foreground" />
					)}
				</div>
				<Badge variant="secondary" className="rounded-md">
					{statusLabel}
				</Badge>
			</div>

			<div>
				<p className="font-medium text-muted-foreground text-xs uppercase">
					Spécialité pivot probable
				</p>
				<h2 className="mt-2 font-semibold text-xl leading-tight">
					{prediction.likelyPivot ?? "Pas encore de tendance exploitable"}
				</h2>
				<p className="mt-2 text-muted-foreground text-sm leading-6">
					{statusMessages[prediction.status]}
				</p>
				{prediction.status !== "unsupported-track" ? (
					<p className="mt-2 text-muted-foreground text-xs leading-5">
						{prediction.sampleSize} autre{prediction.sampleSize > 1 ? "s" : ""}{" "}
						candidat{prediction.sampleSize > 1 ? "s" : ""} dans ce groupe
						{prediction.outlierCount > 0
							? `, dont ${prediction.outlierCount} sans spécialité commune avec votre paire.`
							: "."}
					</p>
				) : null}
			</div>

			{prediction.sampleSize > 0 &&
			prediction.status !== "unsupported-track" ? (
				<div className="space-y-3">
					{prediction.support.map((item) => (
						<div key={item.subject}>
							<div className="mb-1.5 flex items-center justify-between gap-4 text-xs">
								<span className="truncate">{item.subject}</span>
								<span className="font-mono text-muted-foreground">
									{item.count}/{prediction.sampleSize}
								</span>
							</div>
							<div className="h-1.5 overflow-hidden rounded-full bg-secondary">
								<div
									className="h-full rounded-full bg-foreground transition-[width]"
									style={{
										width: `${Math.max(item.count > 0 ? 4 : 0, item.rate * 100)}%`,
									}}
								/>
							</div>
						</div>
					))}
				</div>
			) : null}

			<div className="border-t pt-4 text-muted-foreground text-xs leading-5">
				Même avec un indice élevé, le jury choisit librement l’une de vos deux
				questions, qui peut être transversale. Préparez toujours les deux.
			</div>

			<Button
				render={
					<Link
						href="https://cyclades.education.gouv.fr/cyccandidat/portal/login"
						target="_blank"
					/>
				}
				variant="link"
				className="h-auto justify-start p-0"
			>
				Ouvrir Cyclades
				<ArrowRightIcon />
			</Button>
		</div>
	);
}
