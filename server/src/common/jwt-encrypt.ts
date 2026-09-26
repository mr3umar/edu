import * as jwt from 'jsonwebtoken';

const jwtSecretKey = '9232edbf94424a62b6b334eb5a06936b'; //process.env.JWT_SECRET_KEY;

export const encrypt = (data: any) => {
    const token = (jwt as any).default.sign(data, jwtSecretKey);

    return token;
};

export const decrypt = <T>(token: string) => {
    const data = (jwt as any).default.decode(token, jwtSecretKey);

    return data as T;
};
