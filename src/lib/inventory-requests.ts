export const RETURN_CONDITIONS = [
    "perfect",
    "partly_damaged",
    "trash",
] as const;

export type ReturnCondition = (typeof RETURN_CONDITIONS)[number];

// Giving condition (condition of a unit when it is handed out) shares the same
// vocabulary as the return condition.
export const GIVING_CONDITIONS = RETURN_CONDITIONS;
export type GivingCondition = ReturnCondition;

export type ReturnLifecycleStatus = "return_pending" | "returned";

// Status used on the Google Sheet rows for non-consumable (borrow) items.
export type SheetItemStatus =
    | "borrowed"
    | "returned"
    | "discarded"
    | "permanent"
    | "given"
    | "rejected";

export type SheetItemType = "consumable" | "non_consumable";

export function getConditionLabel(condition: ReturnCondition) {
    switch (condition) {
        case "perfect":
            return "Perfect";
        case "partly_damaged":
            return "Partly damaged";
        case "trash":
            return "Trash";
    }
}

// Kept for backwards-compatible call sites.
export function getReturnConditionLabel(condition: ReturnCondition) {
    return getConditionLabel(condition);
}

export function getGivingConditionLabel(condition: GivingCondition) {
    return getConditionLabel(condition);
}

export function getReturnedLifecycleLabel(condition: ReturnCondition) {
    return `Returned in ${getConditionLabel(condition)} condition`;
}

// A returned unit only restocks inventory when it comes back usable.
export function isRestockableCondition(condition: ReturnCondition) {
    return condition === "perfect" || condition === "partly_damaged";
}

export function getPreferredName(input: { display_name?: string | null; username?: string | null } | null) {
    if (!input) {
        return "Unknown user";
    }

    return input.username?.trim() || input.display_name?.trim() || "Unknown user";
}

export const CONDITION_COLORS: Record<ReturnCondition, string> = {
    perfect: "#22c55e",
    partly_damaged: "#f59e0b",
    trash: "#ef4444",
};

export const returnConditionBadgeClass: Record<ReturnCondition, string> = {
    perfect: "text-emerald-300 bg-emerald-500/10 border-emerald-400/30",
    partly_damaged: "text-amber-300 bg-amber-500/10 border-amber-400/30",
    trash: "text-red-300 bg-red-500/10 border-red-400/30",
};

export const returnConditionAccentClass: Record<ReturnCondition, string> = {
    perfect: "border-emerald-400/30 bg-emerald-500/8 text-emerald-200",
    partly_damaged: "border-amber-400/30 bg-amber-500/8 text-amber-200",
    trash: "border-red-400/30 bg-red-500/8 text-red-200",
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

// Derives the sheet "status" cell (borrowed / returned / discarded / …).
export function getSheetItemStatus(input: {
    decision: "approved" | "rejected";
    isConsumable: boolean;
    requestType: "borrow" | "permanent";
    lifecycleStatus?: ReturnLifecycleStatus | null;
    returnCondition?: ReturnCondition | null;
}): SheetItemStatus {
    if (input.decision === "rejected") {
        return "rejected";
    }

    if (input.isConsumable) {
        return "given";
    }

    if (input.requestType === "permanent") {
        return "permanent";
    }

    if (input.lifecycleStatus === "returned") {
        return input.returnCondition === "trash" ? "discarded" : "returned";
    }

    return "borrowed";
}

export function getSyncKeyForRequestDecision(requestId: string) {
    return `request:${requestId}:decision`;
}

export function getSyncKeyForReturnUnit(unitId: string) {
    return `borrow-unit:${unitId}`;
}
