import type { Toast } from ".";

export const successOk = (message: string): Toast => {
    return {
        code: 200,
        message: message
    };
};

export const successCreated = (message: string): Toast => {
    return {
        code: 201,
        message: message
    };
};
