/**
 * While a TTS request is running, incoming small lines may be grouped
 * together up to MAX_COMBINED_BUCKET_SIZE.
 *
 * Individual lines are never split and may exceed this threshold.
 */
export class LineStreamQueue {// it combines next lines but should not exceed like 10 sec of speaking.
        private buffer = "";
        private processingQueue: Promise<void> = Promise.resolve();
        private abortController = new AbortController();
        private onLineItem: (line: string, signal: AbortSignal) => Promise<void>;
    
        private pendingCombinedLine = "";
        private isTaskRunning = false;
    
        // 🌟 CHARACTER THRESHOLD: ~150 characters translates roughly to 25-30 words (~10 seconds of spoken Arabic)
        private readonly MAX_COMBINED_BUCKET_SIZE = 150;
    
        constructor(onLineItem: (line: string, signal: AbortSignal) => Promise<void>) {
            this.onLineItem = onLineItem;
        }
    
        /**
         * Exposes the active signal so external loops can check its status if necessary
         */
        public get signal(): AbortSignal {
            return this.abortController.signal;
        }
    
        /**
         * Appends tokens, extracts lines, and dynamically handles bundling
         */
        public push(textToken: string) {
            if (this.abortController.signal.aborted) return;
            
            this.buffer += textToken;
    
            if (this.buffer.includes('\n')) {
                const lines = this.buffer.split('\n');
                this.buffer = lines.pop() || ""; 
    
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine) {
                        this.handleIncomingLine(trimmedLine);
                    }
                }
            }
        }
    
        /**
         * Decides whether to dispatch a line immediately, bundle it, or break it 
         * based on the 10-second volume threshold.
         */
        private handleIncomingLine(line: string) {
            if (this.isTaskRunning) {
                // Check if adding this new line pushes us past our 10-second threshold
                const potentialCombinedLength = (this.pendingCombinedLine ? this.pendingCombinedLine.length + 1 : 0) + line.length;
    
                if (potentialCombinedLength > this.MAX_COMBINED_BUCKET_SIZE && this.pendingCombinedLine) {
                    // 🌟 The current bucket is full (~10 seconds reached). Freeze it and queue it up immediately!
                    console.log(`[Threshold Reached (~10s)] Freezing bucket:\n"${this.pendingCombinedLine}"`);
                    
                    const fullBucket = this.pendingCombinedLine;
                    // Move the current line into a fresh bucket
                    this.pendingCombinedLine = line; 
                    
                    this.enqueueInternal(fullBucket);
                } else {
                    // Otherwise, safely combine the line with a line break
                    if (this.pendingCombinedLine) {
                        this.pendingCombinedLine += "\n" + line;
                    } else {
                        this.pendingCombinedLine = line;
                    }
                }
            } else {
                // No task is running; send it to execution straight away
                this.enqueue(line);
            }
        }
    
        /**
         * Flushes trailing characters left in the buffer
         */
        public flushRemaining() {
            if (this.abortController.signal.aborted) return;
    
            const trimmedBuffer = this.buffer.trim();
            if (trimmedBuffer) {
                this.handleIncomingLine(trimmedBuffer);
                this.buffer = "";
            }
        }
    
        /**
         * Waits for all currently running and combined sequential blocks to wrap up
         */
        public async waitForCompletion(): Promise<void> {
            await this.processingQueue;
        }
    
        /**
         * Instantly cancels all future queued items and resets the pipeline state
         */ 
        public cancel() {
            this.abortController.abort();
            this.buffer = "";
            this.pendingCombinedLine = "";
            this.isTaskRunning = false;
            this.processingQueue = Promise.resolve(); 
        }
        public reset() {
            this.abortController.abort();

            this.abortController = new AbortController()
            this.buffer = "";
            this.pendingCombinedLine = "";
            this.isTaskRunning = false;
            this.processingQueue = Promise.resolve(); 
        }
    
        private enqueue(lineToExecute: string) {
            this.isTaskRunning = true;
            this.enqueueInternal(lineToExecute);
        }
    
        /**
         * Handles the continuous chaining promise layout safely
         */
        private enqueueInternal(lineToExecute: string) {
            this.processingQueue = this.processingQueue.then(async () => {
                if (this.abortController.signal.aborted) return;
                
                this.isTaskRunning = true;
                try {
                    console.log(`[Executing TTS Request]:\n"${lineToExecute}"`);
                    await this.onLineItem(lineToExecute, this.abortController.signal);
                } finally {
                    this.isTaskRunning = false;
                    
                    // If we finished the current task and have a remaining pending bucket, roll it forward
                    if (this.pendingCombinedLine && !this.abortController.signal.aborted && !this.isTaskRunning) {
                        const nextLine = this.pendingCombinedLine;
                        this.pendingCombinedLine = ""; 
                        this.enqueue(nextLine);
                    }
                }
            });
        }
    }

/**
 * ⚙️ A generic helper utility that buffers raw text tokens, 
 * splits them by newline, and dynamically combines incoming lines 
 * while an active async task is pending.
 */
export class LineStreamQueue2 { // it combine the pending lines in one request
        private buffer = "";
        private processingQueue: Promise<void> = Promise.resolve();
        private abortController = new AbortController();
        private onLineItem: (line: string, signal: AbortSignal) => Promise<void>;
    
