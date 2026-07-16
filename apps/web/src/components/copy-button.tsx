"use client";

import { Button } from "@grand-oral-finder/ui/components/button";
import { InputGroupButton } from "@grand-oral-finder/ui/components/input-group";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function useCopyFeedback(value: string) {
	const [copied, setCopied] = useState(false);
	const timeoutRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
		};
	}, []);

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
		} catch {
			toast.error("Impossible d’accéder au presse-papiers.");
			return;
		}
		setCopied(true);
		if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
		timeoutRef.current = window.setTimeout(() => setCopied(false), 1200);
	}

	return { copied, copy };
}

type CopyButtonProps = Omit<
	React.ComponentProps<typeof Button>,
	"children"
> & {
	value: string;
	label?: string;
	children?: React.ReactNode;
};

export function CopyButton({
	value,
	label = "Copier",
	children,
	onClick,
	...props
}: CopyButtonProps) {
	const { copied, copy } = useCopyFeedback(value);
	const iconOnly = children === undefined;

	return (
		<Button
			type="button"
			{...props}
			onClick={(event) => {
				onClick?.(event);
				void copy();
			}}
		>
			{copied ? (
				<CheckIcon
					data-icon={iconOnly ? undefined : "inline-start"}
					className="text-emerald-600 dark:text-emerald-400"
				/>
			) : (
				<CopyIcon data-icon={iconOnly ? undefined : "inline-start"} />
			)}
			{iconOnly ? <span className="sr-only">{label}</span> : children}
		</Button>
	);
}

type CopyInputGroupButtonProps = Omit<
	React.ComponentProps<typeof InputGroupButton>,
	"children"
> & {
	value: string;
	label?: string;
};

export function CopyInputGroupButton({
	value,
	label = "Copier",
	onClick,
	...props
}: CopyInputGroupButtonProps) {
	const { copied, copy } = useCopyFeedback(value);

	return (
		<InputGroupButton
			type="button"
			size="icon-xs"
			variant="ghost"
			aria-label={label}
			{...props}
			onClick={(event) => {
				onClick?.(event);
				void copy();
			}}
		>
			{copied ? (
				<CheckIcon className="text-emerald-600 dark:text-emerald-400" />
			) : (
				<CopyIcon />
			)}
		</InputGroupButton>
	);
}
