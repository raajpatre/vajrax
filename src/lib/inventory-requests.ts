export const RETURN_CONDITIONS = [
    "perfect",
    "moderate",
    "poor",
    "disposable",
] as const;

export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

export type ReturnLifecycleStatus = "return_pending" | "returned";

export function getReturnConditionLabel(condition: ReturnCondition) {
    switch (condition) {
        case "perfect":
            return "Perfect";
        case "moderate":
            return "Moderate";
        case "poor":
            return "Poor";
        case "disposable":
            return "Disposable";
    }
}

export function getReturnedLifecycleLabel(condition: ReturnCondition) {
    return `Returned in ${getReturnConditionLabel(condition)} condition`;
}

export function getPreferredName(input: { display_name?: string | null; username?: string | null } | null) {
    if (!input) {
        return "Unknown user";
    }

    return input.username?.trim() || input.display_name?.trim() || "Unknown user";
}

export const returnConditionBadgeClass: Record<ReturnCondition, string> = {
    perfect: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
    moderate: "text-amber-300 bg-amber-500/10 border-amber-400/30",
    poor: "text-orange-300 bg-orange-500/10 border-orange-400/30",
    disposable: "text-slate-300 bg-slate-500/10 border-slate-400/30",
};

export const returnConditionAccentClass: Record<ReturnCondition, string> = {
    perfect: "border-emerald-400/30 bg-emerald-500/8 text-emerald-200",
    moderate: "border-amber-400/30 bg-amber-500/8 text-amber-200",
    poor: "border-orange-400/30 bg-orange-500/8 text-orange-200",
    disposable: "border-slate-400/30 bg-slate-500/8 text-slate-200",
};

export function formatSheetDateTime(timestamp: string | null) {
    const date = timestamp ? new Date(timestamp) : new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value || "";

    return {
        date: `${get("day")}/${get("month")}/${get("year")}`,
        time24h: `${get("hour")}:${get("minute")}`,
    };
}

export function getLifecycleStatusLabel(input: {
    decision: "approved" | "rejected";
    requestType: "borrow" | "permanent";
    lifecycleStatus?: ReturnLifecycleStatus | null;
    returnCondition?: ReturnCondition | null;
}) {
    if (input.decision === "rejected") {
        return "Rejected";
    }

    if (input.requestType === "permanent") {
        return "Permanent use";
    }

    if (input.lifecycleStatus === "returned" && input.returnCondition) {
        return getReturnedLifecycleLabel(input.returnCondition);
    }

    return "Return pending";
}

export function getSyncKeyForRequestDecision(requestId: string) {
    return `request:${requestId}:decision`;
}

export function getSyncKeyForReturnUnit(unitId: string) {
    return `borrow-unit:${unitId}`;
}
