import { useRef, useState } from "react";
import type { Socket } from "./socket";


let _mic: any
export const startLiveConversation = async (socket: Socket) => {

        if (_mic) {
                return _mic
        }

        _mic = {}
        
        let isListening = false
        let audioContextRef: AudioContext | undefined;
        let micSourceRef: MediaStreamAudioSourceNode | undefined
        let localStreamRef: MediaStream | undefined
        let workletNodeRef: AudioWorkletNode | undefined
        let activeReferences: string[] = []

        // Track continuous playback block boundaries
        let nextStartTimeRef = 0

        let lastVoiceActivityRef = 0
        const FRONTEND_HANGOVER_MS = 3000; // Keep channel open for 400ms after you stop speaking

        const websocket = socket.getSocket()

        // if (!socket.isConnected() || !socket.getSocket()) return;
        if (isListening) return;


        socket.onIncomingAudio(async (base64Data: string) => {
                if (!audioContextRef) {
                        audioContextRef = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const ctx = audioContextRef;
                if (ctx.state === 'suspended') await ctx.resume();

                // 1. Log receipt and track baseline metrics
                const arrivalTime = performance.now();
                const systemTime = ctx.currentTime;

                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                }

                const int16Array = new Int16Array(bytes.buffer);
                if (int16Array.length === 0) {
                        console.warn('⚠️ [Audio Log] Received empty audio payload packet.');
                        return;
                }

                // 2. Build the 24kHz target node container
                const audioBuffer = ctx.createBuffer(1, int16Array.length, 24000);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < int16Array.length; i++) {
                        channelData[i] = int16Array[i] / 32768.0;
                }

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                // 3. Evaluate Timeline Drift Metrics Before Playing
                const plannedStartTimeBeforeSync = nextStartTimeRef;
                let didTimeSyncTrigger = false;

                // DELAY VALVE CHECK
                if (nextStartTimeRef < systemTime) {
                        nextStartTimeRef = systemTime;
                        didTimeSyncTrigger = true;
                }

                const actualExecutionScheduledTime = nextStartTimeRef;

                // Calculate how far in the future or past this buffer was about to stack up
                const initialDriftOffset = plannedStartTimeBeforeSync - systemTime;

                // 4. Output precise timeline logs to the Inspector
                // console.log(
                //   `📥 [Audio Packet] Size: ${int16Array.length} samples | Duration: ${(audioBuffer.duration * 1000).toFixed(1)}ms\n` +
                //   `   └─ System Clock (ctx.currentTime): ${systemTime.toFixed(3)}s\n` +
                //   `   └─ Planned Queue Spot (Before Sync): ${plannedStartTimeBeforeSync.toFixed(3)}s\n` +
                //   `   └─ Virtual Drift Delta: ${initialDriftOffset >= 0 ? '+' : ''}${initialDriftOffset.toFixed(3)}s ${initialDriftOffset < 0 ? '🔴 (FALLING BEHIND!)' : '🟢 (Safe)'}\n` +
                //   `   └─ Forced Time Synchronization Triggered: ${didTimeSyncTrigger ? '⚠️ YES (Backlog Cleared!)' : '✅ NO (Stable Flow)'}\n` +
                //   `   └─ Final Scheduled Playback Timestamp: ${actualExecutionScheduledTime.toFixed(3)}s`
                // );

                // 5. Fire off the source trigger
                source.start(actualExecutionScheduledTime);

                // Adjust scheduling pointer forward by chunk size duration
                nextStartTimeRef += audioBuffer.duration;

                // Measure background overhead calculation time
                const runtimeOverhead = performance.now() - arrivalTime;
                if (runtimeOverhead > 5) {
                        console.warn(`⏳ [Performance Alert] JS thread overhead took ${runtimeOverhead.toFixed(2)}ms to decode this frame.`);
                }
        })

        console.log('Live Session Active. Start speaking...');
        isListening = true

        try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                localStreamRef = stream;

                // Ingest mic data using standard 16kHz
                audioContextRef = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const ctx = audioContextRef;


                if (ctx.state === 'suspended') {
                        await ctx.resume();
                }

                // Load the processor file from our public asset directory
                await ctx.audioWorklet.addModule('/pcm-processor.js');

                micSourceRef = ctx.createMediaStreamSource(stream);

                // Instantiate our worker thread processor node
                const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
                workletNodeRef = workletNode;

                // Listen for the fast PCM packets coming out of the worker
                workletNode.port.onmessage = (e) => {
                        const rawArrayBuffer = e.data;
                        // const base64String = btoa(String.fromCharCode(...new Uint8Array(rawArrayBuffer)));
                        const base64String = arrayBufferToBase64(rawArrayBuffer);

                        // 1. Convert ArrayBuffer to an explicit Int16 view to calculate sound amplitude
                        const int16Samples = new Int16Array(rawArrayBuffer);

                        let totalAbsoluteVolume = 0;
                        for (let i = 0; i < int16Samples.length; i++) {
                                totalAbsoluteVolume += Math.abs(int16Samples[i]);
                        }

                        // Calculate the mathematical average amplitude level of this specific mic block
                        const currentChunkVolume = totalAbsoluteVolume / int16Samples.length;
                        const now = Date.now();

                        // 🎙️ VOICE ACTIVITY DETECTION (VAD)
                        // If the volume exceeds 25, the client is actively speaking!
                        if (currentChunkVolume >= 1000) {
                                lastVoiceActivityRef = now;
                        }

                        // Calculate how many milliseconds have passed since you last spoke
                        const msSinceLastSpeech = now - lastVoiceActivityRef;

                        // 🛑 THE VOID VOICE FILTER
                        // If the chunk is quiet (under 25) AND your 400ms trailing padding window has expired,
                        // we immediately DROP the chunk locally, completely bypassing Base64 encoding and network transmission.
                        if (currentChunkVolume < 1000 && msSinceLastSpeech > FRONTEND_HANGOVER_MS) {
                                return; // Stop execution right here—the packet is safely discarded
                        }
                        if (websocket?.readyState === WebSocket.OPEN) {
                                if (websocket.bufferedAmount < 1024 * 1024) {

                                        websocket.send(JSON.stringify({
                                                event: 'audio',
                                                data: base64String
                                        }));
                                }
                        }
                };

                micSourceRef.connect(workletNode);
                workletNode.connect(ctx.destination);

        } catch (err) {
                console.error('Failed to capture audio thread:', err);
        }

        _mic = {}


        return _mic
};



function arrayBufferToBase64(buffer: ArrayBuffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';

        const chunkSize = 0x8000;

        for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }

        return btoa(binary);

}