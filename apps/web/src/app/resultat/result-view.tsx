"use client";

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@grand-oral-finder/ui/components/alert";
import { Badge } from "@grand-oral-finder/ui/components/badge";
import {
	Button,
	buttonVariants,
} from "@grand-oral-finder/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@grand-oral-finder/ui/components/card";
import { Confetti } from "@grand-oral-finder/ui/components/confetti";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@grand-oral-finder/ui/components/empty";
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@grand-oral-finder/ui/components/progress";
import { Separator } from "@grand-oral-finder/ui/components/separator";
import { Skeleton } from "@grand-oral-finder/ui/components/skeleton";
import { Spinner } from "@grand-oral-finder/ui/components/spinner";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@grand-oral-finder/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import {
	CalendarClockIcon,
	FileQuestionIcon,
	FolderKeyIcon,
	InfoIcon,
	PencilLineIcon,
	RefreshCwIcon,
	SearchIcon,
	TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { readSubmissionAccessKeys } from "@/lib/submission-access";
import type { client } from "@/utils/orpc";
import { orpc } from "@/utils/orpc";

type PredictionResult = Awaited<
	ReturnType<typeof client.submissions.prediction>
>;
type Prediction = PredictionResult["prediction"];
type Submission = PredictionResult["submission"];
type ScheduleEntry = Prediction["schedule"]["entries"][number];

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

const confettiOptions = {
	particleCount: 140,
	spread: 80,
	startVelocity: 35,
	origin: { x: 0.5, y: 0.4 },
} as const;

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
	hour: "2-digit",
	minute: "2-digit",
});

export function ResultView() {
	const searchParams = useSearchParams();
	const submissionId = searchParams.get("id");
	const [accessKeys, setAccessKeys] = useState<string[] | null>(null);

	useEffect(() => {
		setAccessKeys(readSubmissionAccessKeys());
	}, []);

	const owned = useQuery({
		...orpc.submissions.owned.queryOptions({
			input: { accessKeys: accessKeys ?? [] },
		}),
		enabled: accessKeys !== null,
	});

	const row = owned.data?.find((entry) => entry.id === submissionId);

	const result = useQuery({
		...orpc.submissions.prediction.queryOptions({
			input: { accessKey: row?.accessKey ?? "" },
		}),
		enabled: Boolean(row),
	});

	return (
		<main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
			<p className="font-medium text-muted-foreground text-xs uppercase">
				Estimation collective
			</p>
			<h1 className="mt-2 font-semibold text-3xl tracking-tight">
				Résultat de votre groupe
			</h1>
			<p className="mt-3 text-muted-foreground text-sm leading-6">
				Le résultat évolue à chaque nouvelle contribution d’un candidat de votre
				groupe : revenez le consulter régulièrement.
			</p>

			<div className="mt-8">
				{accessKeys === null || owned.isLoading ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-40 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				) : !submissionId || (!row && !owned.isError) ? (
					<Empty className="border border-dashed">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<FileQuestionIcon />
							</EmptyMedia>
							<EmptyTitle>Déclaration introuvable sur cet appareil</EmptyTitle>
							<EmptyDescription>
								Ce résultat est réservé au détenteur de la clé privée. Importez
								votre clé de récupération pour y accéder depuis cet appareil.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<div className="flex flex-wrap justify-center gap-2">
								<Link href="/dashboard" className={buttonVariants()}>
									<FolderKeyIcon data-icon="inline-start" />
									Importer une clé
								</Link>
								<Link
									href="/"
									className={buttonVariants({ variant: "outline" })}
								>
									<SearchIcon data-icon="inline-start" />
									Nouvelle estimation
								</Link>
							</div>
						</EmptyContent>
					</Empty>
				) : owned.isError || result.isError ? (
					<Alert variant="destructive">
						<InfoIcon />
						<AlertTitle>Résultat momentanément indisponible</AlertTitle>
						<AlertDescription>
							{(owned.error ?? result.error) instanceof Error
								? ((owned.error ?? result.error) as Error).message
								: "Réessayez dans un instant."}
						</AlertDescription>
					</Alert>
				) : row && result.data ? (
					<ResultCard
						result={result.data}
						accessKey={row.accessKey}
						onRefresh={() => result.refetch()}
						refreshing={result.isRefetching}
					/>
				) : (
					<div className="flex flex-col gap-3">
						<Skeleton className="h-40 w-full" />
						<Skeleton className="h-16 w-full" />
					</div>
				)}
			</div>
		</main>
	);
}

