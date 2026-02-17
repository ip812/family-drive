export interface Toast {
    code: number;
    message: string;
}

export function isToast(data: unknown): data is Toast {
    return (
        typeof data === "object" &&
        data !== null &&
        "code" in data &&
        "message" in data &&
        typeof (data as { code: unknown }).code === "number" &&
        typeof (data as { message: unknown }).message === "string"
    );
}

export class ToastError extends Error {
    toast: Toast;

    constructor(toast: Toast) {
        super(toast.message);
        this.toast = toast;
    }

    getError() {
        return this.toast;
    }
}

export const isSuccess = (t: Toast): boolean => {
    if (t.code >= 200 && t.code < 300) {
        return true;
    }
    return false;
}

export const isWarning = (t: Toast): boolean => {
    if (t.code >= 400 && t.code < 500) {
        return true;
    }
    return false;
}

export const isError = (t: Toast): boolean => {
    if (t.code >= 500) {
        return true;
    }
    return false;
}
