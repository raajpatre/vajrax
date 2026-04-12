export const APPLICANT_REVIEW_ROLES = ["faculty", "president", "vice_president"] as const;

export function isApplicantReviewer(role: string | null | undefined) {
    return !!role && APPLICANT_REVIEW_ROLES.includes(role as (typeof APPLICANT_REVIEW_ROLES)[number]);
}

export function normalizeApplicantEmail(email: string) {
    return email.trim().toLowerCase();
}

export function getApplicantDisplayName(firstName: string, lastName: string) {
    return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim();
}
