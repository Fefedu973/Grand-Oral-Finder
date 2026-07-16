import { MATCHING_THRESHOLDS } from "@grand-oral-finder/api/domain/matching";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@grand-oral-finder/ui/components/accordion";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@grand-oral-finder/ui/components/alert";
import { Badge } from "@grand-oral-finder/ui/components/badge";
import { buttonVariants } from "@grand-oral-finder/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@grand-oral-finder/ui/components/card";
import {
	Item,
	ItemContent,
	ItemDescription,
	ItemMedia,
	ItemTitle,
} from "@grand-oral-finder/ui/components/item";
import {
	ArrowDownIcon,
	ArrowUpRightIcon,
	BookOpenCheckIcon,
	DatabaseIcon,
	FileSearchIcon,
	GitCompareArrowsIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	UsersRoundIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { ContributionForm } from "@/components/contribution-form";

const officialGrandOralUrl =
	"https://www.education.gouv.fr/reussir-au-lycee/baccalaureat-comment-se-passe-le-grand-oral-100028";
const cycladesUrl =
	"https://cyclades.education.gouv.fr/cyccandidat/portal/login";

const methodSteps = [
	{
		icon: FileSearchIcon,
		title: "Isoler le groupe",
		text: "Même centre, session, voie, jour, origine du code et numéro normalisé.",
	},
	{
		icon: GitCompareArrowsIcon,
		title: "Comparer les paires",
		text: "Les pairs qui ne partagent qu’une seule de vos spécialités permettent de les départager.",
	},
	{
		icon: UsersRoundIcon,
		title: "Mesurer le consensus",
		text: `Une tendance exige au moins ${MATCHING_THRESHOLDS.minimumExclusivePeers} contributions qui ne partagent qu’une seule de vos spécialités, avec deux voix d’écart.`,
	},
] as const;

const confidenceLevels = [
	{
		label: "Indice faible",
		value: `${MATCHING_THRESHOLDS.minimumPeers} pairs concordants au minimum`,
	},
	{
		label: "Indice modéré",
		value: `${MATCHING_THRESHOLDS.mediumPeers}+ pairs et au moins ${Math.round(MATCHING_THRESHOLDS.mediumCoverage * 100)} % de présence`,
	},
	{
		label: "Indice plus solide",
		value: `${MATCHING_THRESHOLDS.highPeers}+ pairs concordants, ou un consensus horaire plus court mais particulièrement diversifié`,
	},
] as const;

const faqEntries = [
	{
		value: "guarantee",
		question: "Le résultat est-il garanti ?",
		answer:
			"Non. Il s’agit d’un indice participatif sur la spécialité pivot probable, pas d’une information issue de Cyclades. Le jury choisit librement la question et peut retenir une question transversale.",
	},
	{
		value: "date",
		question: "Pourquoi la date et l’heure de passage sont-elles utilisées ?",
		answer:
			"La date évite de mélanger des codes identiques utilisés à des jours différents. L’heure privilégie les déclarations situées à moins de deux heures de votre passage. Si elles sont trop peu nombreuses, l’analyse utilise la journée entière avec une confiance réduite.",
	},
	{
		value: "access-key",
		question: "Comment modifier ma déclaration sans compte ?",
		answer:
			"Une clé privée est créée au premier enregistrement et conservée dans votre navigateur. Elle seule autorise les modifications et la suppression. Copiez-la si vous souhaitez changer d’appareil : aucun email ne permet de la récupérer.",
	},
	{
		value: "limits",
		question: "Qui peut consulter les estimations ?",
		answer:
			"L’estimation est calculée après votre contribution et uniquement pour le centre, la session, le jour et le code saisis. Elle reste masquée tant que moins de quatre autres contributions sont disponibles. Les créations et modifications sont limitées pour réduire le spam.",
	},
	{
		value: "no-code",
		question: "Que faire si ma convocation ne contient aucun code ?",
		answer:
			"Certaines académies masquent ce numéro. Vous pouvez convenir d’un code avec les autres candidats du même groupe, mais il ne produira une tendance que si chacun saisit exactement ce code et choisit l’origine « partagée ».",
	},
	{
		value: "sources",
		question: "D’où viennent les établissements ?",
		answer:
			"La recherche utilise l’Annuaire de l’Éducation nationale en open data. Les déclarations de passage, elles, proviennent uniquement des utilisateurs de Grand Oral Finder.",
	},
] as const;

const guarantees = [
	{
		icon: DatabaseIcon,
		title: "Annuaire national",
		text: "Les centres proposés proviennent de l’open data de l’Éducation nationale.",
	},
	{
		icon: ShieldCheckIcon,
		title: "Résultats agrégés",
		text: "Aucun nom, email ou contact n’est exposé. Le déroulé accessible au contributeur reste anonyme et ses horaires sont arrondis.",
	},
	{
		icon: BookOpenCheckIcon,
		title: "Sources explicites",
		text: "Le mécanisme et ses limites sont documentés plutôt que cachés derrière un score opaque.",
	},
] as const;

export default function HomePage() {
	return (
		<main>
			<section className="border-b">
				<div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
					<div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
						<Badge variant="outline">Outil participatif · Session 2026</Badge>
						<h1 className="text-balance font-semibold text-4xl tracking-tight sm:text-5xl">
							Estimez la spécialité pivot de votre commission.
						</h1>
						<p className="max-w-2xl text-pretty text-muted-foreground leading-7 sm:text-lg">
							Grand Oral Finder recoupe les spécialités déclarées par d’autres
							candidats du même centre, le même jour et avec le même code de
							commission. Il affiche une tendance uniquement lorsque les données
							la justifient.
						</p>
						<div className="flex flex-wrap items-center justify-center gap-3">
							<a href="#estimation" className={buttonVariants({ size: "lg" })}>
								Estimer ma commission
								<ArrowDownIcon data-icon="inline-end" />
							</a>
							<a
								href="#methode"
								className={buttonVariants({ variant: "outline", size: "lg" })}
							>
								Comprendre le calcul
							</a>
						</div>
						<Link
							href={officialGrandOralUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline"
						>
							Déroulement officiel du Grand oral
							<ArrowUpRightIcon className="size-3.5" />
						</Link>
					</div>
				</div>
			</section>

			<section
				id="estimation"
				className="scroll-mt-20 border-b bg-muted/40"
				aria-labelledby="finder-title"
			>
				<div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
					<Card>
						<CardHeader>
							<CardTitle id="finder-title" className="text-xl">
								Votre groupe de passage
							</CardTitle>
							<CardDescription>
								Contribution protégée par une clé privée : aucun compte n’est
								nécessaire.
							</CardDescription>
							<CardAction className="max-sm:hidden">
								<Badge variant="secondary" className="font-mono">
									Données non officielles
								</Badge>
							</CardAction>
						</CardHeader>
						<CardContent>
							<ContributionForm />
						</CardContent>
					</Card>
				</div>
			</section>

			<section id="methode" className="scroll-mt-20 border-b">
				<div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
					<div>
						<p className="font-medium text-muted-foreground text-xs uppercase">
							Méthode
						</p>
						<h2 className="mt-2 font-semibold text-3xl tracking-tight">
							Ce que le calcul cherche réellement
						</h2>
						<p className="mt-4 text-muted-foreground leading-7">
							En voie générale, les jurys sont constitués en fonction des
							spécialités des candidats et au moins un examinateur représente
							l’une des deux spécialités du candidat. Si plusieurs paires
							différentes d’une même commission partagent toutes une spécialité,
							cette répétition constitue un indice, sans être une preuve.
						</p>
						<Alert className="mt-6">
							<ShieldAlertIcon />
							<AlertTitle>L’outil ne devine pas votre question</AlertTitle>
							<AlertDescription>
								Le jury choisit librement l’une des deux questions présentées,
								qui peuvent aussi être transversales.
							</AlertDescription>
						</Alert>
					</div>

					<ol className="grid gap-4 self-center sm:grid-cols-3">
						{methodSteps.map((step, index) => (
							<li key={step.title} className="min-w-0">
								<Card className="h-full gap-4">
									<CardHeader>
										<div className="flex items-center justify-between">
											<div className="flex size-9 items-center justify-center rounded-lg bg-muted">
												<step.icon className="size-4" />
											</div>
											<span className="font-mono text-muted-foreground text-xs">
												0{index + 1}
											</span>
										</div>
									</CardHeader>
									<CardContent>
										<h3 className="font-semibold">{step.title}</h3>
										<p className="mt-1.5 text-muted-foreground text-sm leading-6">
											{step.text}
										</p>
									</CardContent>
								</Card>
							</li>
						))}
					</ol>
				</div>
			</section>

			<section className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
				<div>
					<p className="font-medium text-muted-foreground text-xs uppercase">
						Lecture du résultat
					</p>
					<h2 className="mt-2 font-semibold text-3xl tracking-tight">
						Une confiance volontairement conservatrice
					</h2>
					<p className="mt-4 text-muted-foreground leading-7">
						Votre propre déclaration est exclue du calcul. Une seule personne ne
						peut donc pas confirmer sa propre hypothèse.
					</p>
					<div className="mt-6 flex flex-col divide-y rounded-lg border">
						{confidenceLevels.map((level) => (
							<Item key={level.label} size="sm" className="py-3">
								<ItemContent>
									<ItemTitle>{level.label}</ItemTitle>
									<ItemDescription>{level.value}</ItemDescription>
								</ItemContent>
							</Item>
						))}
					</div>
				</div>

				<Alert className="h-fit lg:mt-24">
					<ShieldAlertIcon />
					<AlertTitle>Limites à connaître</AlertTitle>
					<AlertDescription>
						<ul className="mt-2 flex list-disc flex-col gap-3 pl-4">
							<li>
								Le numéro de commission n’est pas exposé de façon uniforme :
								certaines académies le retirent volontairement des convocations.
							</li>
							<li>
								Un jury peut être remplacé ou réorganisé, et une déclaration
								utilisateur peut être erronée.
							</li>
							<li>
								Des candidats ayant la même paire de spécialités n’aident pas à
								les départager ; l’outil préfère alors ne rien conclure.
							</li>
							<li>
								La voie technologique n’affiche pas de pronostic, car les
								académies peuvent organiser les commissions avec une spécialité
								pivot ou deux spécialistes.
							</li>
						</ul>
					</AlertDescription>
				</Alert>
			</section>

			<section className="border-y bg-muted/40">
				<div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:px-8 lg:py-20">
					<div>
						<p className="font-medium text-muted-foreground text-xs uppercase">
							Convocation
						</p>
						<h2 className="mt-2 font-semibold text-3xl tracking-tight">
							Où trouver le numéro de commission ?
						</h2>
						<p className="mt-4 text-muted-foreground leading-7">
							Dans Cyclades, ouvrez la session du baccalauréat, puis « Mes
							documents » et la convocation regroupant vos épreuves. La ligne du
							Grand oral peut contenir une valeur comme « Commission : COM0421
							».
						</p>
						<p className="mt-4 text-muted-foreground text-sm leading-6">
							Vous pouvez saisir le code avec ou sans le préfixe COM. Si aucun
							numéro n’apparaît, utilisez uniquement un code partagé avec les
							candidats de votre groupe et sélectionnez « Code partagé
							localement ».
						</p>
						<Link
							href={cycladesUrl}
							target="_blank"
							rel="noreferrer"
							className={buttonVariants({
								variant: "outline",
								className: "mt-6",
							})}
						>
							Ouvrir Cyclades
							<ArrowUpRightIcon data-icon="inline-end" />
						</Link>
					</div>
					<Card className="gap-0 overflow-hidden py-0">
						<CardContent className="bg-white p-2">
							<Image
								src="/convocation-commission.png"
								alt="Exemple anonymisé d’une convocation Cyclades avec la ligne Commission mise en évidence"
								width={875}
								height={1299}
								className="mx-auto h-auto max-h-[36rem] w-auto"
							/>
						</CardContent>
						<CardFooter className="border-t py-3">
							<p className="w-full text-center text-muted-foreground text-xs">
								Exemple anonymisé d’une convocation 2024 ; la présentation peut
								varier selon la session et l’académie.
							</p>
						</CardFooter>
					</Card>
				</div>
			</section>

			<section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8 lg:py-20">
				<div>
					<p className="font-medium text-muted-foreground text-xs uppercase">
						Questions fréquentes
					</p>
					<h2 className="mt-2 font-semibold text-3xl tracking-tight">
						Avant d’utiliser le résultat
					</h2>
					<p className="mt-4 text-muted-foreground text-sm leading-6">
						Les réponses ci-contre décrivent précisément le périmètre de la
						version actuelle.
					</p>
				</div>
				<Accordion multiple>
					{faqEntries.map((entry) => (
						<AccordionItem key={entry.value} value={entry.value}>
							<AccordionTrigger>{entry.question}</AccordionTrigger>
							<AccordionContent className="text-muted-foreground">
								{entry.answer}
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</section>

			<section className="border-t bg-muted/40">
				<div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3 sm:px-6 lg:px-8">
					{guarantees.map((item) => (
						<Item key={item.title} className="items-start">
							<ItemMedia variant="icon" className="rounded-lg bg-background">
								<item.icon />
							</ItemMedia>
							<ItemContent>
								<ItemTitle>{item.title}</ItemTitle>
								<ItemDescription className="line-clamp-none">
									{item.text}
								</ItemDescription>
							</ItemContent>
						</Item>
					))}
				</div>
			</section>
		</main>
	);
}
