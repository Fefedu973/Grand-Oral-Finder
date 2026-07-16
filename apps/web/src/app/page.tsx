import { MATCHING_THRESHOLDS } from "@grand-oral-finder/api/domain/matching";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@grand-oral-finder/ui/components/accordion";
import { Badge } from "@grand-oral-finder/ui/components/badge";
import { Button } from "@grand-oral-finder/ui/components/button";
import {
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

export default function HomePage() {
	return (
		<main>
			<div className="mx-auto w-full max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14 lg:px-8">
				<section className="max-w-3xl">
					<Badge variant="outline" className="rounded-md px-2 py-1">
						Outil participatif · session 2026
					</Badge>
					<h1 className="mt-5 max-w-3xl font-semibold text-4xl leading-[1.08] sm:text-5xl">
						Estimez la spécialité pivot de votre commission.
					</h1>
					<p className="mt-5 max-w-2xl text-base text-muted-foreground leading-7 sm:text-lg">
						Grand Oral Finder recoupe les spécialités déclarées par d’autres
						candidats du même centre, le même jour et avec le même code de
						commission. Il affiche une tendance uniquement lorsque les données
						la justifient.
					</p>
					<div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
						<Link
							href={officialGrandOralUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
						>
							Déroulement officiel du Grand oral
							<ArrowUpRightIcon className="size-3.5" />
						</Link>
						<Link
							href="#methode"
							className="font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
						>
							Comprendre le calcul
						</Link>
					</div>
				</section>

				<section
					className="mt-10 border-y py-8 sm:py-10"
					aria-labelledby="finder-title"
				>
					<div className="mb-8 flex items-start justify-between gap-6">
						<div>
							<p className="font-medium text-muted-foreground text-xs uppercase">
								Contribution protégée
							</p>
							<h2 id="finder-title" className="mt-1 font-semibold text-2xl">
								Votre groupe de passage
							</h2>
						</div>
						<span className="hidden font-mono text-muted-foreground text-xs sm:block">
							données non officielles
						</span>
					</div>
					<ContributionForm />
				</section>
			</div>

			<section id="methode" className="scroll-mt-20 border-b bg-muted/35">
				<div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
					<div>
						<p className="font-medium text-muted-foreground text-xs uppercase">
							Méthode
						</p>
						<h2 className="mt-2 font-semibold text-3xl">
							Ce que le calcul cherche réellement
						</h2>
						<p className="mt-4 text-muted-foreground leading-7">
							En voie générale, une commission comporte normalement une
							spécialité pivot représentée par un membre du jury. Si plusieurs
							candidats d’une même commission ont tous une spécialité en commun,
							cette répétition constitue un indice sur la spécialité pivot.
						</p>
						<div className="mt-6 border-primary border-l-2 pl-4 text-sm leading-6">
							L’outil n’essaie pas de deviner votre question exacte. Le jury
							choisit librement l’une des deux questions présentées, qui peuvent
							aussi être transversales.
						</div>
					</div>

					<ol className="grid gap-px border bg-border sm:grid-cols-3">
						{[
							{
								icon: FileSearchIcon,
								title: "Isoler le groupe",
								text: "Même centre, session, voie, jour, origine du code et numéro normalisé.",
							},
							{
								icon: GitCompareArrowsIcon,
								title: "Comparer les paires",
								text: "Chaque candidat compte une seule fois pour chacune de ses deux spécialités.",
							},
							{
								icon: UsersRoundIcon,
								title: "Mesurer le consensus",
								text: `Une tendance exige au moins ${MATCHING_THRESHOLDS.minimumPeers} autres contributions et deux voix d’écart.`,
							},
						].map((step, index) => (
							<li key={step.title} className="bg-background p-5">
								<div className="flex items-center justify-between">
									<step.icon className="size-5 text-muted-foreground" />
									<span className="font-mono text-muted-foreground text-xs">
										0{index + 1}
									</span>
								</div>
								<h3 className="mt-6 font-semibold">{step.title}</h3>
								<p className="mt-2 text-muted-foreground text-sm leading-6">
									{step.text}
								</p>
							</li>
						))}
					</ol>
				</div>
			</section>

			<section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-20">
				<div>
					<p className="font-medium text-muted-foreground text-xs uppercase">
						Lecture du résultat
					</p>
					<h2 className="mt-2 font-semibold text-3xl">
						Une confiance volontairement conservatrice
					</h2>
					<p className="mt-4 text-muted-foreground leading-7">
						Votre propre déclaration est exclue du calcul. Une seule personne ne
						peut donc pas confirmer sa propre hypothèse.
					</p>
					<div className="mt-8 divide-y border-y">
						{[
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
								value: `${MATCHING_THRESHOLDS.highPeers}+ pairs, ${Math.round(MATCHING_THRESHOLDS.highCoverage * 100)} % de présence et peu d’incohérences`,
							},
						].map((level) => (
							<div
								key={level.label}
								className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6"
							>
								<dt className="font-medium text-sm">{level.label}</dt>
								<dd className="text-muted-foreground text-sm">{level.value}</dd>
							</div>
						))}
					</div>
				</div>

				<div className="border-amber-500/70 border-l-2 pl-5 sm:pl-7">
					<div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
						<ShieldAlertIcon className="size-5" />
						<span className="font-semibold">Limites à connaître</span>
					</div>
					<ul className="mt-5 space-y-4 text-muted-foreground text-sm leading-6">
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
				</div>
			</section>

			<section className="border-y bg-muted/35">
				<div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:px-8 lg:py-20">
					<div>
						<p className="font-medium text-muted-foreground text-xs uppercase">
							Convocation
						</p>
						<h2 className="mt-2 font-semibold text-3xl">
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
						<Button
							render={
								<Link href={cycladesUrl} target="_blank" rel="noreferrer" />
							}
							variant="outline"
							className="mt-6 rounded-md"
						>
							Ouvrir Cyclades
							<ArrowUpRightIcon />
						</Button>
					</div>
					<figure className="overflow-hidden rounded-md border bg-white p-2 shadow-sm">
						<Image
							src="/convocation-commission.png"
							alt="Exemple anonymisé d’une convocation Cyclades avec la ligne Commission mise en évidence"
							width={875}
							height={1299}
							className="mx-auto h-auto max-h-[36rem] w-auto"
						/>
						<figcaption className="border-t px-2 py-3 text-center text-muted-foreground text-xs">
							Exemple anonymisé d’une convocation 2024 ; la présentation peut
							varier selon la session et l’académie.
						</figcaption>
					</figure>
				</div>
			</section>

			<section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.7fr_1.3fr] lg:px-8 lg:py-20">
				<div>
					<p className="font-medium text-muted-foreground text-xs uppercase">
						Questions fréquentes
					</p>
					<h2 className="mt-2 font-semibold text-3xl">
						Avant d’utiliser le résultat
					</h2>
					<p className="mt-4 text-muted-foreground text-sm leading-6">
						Les réponses ci-contre décrivent précisément le périmètre de la
						version actuelle.
					</p>
				</div>
				<Accordion multiple className="border-y">
					<AccordionItem value="guarantee">
						<AccordionTrigger className="py-4 text-sm hover:no-underline">
							Le résultat est-il garanti ?
						</AccordionTrigger>
						<AccordionContent className="pb-5 text-muted-foreground text-sm leading-6">
							Non. Il s’agit d’un indice participatif sur la spécialité pivot
							probable, pas d’une information issue de Cyclades. Le jury choisit
							librement la question et peut retenir une question transversale.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="date">
						<AccordionTrigger className="py-4 text-sm hover:no-underline">
							Pourquoi la date de passage est-elle utilisée ?
						</AccordionTrigger>
						<AccordionContent className="pb-5 text-muted-foreground text-sm leading-6">
							Elle évite de mélanger des codes identiques utilisés à des jours
							différents. L’heure reste enregistrée pour vous permettre de
							corriger votre déclaration, mais elle n’entre pas dans le score
							actuel.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="access-key">
						<AccordionTrigger className="py-4 text-sm hover:no-underline">
							Comment modifier ma déclaration sans compte ?
						</AccordionTrigger>
						<AccordionContent className="pb-5 text-muted-foreground text-sm leading-6">
							Une clé privée est créée au premier enregistrement et conservée
							dans votre navigateur. Elle seule autorise les modifications et la
							suppression. Copiez-la si vous souhaitez changer d’appareil :
							aucun email ne permet de la récupérer.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="limits">
						<AccordionTrigger className="py-4 text-sm hover:no-underline">
							Qui peut consulter les estimations ?
						</AccordionTrigger>
						<AccordionContent className="pb-5 text-muted-foreground text-sm leading-6">
							L’estimation est calculée après votre contribution et uniquement
							pour le centre, la session, le jour et le code saisis. Elle reste
							masquée tant que moins de quatre autres contributions sont
							disponibles. Les créations et modifications sont limitées pour
							réduire le spam.
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="no-code">
						<AccordionTrigger className="py-4 text-sm hover:no-underline">
							Que faire si ma convocation ne contient aucun code ?
						</AccordionTrigger>
						<AccordionContent className="pb-5 text-muted-foreground text-sm leading-6">
							Certaines académies masquent ce numéro. Vous pouvez convenir d’un
							code avec les autres candidats du même groupe, mais il ne produira
							une tendance que si chacun saisit exactement ce code et choisit
							l’origine « partagée ».
						</AccordionContent>
					</AccordionItem>
					<AccordionItem value="sources">
						<AccordionTrigger className="py-4 text-sm hover:no-underline">
							D’où viennent les établissements ?
						</AccordionTrigger>
						<AccordionContent className="pb-5 text-muted-foreground text-sm leading-6">
							La recherche utilise l’Annuaire de l’Éducation nationale en open
							data. Les déclarations de passage, elles, proviennent uniquement
							des utilisateurs de Grand Oral Finder.
						</AccordionContent>
					</AccordionItem>
				</Accordion>
			</section>

			<section className="border-t">
				<div className="mx-auto grid max-w-6xl gap-px border-x bg-border sm:grid-cols-3">
					{[
						{
							icon: DatabaseIcon,
							title: "Annuaire national",
							text: "Les centres proposés proviennent de l’open data de l’Éducation nationale.",
						},
						{
							icon: ShieldCheckIcon,
							title: "Résultats agrégés",
							text: "Aucun nom, email, horaire individuel ou déclaration brute n’apparaît dans une estimation.",
						},
						{
							icon: BookOpenCheckIcon,
							title: "Sources explicites",
							text: "Le mécanisme et ses limites sont documentés plutôt que cachés derrière un score opaque.",
						},
					].map((item) => (
						<article key={item.title} className="bg-background p-6">
							<item.icon className="size-5 text-muted-foreground" />
							<h3 className="mt-5 font-semibold">{item.title}</h3>
							<p className="mt-2 text-muted-foreground text-sm leading-6">
								{item.text}
							</p>
						</article>
					))}
				</div>
			</section>
		</main>
	);
}
