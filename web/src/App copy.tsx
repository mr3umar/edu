import { useState, useRef, useEffect } from 'react';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Disconnected');

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Track scheduled playback time to prevent audio chunks from overlapping or gaping
  const nextStartTimeRef = useRef<number>(0);

  // 1. Establish Backend Connection Loop
  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setStatus('Connected & Stable. Click "Go Live" to talk!');
    };

    socket.onmessage = (event) => {
      const packet = JSON.parse(event.data);
      
      if (packet.event === 'status') {
        setStatus(packet.data);
      } else if (packet.event === 'audio') {
        // FIX: Route the raw base64 data to the streaming PCM pipeline
        handleIncomingPCMFrame(packet.data);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setStatus('Disconnected from backend proxy server.');
    };

    return () => socket.close();
  }, []);

  // 🔊 FIX: Decode and queue raw, headerless 24kHz 16-bit PCM bytes
  const handleIncomingPCMFrame = (base64Data: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;

    // Convert Base64 string to a raw binary byte array
    const binaryString = atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert raw bytes to Int16 values (2 bytes per sample, Little-Endian)
    const int16Array = new Int16Array(bytes.buffer);
    
    if (int16Array.length === 0) return;

    // Create an audio buffer specifically tailored for Gemini's 24kHz stream rate
    const sampleRate = 24000; 
    const audioBuffer = ctx.createBuffer(1, int16Array.length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Convert Int16 integers [-32768, 32767] back to Browser Float32 decimals [-1.0, 1.0]
    for (let i = 0; i < int16Array.length; i++) {
      channelData[i] = int16Array[i] / 32768.0;
    }

    // Schedule the buffer into the Audio Context timeline
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Synchronize timing to ensure continuous, gapless playback
    const currentTime = ctx.currentTime;
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime;
    }

    source.start(nextStartTimeRef.current);
    
    // Increment tracking pointer by the duration of the scheduled buffer block
    nextStartTimeRef.current += audioBuffer.duration;
  };

  // 🎙️ Start Capturing and Streaming Microphone Input (16kHz Input)
  const startLiveConversation = async () => {
    if (!isConnected || !socketRef.current) return;

    // Resume context if browser suspended it due to autoplay policies
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    setStatus('Live Session Active. Start speaking...');
    setIsListening(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Gemini Live ingestion likes native 16kHz audio layouts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const ctx = audioContextRef.current;

      micSourceRef.current = ctx.createMediaStreamSource(stream);
      processorRef.current = ctx.createScriptProcessor(2048, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 recording down to 16-bit Signed Integer PCM for Gemini
        const pcmBuffer = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmBuffer[i] = Math.min(1, Math.max(-1, inputData[i])) * 0x7FFF;
        }

        const binaryString = String.fromCharCode(...new Uint8Array(pcmBuffer.buffer));
        const base64String = btoa(binaryString);

        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(JSON.stringify({
            event: 'audio',
            data: base64String
          }));
        }
      };

      micSourceRef.current.connect(processorRef.current);
      processorRef.current.connect(ctx.destination);

    } catch (err) {
      console.error('Failed to capture audio stream:', err);
      setStatus('Microphone initialization failed.');
    }
  };

  const stopLiveConversation = () => {
    setIsListening(false);
    setStatus('Streaming paused.');

    if (processorRef.current) processorRef.current.disconnect();
    if (micSourceRef.current) micSourceRef.current.disconnect();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Gemini Live Walkie-Talkie Loop</h2>
      
      <div style={{ padding: '15px', backgroundColor: isConnected ? '#e2f0d9' : '#fce4d6', borderRadius: '5px', marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>

      <div>
        <img src='./page-35.png' width="100%"></img>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button
          onClick={startLiveConversation}
          disabled={!isConnected || isListening}
          style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '5px' }}
        >
          Go Live 🎙️
        </button>
        
        <button
          onClick={stopLiveConversation}
          disabled={!isListening}
          style={{ padding: '12px 24px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px' }}
        >
          Mute Stream 🛑
        </button>
      </div>
    </div>
  );
}

export default App;
