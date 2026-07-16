"use client";

import {
	GENERAL_SPECIALTIES,
	TECHNOLOGICAL_SERIES,
} from "@grand-oral-finder/api/domain/grand-oral";
import { Button } from "@grand-oral-finder/ui/components/button";
import { Calendar } from "@grand-oral-finder/ui/components/calendar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@grand-oral-finder/ui/components/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from "@grand-oral-finder/ui/components/drawer";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@grand-oral-finder/ui/components/field";
import { Input } from "@grand-oral-finder/ui/components/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@grand-oral-finder/ui/components/input-group";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@grand-oral-finder/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@grand-oral-finder/ui/components/select";
import { Separator } from "@grand-oral-finder/ui/components/separator";
import { Spinner } from "@grand-oral-finder/ui/components/spinner";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@grand-oral-finder/ui/components/toggle-group";
import { useMediaQuery } from "@grand-oral-finder/ui/hooks/use-media-query";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
	ArrowRightIcon,
	BarChart3Icon,
	CalendarIcon,
	ClockIcon,
	HelpCircleIcon,
	InfoIcon,
	KeyRoundIcon,
	SaveIcon,
} from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
	addSubmissionAccessKey,
	getOrCreateDeviceToken,
} from "@/lib/submission-access";
import { client } from "@/utils/orpc";

import { CopyButton, CopyInputGroupButton } from "./copy-button";
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

function resultRoute(submissionId: string) {
	return `/resultat?id=${encodeURIComponent(submissionId)}` as Route;
}

