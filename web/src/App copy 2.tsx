import { useState, useRef, useEffect } from 'react';

const PAGE_NUM = import.meta.env.VITE_PAGE_NUM;

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Disconnected');

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const micSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  
  // Track continuous playback block boundaries
  const nextStartTimeRef = useRef<number>(0);

  // 1. Add an execution state holder at the top of your React App component
  // const [currentDrawingSVG, setCurrentDrawingSVG] = useState<string | null>(null);
  const [currentDrawingSVGList, setCurrentDrawingSVGList] = useState<string[]>([]);
  const [activeReferences, setActiveReferences] = useState<string[]>([]);  


  // 🛠️ NEW BOARD STATES: Tracks structural visibility and stores multiple drawings consecutively
  const [isBoardOpen, setIsBoardOpen] = useState<boolean>(false);
  const [boardDrawingsList, setBoardDrawingsList] = useState<{id: string; title: string; steps: {stepNumber: number; svgCode: string}[]; currentIndex: number}[]>([]);

  const lastVoiceActivityRef = useRef<number>(0);
  const FRONTEND_HANGOVER_MS = 3000; // Keep channel open for 400ms after you stop speaking
  
  const [laserStatus, setLaserStatus] = useState<boolean>(true);
  const laserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8080');
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
      setStatus('Connected & Instant. Click "Go Live"!');
    };

    socket.onmessage = (event) => {
      const packet = JSON.parse(event.data);
      if (packet.event === 'audio') {
        handleIncomingPCMFrame(packet.data);
      } else if (packet.event === 'status') {
        setStatus(packet.data);
      } else if (packet.event === 'writeOnBook') {
        console.log('📥 Visual SVG Payload layer received from vector engine.');
        let svgString = packet.data;
      
        // Ensure the incoming layer matches absolute width scaling boundaries safely
        if (svgString.includes('<svg') && !svgString.includes('width=')) {
          svgString = svgString.replace('<svg', '<svg width="100%" height="100%"');
        }
      
        // ⚡ CRITICAL FIX: Append the new structural layer string to the list array
        setCurrentDrawingSVGList((prevList) => [...prevList, svgString]);
      } else if (packet.event === 'reference_tag') {
        // 🛠️ PARSE THE JSON ARRAY FROM GEMINI'S TEXT CHUNK
        // Example string input: '[REF_ID: ["XYZ-123", "ABC-456"]]'
        const textChunk = packet.data;
        
        console.log(textChunk)
        const ids = JSON.parse(textChunk)
        setActiveReferences(ids)
        // if (textChunk.includes('[REF_ID:')) {
        //   try {
        //     // Extract the raw JSON array string between the brackets
        //     const startIdx = textChunk.indexOf('[REF_ID:') + 8;
        //     const endIdx = textChunk.lastIndexOf(']');
        //     const jsonArrayString = textChunk.substring(startIdx, endIdx).trim();
            
        //     const parsedIDs = JSON.parse(jsonArrayString);
        //     if (Array.isArray(parsedIDs)) {
        //       console.log('🎯 Active Reference IDs changed to:', parsedIDs);
        //       setActiveReferences(parsedIDs);
        //     }
        //   } catch (e) {
        //     // Handle cases where the text chunk is split across network packets
        //     console.warn('Reference tag parsing skipped for incomplete chunk segment.');
        //   }
        // }
      }


      // 🛠️ CATCH THE DRAW ON BOARD EVENT ACTION
      // else if (packet.event === 'drawOnBoard') {
      //   console.log('📥 Received new board vector graphics chunk.');
        
      //   // 1. Pop up the sliding board view automatically from the bottom
      //   setIsBoardOpen(true);
        
      //   // 2. Append the new chunk to the state list array (PRESERVES EXISTING CONTENT)
      //   setBoardDrawingsList((prevList) => [...prevList.filter(d => d.id != packet.drawingId), {id: packet.drawingId, code: packet.data}]);
      // }
      else if (packet.event === 'startTutorial') {
        
        // 1. Pop up the sliding board view automatically from the bottom
        setIsBoardOpen(true);
        
        // 2. Append the new chunk to the state list array (PRESERVES EXISTING CONTENT)
        console.log(packet)
        setBoardDrawingsList((prevList) => [...prevList.filter(d => d.id != packet.tutorialId), {id: packet.tutorialId, ...packet.data, currentIndex: 0}]);
      }
      else if (packet.event === 'showTutorialStep') {
        
        // 1. Pop up the sliding board view automatically from the bottom
        setIsBoardOpen(true);
        
        // 2. Append the new chunk to the state list array (PRESERVES EXISTING CONTENT)
        console.log(packet)

        setBoardDrawingsList(prevList =>prevList.map(item =>
            item.id === packet.tutorialId || true
              ? { ...item, currentIndex: packet.stepNumber - 1 }
              : item
          ))


          console.log(boardDrawingsList.values)
      }

      else if (packet.event === 'showLaser') {
        
        setLaserStatus(true)
        laserRef.current.style.top = `${packet.y}px`
        laserRef.current.style.left = `${packet.x}px`
      }
    }

    socket.onclose = () => {
      setIsConnected(false);
      setStatus('Disconnected from backend.');
    };

    return () => socket.close();
  }, []);

  // 🔊 Instant Lookahead PCM Playback Queue
  // 🔊 FIX: Instant Zero-Delay Audio Scheduler
  const LOOKAHEAD = 0.12; // 120ms jitter buffer
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>(
    []
  );
  // 🔊 Diagnostic-Ready Audio Scheduler
