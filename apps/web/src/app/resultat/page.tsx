import type { Metadata } from "next";
import { Suspense } from "react";

import { ResultView } from "./result-view";

export const metadata: Metadata = {
	title: "Résultat",
	description:
		"Estimation collective de la spécialité pivot pour votre groupe de passage du Grand oral.",
};

export default function ResultPage() {
	return (
		<Suspense fallback={null}>
			<ResultView />
		</Suspense>
	);
}
