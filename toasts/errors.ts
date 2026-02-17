import type { Toast } from ".";

export const ErrConnectionToDatabase: string = "There is an error with connecting to the database";

export const errorInternalServerError = (message: string): Toast => {
    return {
        code: 500,
        message: message
    };
};
