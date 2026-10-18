import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  icon: string;
  duration: number;
  closing?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  show(
    type: ToastType,
    message: string,
    title?: string,
    duration: number = 3800,
  ) {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const defaultTitle =
      type === 'success'
        ? 'Success'
        : type === 'error'
          ? 'Error'
          : type === 'warning'
            ? 'Warning'
            : 'Information';

    const icon =
      type === 'success'
        ? 'pi pi-check-circle'
        : type === 'error'
          ? 'pi pi-times-circle'
          : type === 'warning'
            ? 'pi pi-exclamation-triangle'
            : 'pi pi-info-circle';

    const toast: ToastMessage = {
      id,
      type,
      title: title || defaultTitle,
      message,
      icon,
      duration,
    };

    // Add to start of list (newest on top) or end
    this.toasts.update((items) => [...items, toast]);

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  success(message: string, title: string = 'Success', duration: number = 3800) {
    return this.show('success', message, title, duration);
  }

  error(message: string, title: string = 'Error', duration: number = 5000) {
    return this.show('error', message, title, duration);
  }

  info(message: string, title: string = 'Information', duration: number = 3800) {
    return this.show('info', message, title, duration);
  }

  warning(message: string, title: string = 'Warning', duration: number = 4500) {
    return this.show('warning', message, title, duration);
  }

  dismiss(id: string) {
    this.toasts.update((items) =>
      items.map((t) => (t.id === id ? { ...t, closing: true } : t)),
    );
    setTimeout(() => {
      this.toasts.update((items) => items.filter((t) => t.id !== id));
    }, 250);
  }

  clearAll() {
    this.toasts.set([]);
  }
}
