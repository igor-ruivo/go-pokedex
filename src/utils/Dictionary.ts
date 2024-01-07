export default interface Dictionary<T> {
    [key: string]: T
}

export const cloneDictionary = <T>(original: Dictionary<T>) => {
    const cloned: Dictionary<T> = {};

    for (const key in original) {
        if (original.hasOwnProperty(key)) {
            cloned[key] = original[key];
        }
    }

    return cloned;
}