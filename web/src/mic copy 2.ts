import { useRef, useState } from "react";
import type { Socket } from "./socket";
import { MicVAD } from "@ricky0123/vad-web";


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

        // 🛑 TRACK RUNNING AUDIO SOURCES FOR CANCELLATION
        let activeSourcesQueue: AudioBufferSourceNode[] = []

        let lastVoiceActivityRef = 0
        const FRONTEND_HANGOVER_MS = 3000; // Keep channel open for 3000ms after you stop speaking

        const websocket = socket.getSocket()

        if (isListening) return;

        // 🛑 MUTEX HELPER TO WIPE OUT CURRENT PLAYBACK (INTERRUPTION)
        const clearActiveAudioPlayback = () => {
                console.log("⚡ [Barge-In] Interrupting AI speech. Clearing playback queue.");
                
                // 1. Force halt every single source node scheduled in the AudioContext pipeline
                activeSourcesQueue.forEach((source) => {
                        try {
                                source.stop();
                        } catch (e) {
                                // Source might have already finished playing naturally
                        }
                });
                
                // 2. Empty out the queue tracking array
                activeSourcesQueue = [];
                
                // 3. Reset the scheduling pointer completely back to zero
                nextStartTimeRef = 0;
        };

        // Handle a server-side signal to stop playback if the backend detects speech first
        // socket.getSocket()!.on('message', (data: any) => {
        //         try {
        //                 const msg = JSON.parse(data.toString());
        //                 if (msg.event === 'clear_buffer' || msg.type === 'input_audio_buffer.speech_started') {
        //                         clearActiveAudioPlayback();
        //                 }
        //         } catch(e) {}
        // });

        socket.onIncomingAudio(async (base64Data: string) => {
                if (!audioContextRef) {
                        audioContextRef = new (window.AudioContext || (window as any).webkitAudioContext)();
                }
                const ctx = audioContextRef;
                if (ctx.state === 'suspended') await ctx.resume();

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

                const audioBuffer = ctx.createBuffer(1, int16Array.length, 24000);
                const channelData = audioBuffer.getChannelData(0);
                for (let i = 0; i < int16Array.length; i++) {
                        channelData[i] = int16Array[i] / 32768.0;
                }

                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                // If our queue tracker was reset by an interruption, synchronize back up with clock
                if (nextStartTimeRef < systemTime) {
                        nextStartTimeRef = systemTime;
                }

                const actualExecutionScheduledTime = nextStartTimeRef;

                // 🛑 Track this node so we can stop it if the user interrupts later
                activeSourcesQueue.push(source);
                source.onended = () => {
                        // Clean up reference when done playing to prevent memory bloating
                        activeSourcesQueue = activeSourcesQueue.filter(item => item !== source);
                };

                source.start(actualExecutionScheduledTime);
                nextStartTimeRef += audioBuffer.duration;

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

                audioContextRef = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const ctx = audioContextRef;

                if (ctx.state === 'suspended') {
                        await ctx.resume();
                }

                await ctx.audioWorklet.addModule('/pcm-processor.js');
                micSourceRef = ctx.createMediaStreamSource(stream);

                const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
                workletNodeRef = workletNode;

                workletNode.port.onmessage = (e) => {
                        const rawArrayBuffer = e.data;
                        const base64String = arrayBufferToBase64(rawArrayBuffer);
                        const int16Samples = new Int16Array(rawArrayBuffer);

                        let totalAbsoluteVolume = 0;
                        for (let i = 0; i < int16Samples.length; i++) {
                                totalAbsoluteVolume += Math.abs(int16Samples[i]);
                        }

                        const currentChunkVolume = totalAbsoluteVolume / int16Samples.length;
                        const now = Date.now();

                        // 🎙️ VOICE ACTIVITY DETECTION (VAD)
                        if (currentChunkVolume >= 1000) {
                                lastVoiceActivityRef = now;
                                
                                // 🛑 TRIGGER IMMEDIATE INTERRUPTION
                                // If the AI is currently talking, clear its playback buffers instantly 
                                // the exact millisecond the local microphone registers audio input.
                                if (activeSourcesQueue.length > 0) {
                                        clearActiveAudioPlayback();
                                        
                                        // Optional: Send an interruption signal up to the server if needed
                                        if (websocket?.readyState === WebSocket.OPEN) {
                                                websocket.send(JSON.stringify({ event: 'user_interrupted' }));
                                        }
                                }
                        }

                        const msSinceLastSpeech = now - lastVoiceActivityRef;

                        if (currentChunkVolume < 1000 && msSinceLastSpeech > FRONTEND_HANGOVER_MS) {
                                return; 
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