const handleIncomingPCMFrame = async (base64Data: string) => {
  if (!audioContextRef.current) {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  const ctx = audioContextRef.current;
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
  const plannedStartTimeBeforeSync = nextStartTimeRef.current;
  let didTimeSyncTrigger = false;

  // DELAY VALVE CHECK
  if (nextStartTimeRef.current < systemTime) {
    nextStartTimeRef.current = systemTime;
    didTimeSyncTrigger = true;
  }

  const actualExecutionScheduledTime = nextStartTimeRef.current;
  
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
  nextStartTimeRef.current += audioBuffer.duration;

  // Measure background overhead calculation time
  const runtimeOverhead = performance.now() - arrivalTime;
  if (runtimeOverhead > 5) {
    console.warn(`⏳ [Performance Alert] JS thread overhead took ${runtimeOverhead.toFixed(2)}ms to decode this frame.`);
  }
};

  const handleIncomingPCMFrame5 = async (
    base64Data: string
  ) => {
    console.log(
      '---------------- PCM FRAME ----------------'
    );
  
    const wallNow = performance.now();
  
    console.log('FRAME RECEIVED:', wallNow);
  
    if (!audioContextRef.current) {
      console.log('Creating AudioContext');
  
      audioContextRef.current =
        new AudioContext({
          sampleRate: 24000,
        });
  
      await audioContextRef.current.resume();
  
      console.log(
        'AudioContext state:',
        audioContextRef.current.state
      );
    }
  
    const ctx = audioContextRef.current;
  
    console.log(
      'ctx.currentTime:',
      ctx.currentTime
    );
  
    // Decode base64
    const binaryString = atob(base64Data);
  
    console.log(
      'binary length:',
      binaryString.length
    );
  
    const bytes = new Uint8Array(
      binaryString.length
    );
  
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
  
    console.log(
      'byteLength:',
      bytes.byteLength
    );
  
    const pcmData = new Int16Array(
      bytes.buffer,
      bytes.byteOffset,
      Math.floor(bytes.byteLength / 2)
    );
  
    console.log(
      'pcm samples:',
      pcmData.length
    );
  
    if (!pcmData.length) {
      console.log('EMPTY PCM');
      return;
    }
  
    const audioBuffer = ctx.createBuffer(
      1,
      pcmData.length,
      24000
    );
  
    console.log(
      'audio duration:',
      audioBuffer.duration
    );
  
    const channelData =
      audioBuffer.getChannelData(0);
  
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768;
    }
  
    const source = ctx.createBufferSource();
  
    source.buffer = audioBuffer;
  
    source.connect(ctx.destination);
  
    const now = ctx.currentTime;
  
    console.log(
      'nextStartTime BEFORE:',
      nextStartTimeRef.current
    );
  
    if (
      !nextStartTimeRef.current ||
      nextStartTimeRef.current < now
    ) {
      console.log(
        'RESETTING nextStartTime'
      );
  
      nextStartTimeRef.current =
        now + 0.01;
    }
  
    const startAt = Math.max(
      nextStartTimeRef.current,
      now + 0.01
    );
  
    console.log('startAt:', startAt);
  
    console.log(
      'queue delay:',
      startAt - now
    );
  
    source.onended = () => {
      console.log(
        'ENDED at:',
        ctx.currentTime
      );
    };
  
    source.start(startAt);
  
    nextStartTimeRef.current =
      startAt + audioBuffer.duration;
  
    console.log(
      'nextStartTime AFTER:',
      nextStartTimeRef.current
    );
  
    console.log(
      '------------------------------------------'
    );
  };
