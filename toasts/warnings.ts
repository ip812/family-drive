import type { Toast } from ".";

export const WarnEmailUnvalid: string = "Email is invalid";

export const warningBadRequest = (message: string): Toast => {
    return {
        code: 400,
        message: message
    };
};

export const warningNotFound = (message: string): Toast => {
    return {
        code: 404,
        message: message
    };
};