        // 🌟 Tracks lines waiting for execution during a pending task
        private pendingCombinedLine = "";
        private isTaskRunning = false;
    
        constructor(onLineItem: (line: string, signal: AbortSignal) => Promise<void>) {
            this.onLineItem = onLineItem;
        }
    
        /**
         * Exposes the active signal so external loops can check its status if necessary
         */
        public get signal(): AbortSignal {
            return this.abortController.signal;
        }
    
        /**
         * Appends tokens, extracts lines, and dynamically handles bundling
         */
        public push(textToken: string) {
            if (this.abortController.signal.aborted) return;
            
            this.buffer += textToken;
    
            if (this.buffer.includes('\n')) {
                const lines = this.buffer.split('\n');
                this.buffer = lines.pop() || ""; 
    
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine) {
                        this.handleIncomingLine(trimmedLine);
                    }
                }
            }
        }
    
        /**
         * Decides whether to dispatch a line immediately or bundle it
         */
        private handleIncomingLine(line: string) {
                if (this.isTaskRunning) {
                    // 🌟 FIX: Combine lines using a newline '\n' instead of a space ' '
                    if (this.pendingCombinedLine) {
                        this.pendingCombinedLine += "\n" + line;
                    } else {
                        this.pendingCombinedLine = line;
                    }
                } else {
                    this.enqueue(line);
                }
            }
    
        /**
         * Flushes trailing characters left in the buffer
         */
        public flushRemaining() {
            if (this.abortController.signal.aborted) return;
    
            const trimmedBuffer = this.buffer.trim();
            if (trimmedBuffer) {
                this.handleIncomingLine(trimmedBuffer);
                this.buffer = "";
            }
        }
    
        /**
         * Waits for all currently running and combined sequential blocks to wrap up
         */
        public async waitForCompletion(): Promise<void> {
            await this.processingQueue;
        }
    
        /**
         * Instantly cancels all future queued items and resets the pipeline state
         */
        public cancel() {
            this.abortController.abort();
            this.buffer = "";
            this.pendingCombinedLine = "";
            this.isTaskRunning = false;
            this.processingQueue = Promise.resolve(); 
        }
    
        private enqueue(lineToExecute: string) {
            this.isTaskRunning = true;
    
            this.processingQueue = this.processingQueue.then(async () => {
                if (this.abortController.signal.aborted) return;
                
                try {
                    console.log(`[Executing Task]: "${lineToExecute}"`);
                    await this.onLineItem(lineToExecute, this.abortController.signal);
                } finally {
                    // Task finished! Check if lines bundled up while we were busy
                    this.isTaskRunning = false;
                    
                    if (this.pendingCombinedLine && !this.abortController.signal.aborted) {
                        const nextLine = this.pendingCombinedLine;
                        this.pendingCombinedLine = ""; // Clear state before re-entering queue
                        this.enqueue(nextLine);
                    }
                }
            });
        }
    }
/**
 * ⚙️ A generic helper utility that buffers raw text tokens, 
 * splits them by newline, and executes tasks sequentially.
 */
export class LineStreamQueue1 {
        private buffer = "";
        private processingQueue: Promise<void> = Promise.resolve();
        private abortController = new AbortController();
        private onLineItem: (line: string, signal: AbortSignal) => Promise<void>;
    
        constructor(onLineItem: (line: string, signal: AbortSignal) => Promise<void>) {
            this.onLineItem = onLineItem;
        }
    
        /**
         * Exposes the active signal so external loops can check its status if necessary
         */
        public get signal(): AbortSignal {
            return this.abortController.signal;
        }
    
        /**
         * Appends tokens and queues complete lines
         */
        public push(textToken: string) {
            if (this.abortController.signal.aborted) return;
            
            this.buffer += textToken;
    
            if (this.buffer.includes('\n')) {
                const lines = this.buffer.split('\n');
                this.buffer = lines.pop() || ""; 
    
                for (const line of lines) {
                        if (line.trim()) {
                            console.log(`(${line})`)
                        this.enqueue(line);
                    }
                }
            }
        }
    
        /**
         * Flushes trailing un-split characters left in the buffer
         */
        public flushRemaining() {
            if (this.abortController.signal.aborted) return;
    
            if (this.buffer.trim()) {
                this.enqueue(this.buffer);
                this.buffer = "";
            }
        }
    
        /**
         * Waits for all currently running sequential blocks to finish up
         */
        public async waitForCompletion(): Promise<void> {
            await this.processingQueue;
        }
    
        /**
         * 🌟 Instantly cancels all future queued items and aborts active network streams
         */
        public cancel() {
            this.abortController.abort();
            this.buffer = "";
            // Reset the queue chain to clear memory references
            this.processingQueue = Promise.resolve(); 
        }
    
        private enqueue(line: string) {
            this.processingQueue = this.processingQueue.then(async () => {
                // Guard clause: stop execution if this queue pipeline was canceled midway
                if (this.abortController.signal.aborted) return;
                
                // Pass the signal down so the underlying task (e.g., Gemini fetch) can abort
                await this.onLineItem(line, this.abortController.signal);
            });
        }
    }
