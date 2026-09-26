export class Deferred<T> {
    _resolve?: (value: T | PromiseLike<T>) => void;

    _reject?: (reason?: any) => void;
    resolved = false;
    timeout: any;

    promise!: Promise<T>;

    constructor(timeout?: { timeout: number; message: string; callback: () => void }) {
        this.promise = new Promise<T>((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        
        // Prevent unhandled rejection if never consumed
        this.promise.catch(() => {});

        if (timeout) {
            this.timeout = setTimeout(() => {
                if (this.resolved) return;
                timeout.callback();
                this.reject(new Error(`TIMEOUT: ${timeout.message}`));
            }, timeout.timeout);
        }
    }

    resolve(value: T | PromiseLike<T>) {
        if (this.timeout) {
            clearTimeout(this.timeout)
        }
        this.resolved = true;
        if (this._resolve) {
            this._resolve(value);
        }
    }

    reject(reason?: Error) {
        if (this.timeout) {
            clearTimeout(this.timeout)
        }
        if (this._reject) {
            this._reject(reason);
        }
    }
}
