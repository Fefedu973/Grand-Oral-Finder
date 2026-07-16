import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: {
		default: "Grand Oral Finder",
		template: "%s · Grand Oral Finder",
	},
	description:
		"Estimation collective et prudente des groupes du Grand oral, pour tous les centres d’examen.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="fr" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers>
					<div className="flex min-h-svh flex-col">
						<Header />
						<div className="flex-1">{children}</div>
						<footer className="mx-auto flex max-w-6xl flex-col gap-2 border-t px-4 py-6 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
							<span>
								Projet indépendant, sans affiliation avec l’Éducation nationale.
							</span>
							<span>Les résultats sont des estimations non officielles.</span>
						</footer>
					</div>
				</Providers>
			</body>
		</html>
	);
}
