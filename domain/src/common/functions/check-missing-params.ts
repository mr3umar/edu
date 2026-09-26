export const checkMissingParams = <ParamsT>(params: ParamsT, mandatory: (keyof ParamsT)[]) => {
    const missingParams: (keyof ParamsT | '*')[] = [];

    if (!params) {
        missingParams.push('*');
    }

    for (const k of mandatory) {
        if (params[k] === undefined || params[k] === '' || params[k] === null) {
            missingParams.push(k);
        }
    }
    return missingParams;
};
