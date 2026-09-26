export class Deferred<T> {
    _resolve?: (value: T | PromiseLike<T>) => void;

    _reject?: (reason?: any) => void;

    promise!: Promise<T>;

    constructor() {
        this.promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });

        // Prevent unhandled rejection if never consumed
        this.promise.catch(() => {});
    }

    resolve(value: T | PromiseLike<T>) {
        if (this._resolve) {
            this._resolve(value);
        }
    }

    reject(reason?: any) {
        if (this._reject) {
            this._reject(reason);
        }
    }
}
