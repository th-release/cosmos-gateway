export function safeJSONStringify(obj: any): string {
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'bigint') {
            return value.toString();
        }
        return value;
    });
}

export function canonicalJsonStringify(obj: any): string {
    if (obj === undefined) {
        return "undefined";
    }
    if (obj === null) {
        return "null";
    }
    if (typeof obj !== 'object') {
        return JSON.stringify(obj);
    }

    const sortedKeys = Object.keys(obj).sort();
    const sortedObject: { [key: string]: any } = {};
    for (const key of sortedKeys) {
        sortedObject[key] = obj[key];
    }
    return JSON.stringify(sortedObject);
}