export type AppNotificationType =
    | "inventory_request_received"
    | "project_request_received"
    | "project_invite_received"
    | "equipment_request_approved"
    | "equipment_request_rejected"
    | "project_request_approved"
    | "project_request_rejected";

export function getNotificationHref(type: string) {
    switch (type as AppNotificationType) {
        case "inventory_request_received":
            return "/admin/requests";
        case "project_request_received":
            return "/admin/project-requests";
        case "project_invite_received":
            return "/project-invites";
        case "equipment_request_approved":
        case "equipment_request_rejected":
            return "/my-requests";
        case "project_request_approved":
            return "/projects";
        case "project_request_rejected":
            return "/projects/request";
        default:
            return "/";
    }
}

export function formatNotificationTime(value: string) {
    const date = new Date(value);
    return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}