function ResultCard({
	result,
	accessKey,
	onRefresh,
	refreshing,
}: {
	result: PredictionResult;
	accessKey: string;
	onRefresh: () => void;
	refreshing: boolean;
}) {
	const { submission, prediction } = result;
	const celebrate =
		prediction.status === "trend" &&
		Boolean(prediction.likelyPivot) &&
		(prediction.confidence === "medium" || prediction.confidence === "high");

	const statusLabel =
		prediction.status === "trend"
			? confidenceLabels[prediction.confidence]
			: prediction.status === "ambiguous"
				? "Signal contradictoire"
				: prediction.status === "unsupported-track"
					? "Voie non prise en charge"
					: "Données insuffisantes";
	const sampleScopeLabel =
		prediction.temporal.scope === "nearby"
			? "autour de votre horaire"
			: "sur l’ensemble de la journée";

	return (
		<div className="flex flex-col gap-6" aria-live="polite">
			{celebrate ? (
				<Confetti
					key={prediction.likelyPivot}
					options={confettiOptions}
					className="pointer-events-none fixed inset-0 z-50 size-full"
					aria-hidden="true"
				/>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle className="flex flex-wrap items-center gap-2">
						{submission.schoolName}
						<Badge variant="secondary">{submission.examYear}</Badge>
						<Badge variant="outline" className="font-mono">
							{submission.commissionCode}
						</Badge>
					</CardTitle>
					<CardDescription>
						{submission.subjectOne}{" "}
						<span className="text-muted-foreground/60">/</span>{" "}
						{submission.subjectTwo}
						{" · passage le "}
						{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
							new Date(`${submission.examDay}T00:00:00`),
						)}
					</CardDescription>
					<CardAction>
						<Badge
							variant={celebrate ? "default" : "secondary"}
							className="whitespace-nowrap"
						>
							{statusLabel}
						</Badge>
					</CardAction>
				</CardHeader>
				<CardContent>
					<p className="font-medium text-muted-foreground text-xs uppercase">
						Spécialité pivot probable
					</p>
					<p className="mt-2 text-balance font-semibold text-3xl tracking-tight">
						{prediction.likelyPivot ?? "Pas encore de tendance exploitable"}
					</p>
					<p className="mt-3 max-w-xl text-muted-foreground text-sm leading-6">
						{statusMessages[prediction.status]}
					</p>
					{prediction.status !== "unsupported-track" ? (
						<p className="mt-2 text-muted-foreground text-xs leading-5">
							{prediction.sampleSize} autre
							{prediction.sampleSize > 1 ? "s" : ""} candidat
							{prediction.sampleSize > 1 ? "s" : ""} pris en compte
							{sampleScopeLabel}
							{prediction.outlierCount > 0
								? `, dont ${prediction.outlierCount} sans spécialité commune avec votre paire.`
								: "."}
						</p>
					) : null}

					{prediction.sampleSize > 0 &&
					prediction.status !== "unsupported-track" ? (
						<>
							<Separator className="my-6" />
							<div className="flex flex-col gap-4">
								{prediction.support.map((item) => (
									<Progress
										key={item.subject}
										value={Math.max(item.count > 0 ? 4 : 0, item.rate * 100)}
									>
										<ProgressLabel className="min-w-0 truncate font-normal text-sm">
											{item.subject}
										</ProgressLabel>
										<ProgressValue className="font-mono text-xs">
											{() => `${item.count}/${prediction.sampleSize}`}
										</ProgressValue>
									</Progress>
								))}
							</div>
						</>
					) : null}
				</CardContent>
				<CardFooter className="flex-wrap gap-2 border-t">
					<Button
						type="button"
						variant="outline"
						onClick={onRefresh}
						disabled={refreshing}
					>
						{refreshing ? (
							<Spinner data-icon="inline-start" />
						) : (
							<RefreshCwIcon data-icon="inline-start" />
						)}
						Actualiser
					</Button>
					<Link
						href="/dashboard"
						className={buttonVariants({ variant: "outline" })}
					>
						<PencilLineIcon data-icon="inline-start" />
						Modifier ma déclaration
					</Link>
					<CopyButton
						value={accessKey}
						variant="ghost"
						label="Copier ma clé de récupération"
					>
						Copier ma clé
					</CopyButton>
				</CardFooter>
			</Card>

			{prediction.temporal.conflictingDayTrend ? (
				<Alert>
					<TriangleAlertIcon />
					<AlertTitle>Le signal évolue au cours de la journée</AlertTitle>
					<AlertDescription>
						Autour de votre horaire, les déclarations suggèrent
						{prediction.likelyPivot
							? ` ${prediction.likelyPivot}`
							: " un pivot"}
						, tandis que l’ensemble de la journée suggère
						{prediction.temporal.fullDayLikelyPivot
							? ` ${prediction.temporal.fullDayLikelyPivot}`
							: " une autre tendance"}
						. Cela peut correspondre à un changement de jury ou à des données
						encore incomplètes.
					</AlertDescription>
				</Alert>
			) : null}

			{prediction.schedule.available ? (
				<ScheduleCard submission={submission} prediction={prediction} />
			) : null}

			<Alert>
				<InfoIcon />
				<AlertTitle>Le jury reste libre de son choix</AlertTitle>
				<AlertDescription>
					Même avec un indice élevé, le jury choisit librement l’une de vos deux
					questions, qui peut être transversale. Préparez toujours les deux.
				</AlertDescription>
			</Alert>
		</div>
	);
}

function ScheduleCard({
	submission,
	prediction,
}: {
	submission: Submission;
	prediction: Prediction;
}) {
	const usesNearbyWindow = prediction.temporal.scope === "nearby";
	const rows = prediction.schedule.entries.map((entry, index) => ({
		entry,
		key: `${entry.examAt}-${entry.subjectOne}-${entry.subjectTwo}-${index}`,
		time: timeFormatter.format(new Date(entry.examAt)),
		usedInAnalysis: !usesNearbyWindow || entry.inAnalysisWindow,
		signal: scheduleSignal(entry, submission),
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CalendarClockIcon className="size-4 text-muted-foreground" />
					Déroulé estimé de la journée
				</CardTitle>
				<CardDescription>
					Les déclarations sont anonymes et les horaires arrondis à cinq
					minutes. Les lignes atténuées restent visibles, mais ne participent
					pas à votre estimation locale.
				</CardDescription>
				<CardAction>
					<Badge variant="secondary" className="whitespace-nowrap">
						{usesNearbyWindow ? "Fenêtre ± 2 h" : "Journée entière"}
					</Badge>
				</CardAction>
			</CardHeader>

			<CardContent className="px-0">
				<div className="hidden sm:block">
					<Table>
						<TableCaption className="sr-only">
							Horaires et spécialités déclarés anonymement pour cette
							commission.
						</TableCaption>
						<TableHeader>
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-24 pl-4">Heure</TableHead>
								<TableHead>Spécialités</TableHead>
								<TableHead className="w-48 pr-4 text-right">Signal</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rows.map(({ entry, key, signal, time, usedInAnalysis }) => (
								<TableRow
									key={key}
									className={
										entry.isCurrent
											? "bg-muted/50"
											: usedInAnalysis
												? undefined
												: "text-muted-foreground opacity-55"
									}
								>
									<TableCell className="pl-4 font-mono text-xs">
										{time}
									</TableCell>
									<TableCell className="whitespace-normal py-3">
										<div className="flex flex-wrap items-center gap-2">
											<span className="min-w-0 leading-5">
												{entry.subjectOne}
												<span className="px-1.5 text-muted-foreground/60">
													/
												</span>
												{entry.subjectTwo}
											</span>
											{entry.isCurrent ? (
												<Badge variant="secondary">Vous</Badge>
											) : null}
										</div>
									</TableCell>
									<TableCell className="pr-4 text-right">
										<SignalBadge
											signal={signal}
											likelyPivot={prediction.likelyPivot}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>

				<div className="divide-y sm:hidden">
					{rows.map(({ entry, key, signal, time, usedInAnalysis }) => (
						<div
							key={key}
							className={`grid grid-cols-[4rem_minmax(0,1fr)] gap-3 px-4 py-3 ${
								entry.isCurrent
									? "bg-muted/50"
									: usedInAnalysis
										? ""
										: "text-muted-foreground opacity-55"
							}`}
						>
							<span className="pt-0.5 font-mono text-xs">{time}</span>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2 text-sm leading-5">
									<span>
										{entry.subjectOne}
										<span className="px-1.5 text-muted-foreground/60">/</span>
										{entry.subjectTwo}
									</span>
									{entry.isCurrent ? (
										<Badge variant="secondary">Vous</Badge>
									) : null}
								</div>
								<div className="mt-2">
									<SignalBadge
										signal={signal}
										likelyPivot={prediction.likelyPivot}
									/>
								</div>
							</div>
						</div>
					))}
				</div>
			</CardContent>

			<CardFooter className="gap-2 border-t text-muted-foreground text-xs">
				<InfoIcon className="size-3.5 shrink-0" />
				{prediction.temporal.nearbyPeerCount} pair
				{prediction.temporal.nearbyPeerCount > 1 ? "s" : ""} à moins de deux
				heures de votre passage · {prediction.temporal.dayPeerCount} sur la
				journée.
			</CardFooter>
		</Card>
	);
}

function scheduleSignal(entry: ScheduleEntry, submission: Submission) {
	const supportsFirst = includesSubject(entry, submission.subjectOne);
	const supportsSecond = includesSubject(entry, submission.subjectTwo);

	if (supportsFirst && !supportsSecond) {
		return { kind: "subject", label: submission.subjectOne } as const;
	}
	if (supportsSecond && !supportsFirst) {
		return { kind: "subject", label: submission.subjectTwo } as const;
	}
	if (supportsFirst && supportsSecond) {
		return { kind: "both", label: "Ne départage pas" } as const;
	}
	return { kind: "none", label: "Hors de votre paire" } as const;
}

function includesSubject(entry: ScheduleEntry, subject: string) {
	return entry.subjectOne === subject || entry.subjectTwo === subject;
}

function SignalBadge({
	signal,
	likelyPivot,
}: {
	signal: ReturnType<typeof scheduleSignal>;
	likelyPivot: string | null;
}) {
	const highlightsPivot =
		signal.kind === "subject" && signal.label === likelyPivot;
	const label =
		signal.kind === "subject" ? `Soutient ${signal.label}` : signal.label;

	return (
		<Badge
			variant={
				highlightsPivot
					? "default"
					: signal.kind === "both"
						? "secondary"
						: "outline"
			}
			className="max-w-48"
			title={label}
		>
			<span className="truncate">{label}</span>
		</Badge>
	);
}