const handleIncomingPCMFrame4 = async (base64Data: string) => {
  if (!audioContextRef.current) {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  const ctx = audioContextRef.current;
  if (ctx.state === 'suspended') await ctx.resume();

  // 1. Decode Base64 string into raw binary data bytes
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const int16Array = new Int16Array(bytes.buffer);
  if (int16Array.length === 0) return;

  // 2. Map Gemini's native 24kHz stream data to an audio buffer
  const audioBuffer = ctx.createBuffer(1, int16Array.length, 24000); 
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < int16Array.length; i++) {
    channelData[i] = int16Array[i] / 32768.0; 
  }

  // 3. Connect to speakers
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);

  const currentTime = ctx.currentTime;

  // ⚡ CRITICAL DELAY FIX: Avoid Queue Backlogs
  // If the next scheduled start time is lagging behind the browser's actual system clock,
  // or if there's a big gap, force the timeline pointer to sync with real-time immediately.
  if (nextStartTimeRef.current < currentTime) {
    nextStartTimeRef.current = currentTime;
  }

  // 4. Play the chunk immediately at the synchronized timeline spot
  source.start(nextStartTimeRef.current);
  
  // Slide our timeline tracker forward by the exact duration of this audio chunk
  nextStartTimeRef.current += audioBuffer.duration;
};

  const handleIncomingPCMFrame3 = async (base64Data: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') await ctx.resume();

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const int16Array = new Int16Array(bytes.buffer);
    if (int16Array.length === 0) return;

    // Gemini Live outputs audio at exactly 24kHz
    const audioBuffer = ctx.createBuffer(1, int16Array.length, 24000); 
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < int16Array.length; i++) {
      channelData[i] = int16Array[i] / 32368.0; 
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    const currentTime = ctx.currentTime;
    
    // ANTI-LAG: If the queue drops behind real-time execution, 
    // skip forward and append a small 20ms safety pad immediately.
    if (nextStartTimeRef.current < currentTime) {
      nextStartTimeRef.current = currentTime + 0.02;
    }

    source.start(nextStartTimeRef.current);
    nextStartTimeRef.current += audioBuffer.duration;
  };

  // 🎙️ Stream Microphone Input Using the Worklet Worker Thread
  const startLiveConversation = async () => {
    if (!isConnected || !socketRef.current) return;
    if (isListening) return;

    setStatus('Live Session Active. Start speaking...');
    setIsListening(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Ingest mic data using standard 16kHz
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const ctx = audioContextRef.current;


    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
      // Load the processor file from our public asset directory
      await ctx.audioWorklet.addModule('/pcm-processor.js');

      micSourceRef.current = ctx.createMediaStreamSource(stream);
      
      // Instantiate our worker thread processor node
      const workletNode = new AudioWorkletNode(ctx, 'pcm-processor');
      workletNodeRef.current = workletNode;

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
          lastVoiceActivityRef.current = now;
        }

        // Calculate how many milliseconds have passed since you last spoke
        const msSinceLastSpeech = now - lastVoiceActivityRef.current;

        // 🛑 THE VOID VOICE FILTER
        // If the chunk is quiet (under 25) AND your 400ms trailing padding window has expired,
        // we immediately DROP the chunk locally, completely bypassing Base64 encoding and network transmission.
        if (currentChunkVolume < 1000 && msSinceLastSpeech > FRONTEND_HANGOVER_MS) {
          return; // Stop execution right here—the packet is safely discarded
        }
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          if (socketRef.current.bufferedAmount < 1024 * 1024) {

            socketRef.current.send(JSON.stringify({
              event: 'audio',
              data: base64String
            }));
          }
        }
      };

      micSourceRef.current.connect(workletNode);
      workletNode.connect(ctx.destination);

    } catch (err) {
      console.error('Failed to capture audio thread:', err);
      setStatus('Microphone initiation failed.');
    }
  };

  const stopLiveConversation2 = () => {
    setIsListening(false);
    setStatus('Streaming paused.');

    if (workletNodeRef.current) workletNodeRef.current.disconnect();
    if (micSourceRef.current) micSourceRef.current.disconnect();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
  };
  const stopLiveConversation = () => {
    setIsListening(false);
    setStatus('Streaming paused.');
  
    // ⚡ CRITICAL FIX: Reset the timeline clock tracking entirely on pause!
    // This tells the engine to completely forget the previous audio queue
    // and sync fresh with the system clock when you unpause.
    nextStartTimeRef.current = 0;
  
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
    }
    if (micSourceRef.current) {
      micSourceRef.current.disconnect();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    workletNodeRef.current?.disconnect();
    workletNodeRef.current = null;

    micSourceRef.current?.disconnect();
    micSourceRef.current = null;
    localStreamRef.current = null;
    
    console.log('🛑 [Timeline Cleaned] Queue reset to 0 to prevent unpause delays.');
  };

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif', width: '637px', margin: '0 auto', textAlign: 'center' }}>
      <h2>Gemini Live (Low-Latency Worker Loop)</h2>
      
      <div style={{ padding: '15px', backgroundColor: isConnected ? '#e2f0d9' : '#fce4d6', borderRadius: '5px', marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>

       {/* 🏗️ CONTAINER STYLED AS RELATIVE ROOT ANCHOR */}
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      display: 'inline-block',
      overflow: 'hidden',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      {/* Base Background Page Image (Takes up normal flow space) */}
      <img 
        src={`http://localhost:5001/book/math-05-1/12`}
        style={{ width: '100%', display: 'block' }} 
        alt="Target Analysis Board"
      />

{laserStatus && (
          <div ref={laserRef} style={{ position: 'absolute', width: '100px', height: '100px', top: 0, left: 0, backgroundColor: "#ff9a00", borderRadius: 5, opacity: 0.5 }} >
            
          </div>
        )}

      {/* 🎨 MULTI-LAYER STACK OVERLAY RENDERING PROCESS */}
      {currentDrawingSVGList.map((svgStringContent, index) => (
        <div 

          id='svg-container'
          key={index} // Maps unique iteration identifiers per structural layer
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Allows user mouse selections to pass through layers smoothly
            // Preserves RTL text orientation overrides if detected inside this index block
            direction: svgStringContent.includes('direction: rtl') || svgStringContent.includes('direction="rtl"') ? 'rtl' : 'ltr'
          }}
          dangerouslySetInnerHTML={{ __html: svgStringContent }} 
        />
      ))}
    </div>

    {/* If you are tracking reference_tag badge list loops, you can keep rendering them right here */}
    {activeReferences.length > 0 && (
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#eef2f7', borderRadius: '5px' }}>
        <strong>Discussing Parts:</strong> {activeReferences.join(', ')}
      </div>
    )}