function parseDateValue(value: string): Date | undefined {
	const [year, month, day] = value.split("-").map(Number);
	if (!year || !month || !day) return undefined;
	return new Date(year, month - 1, day);
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
	const router = useRouter();
	const [saving, setSaving] = useState(false);
	const [datePickerOpen, setDatePickerOpen] = useState(false);
	const [currentAccessKey, setCurrentAccessKey] = useState(
		initial?.accessKey ?? null,
	);
	const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
	const [pendingResultId, setPendingResultId] = useState<string | null>(null);

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
				if (currentAccessKey) {
					const updated = await client.submissions.update({
						accessKey: currentAccessKey,
						data,
					});
					toast.success("Déclaration mise à jour.");
					onSaved?.();
					router.push(resultRoute(updated.id));
				} else {
					const created = await client.submissions.create({
						deviceToken: getOrCreateDeviceToken(),
						data,
					});
					const stored = addSubmissionAccessKey(created.accessKey);
					setCurrentAccessKey(created.accessKey);
					setPendingResultId(created.id);
					setRecoveryDialogOpen(true);
					if (!stored) {
						toast.warning(
							"Le navigateur n’a pas pu enregistrer la clé. Copiez-la avant de fermer le dialogue.",
						);
					}
					toast.success("Déclaration enregistrée et ajoutée à l’estimation.");
				}
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "Une erreur est survenue.",
				);
			} finally {
				setSaving(false);
			}
		},
	});

	function closeRecoveryDialog(open: boolean) {
		setRecoveryDialogOpen(open);
		if (!open && pendingResultId) {
			router.push(resultRoute(pendingResultId));
		}
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
												field.handleChange(school?.uai ?? "");
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
											<SelectTrigger className="w-full">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
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
												</SelectGroup>
											</SelectContent>
										</Select>
									</Field>
								)}
							</form.Field>

							<form.Field name="track">
								{(field) => (
									<Field>
										<FieldLabel>Voie</FieldLabel>
										<ToggleGroup
											variant="outline"
											spacing={0}
											className="w-full *:flex-1"
											value={[field.state.value]}
											onValueChange={(next) => {
												const value = next[0];
												if (value === "general" || value === "technological") {
													field.handleChange(value);
												}
											}}
										>
											<ToggleGroupItem value="general">
												Générale
											</ToggleGroupItem>
											<ToggleGroupItem value="technological">
												Technologique
											</ToggleGroupItem>
										</ToggleGroup>
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
															className="w-full"
															aria-invalid={invalid}
														>
															<SelectValue placeholder="Sélectionner une série" />
														</SelectTrigger>
														<SelectContent>
															<SelectGroup>
																{TECHNOLOGICAL_SERIES.map((series) => (
																	<SelectItem key={series} value={series}>
																		{series}
																	</SelectItem>
																))}
															</SelectGroup>
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
												className="uppercase"
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
										<div className="flex items-center gap-1">
											<FieldLabel>Origine du code</FieldLabel>
											<Popover>
												<PopoverTrigger
													render={
														<Button
															type="button"
															variant="ghost"
															size="icon-xs"
															className="text-muted-foreground"
															aria-label="Aide sur l’origine du code"
														/>
													}
												>
													<HelpCircleIcon />
												</PopoverTrigger>
												<PopoverContent
													align="start"
													className="w-80 text-sm leading-6"
												>
													<p>
														<span className="font-medium">Convocation</span> :
														votre convocation Cyclades affiche un numéro de
														commission (ex. COM0421).
													</p>
													<p className="mt-2">
														<span className="font-medium">Code partagé</span> :
														aucun numéro n’apparaît ? Convenez d’un code avec
														les candidats de votre groupe de passage. La
														tendance ne fonctionne que si chacun saisit
														exactement le même code et choisit aussi « Code
														partagé ».
													</p>
												</PopoverContent>
											</Popover>
										</div>
										<ToggleGroup
											variant="outline"
											spacing={0}
											className="w-full *:flex-1"
											value={[field.state.value]}
											onValueChange={(next) => {
												const value = next[0];
												if (value === "official" || value === "shared") {
													field.handleChange(value);
												}
											}}
										>
											<ToggleGroupItem value="official">
												Convocation
											</ToggleGroupItem>
											<ToggleGroupItem value="shared">
												Code partagé
											</ToggleGroupItem>
										</ToggleGroup>
									</Field>
								)}
							</form.Field>
						</div>

						<div className="grid gap-5 sm:grid-cols-2">
							<form.Field name="examDate">
								{(field) => {
									const selectedDate = parseDateValue(field.state.value);
									return (
										<Field>
											<FieldLabel htmlFor="exam-date">
												Date de passage
											</FieldLabel>
											<Popover
												open={datePickerOpen}
												onOpenChange={setDatePickerOpen}
											>
												<PopoverTrigger
													render={
														<Button
															type="button"
															id="exam-date"
															variant="outline"
															className="w-full justify-between font-normal"
														/>
													}
												>
													{selectedDate
														? format(selectedDate, "d MMMM yyyy", {
																locale: fr,
															})
														: "Choisir une date"}
													<CalendarIcon className="text-muted-foreground" />
												</PopoverTrigger>
												<PopoverContent align="start" className="w-auto p-0">
													<Calendar
														mode="single"
														locale={fr}
														selected={selectedDate}
														defaultMonth={selectedDate}
														captionLayout="dropdown"
														onSelect={(date) => {
															if (date) {
																field.handleChange(format(date, "yyyy-MM-dd"));
															}
															setDatePickerOpen(false);
														}}
													/>
												</PopoverContent>
											</Popover>
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="examTime">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>Heure</FieldLabel>
										<InputGroup>
											<InputGroupInput
												id={field.name}
												type="time"
												value={field.state.value}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												className="appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
											/>
											<InputGroupAddon>
												<ClockIcon />
											</InputGroupAddon>
										</InputGroup>
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
																		className="w-full"
																		aria-invalid={invalid}
																	>
																		<SelectValue placeholder="Sélectionner une spécialité" />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectGroup>
																			{GENERAL_SPECIALTIES.map((specialty) => (
																				<SelectItem
																					key={specialty}
																					value={specialty}
																				>
																					{specialty}
																				</SelectItem>
																			))}
																		</SelectGroup>
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

						<Separator />

						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<form.Subscribe
								selector={(state) => ({
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
								})}
							>
								{({ canSubmit, isSubmitting }) => {
									const pending = isSubmitting || saving;
									return (
										<Button
											type="submit"
											size="lg"
											disabled={!canSubmit || pending}
										>
											{pending ? (
												<Spinner data-icon="inline-start" />
											) : mode === "save" ? (
												<SaveIcon data-icon="inline-start" />
											) : (
												<BarChart3Icon data-icon="inline-start" />
											)}
											{pending
												? "Traitement…"
												: mode === "save"
													? currentAccessKey
														? "Mettre à jour"
														: "Enregistrer"
													: currentAccessKey
														? "Mettre à jour l’analyse"
														: "Contribuer et analyser"}
										</Button>
									);
								}}
							</form.Subscribe>
						</div>
					</FieldGroup>
				</form>

				<aside className="lg:border-l lg:pl-8">
					<div className="sticky top-24 flex flex-col gap-5">
						<div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
							<InfoIcon className="size-4 text-muted-foreground" />
						</div>
						<div>
							<h2 className="font-semibold">Estimation collective</h2>
							<p className="mt-2 text-muted-foreground text-sm leading-6">
								Le calcul compare uniquement des candidats du même centre, de la
								même session, du même jour et du même code de groupe. Le
								résultat s’ouvre sur une page dédiée dès l’enregistrement.
							</p>
						</div>
						<Separator />
						<p className="text-muted-foreground text-xs leading-5">
							L’outil cherche une spécialité pivot probable, pas la question que
							le jury choisira. Certaines académies masquent aussi le numéro de
							commission sur les convocations.
						</p>
					</div>
				</aside>
			</div>

			<RecoveryKeyDialog
				accessKey={currentAccessKey}
				open={recoveryDialogOpen}
				onOpenChange={closeRecoveryDialog}
			/>
		</>
	);
}

function RecoveryKeyDialog({
	accessKey,
	open,
	onOpenChange,
}: {
	accessKey: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const details = (
		<div className="grid gap-4">
			<InputGroup>
				<InputGroupInput
					readOnly
					value={accessKey ?? ""}
					className="font-mono text-xs"
					onFocus={(event) => event.target.select()}
				/>
				<InputGroupAddon align="inline-end">
					<CopyInputGroupButton
						value={accessKey ?? ""}
						label="Copier la clé de récupération"
					/>
				</InputGroupAddon>
			</InputGroup>
			<p className="text-muted-foreground text-xs leading-5">
				Nous ne connaissons pas cette clé et ne pourrons pas la renvoyer par
				email. Toute personne qui la possède peut modifier la déclaration.
			</p>
		</div>
	);

	if (isDesktop) {
		return (
			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-secondary">
							<KeyRoundIcon className="size-4" />
						</div>
						<DialogTitle>Conservez votre clé de récupération</DialogTitle>
						<DialogDescription>
							Elle est enregistrée dans ce navigateur. Copiez-la pour retrouver
							et modifier votre déclaration depuis un autre appareil.
						</DialogDescription>
					</DialogHeader>
					{details}
					<DialogFooter>
						<CopyButton value={accessKey ?? ""} variant="outline">
							Copier la clé
						</CopyButton>
						<Button type="button" onClick={() => onOpenChange(false)}>
							Voir le résultat
							<ArrowRightIcon data-icon="inline-end" />
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent>
				<DrawerHeader className="text-left">
					<div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-secondary">
						<KeyRoundIcon className="size-4" />
					</div>
					<DrawerTitle>Conservez votre clé de récupération</DrawerTitle>
					<DrawerDescription>
						Elle est enregistrée dans ce navigateur. Copiez-la pour retrouver et
						modifier votre déclaration depuis un autre appareil.
					</DrawerDescription>
				</DrawerHeader>
				<div className="px-4">{details}</div>
				<DrawerFooter className="pt-2">
					<Button type="button" onClick={() => onOpenChange(false)}>
						Voir le résultat
						<ArrowRightIcon data-icon="inline-end" />
					</Button>
					<CopyButton value={accessKey ?? ""} variant="outline">
						Copier la clé
					</CopyButton>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
