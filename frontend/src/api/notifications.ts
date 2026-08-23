import { apiRequest } from '@/api/client';
import type { AppNotification } from '@/types';

export function fetchNotifications(token: string, unreadOnly = false) {
    const query = unreadOnly ? '?unread=true' : '';
    return apiRequest<AppNotification[]>(`/notifications${query}`, {}, token);
}

export function fetchUnreadCount(token: string) {
    return apiRequest<{ count: number }>('/notifications/unread-count', {}, token);
}

export function markNotificationRead(token: string, id: string) {
    return apiRequest<AppNotification>(`/notifications/${id}/read`, { method: 'POST' }, token);
}

export function markAllNotificationsRead(token: string) {
    return apiRequest<{ updated: number }>('/notifications/read-all', { method: 'POST' }, token);
}