<div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '20px' }}>
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
        
        {/* Manual action button to check or view the board panel history */}
        <button
          onClick={() => setIsBoardOpen(true)}
          style={{ padding: '12px 20px', fontSize: '15px', cursor: 'pointer', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px' }}
        >
          Open Board 📋 ({boardDrawingsList.length})
        </button>
      </div>

       {/* 📋 🏗️ THE HALF-SCREEN POP-UP BOARD LAYER COMPONENT */}
       <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: isBoardOpen ? '50vh' : '0vh', // Takes up exactly half of the viewport height when open
        backgroundColor: '#ffffff',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.15)',
        borderTopLeftRadius: '20px',
        borderTopRightRadius: '20px',
        zIndex: 9999, // Floating absolute layout prioritizes rendering over foreground assets
        transition: 'height 0.4s cubic-bezier(0.25, 1, 0.5, 1)', // Smooth upward slide motion ease-out
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header Ribbon Controller Section */}
        <div style={{ 
          padding: '15px 25px', 
          backgroundColor: '#f8f9fa', 
          borderBottom: '1px solid #e9ecef', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <span style={{ fontWeight: 'bold', color: '#333', fontSize: '16px' }}>
            📋 Live Sketchpad Analysis Board
          </span>
          <button 
            onClick={() => setIsBoardOpen(false)}
            style={{ 
              padding: '6px 14px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px'
            }}
          >
            Close ✕
          </button>
        </div>

        {/* Dynamic Display Canvas Panel View */}
        <div style={{ 
          flexGrow: 1, 
          padding: '25px', 
          overflowY: 'auto', // Enables standard vertical scrolling as elements accumulate
          backgroundColor: '#f1f3f5',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          alignItems: 'center'
        }}>
          {boardDrawingsList.length === 0 ? (
            <p style={{ color: '#868e96', marginTop: '40px', fontSize: '14px' }}>
              The whiteboard is currently empty. Ask Gemini to draw on the board to view graphics!
            </p>
          ) : (
            // Maps out and renders all past drawings alongside newly arriving sketches
            boardDrawingsList.map((drawing, idx) => (
              <div 
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  padding: '15px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6',
                  width: '100%',
                  maxWidth: '400px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                  display: 'flex',
                  justifyContent: 'center'
                }}
                dangerouslySetInnerHTML={{ __html: drawing.steps[drawing.currentIndex].svgCode }}
              />
            ))
          )}
        </div>

      </div>

    </div>
  );
}

export default App;
function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}