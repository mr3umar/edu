

export const MODEL_PRICING: {[key: string]: {
        input: number,
        output: number,
        cachedInput?: number,
}} = {
        'gpt-4o-2024-08-06': { input: 2.5, output: 10, cachedInput: 1.25 },
        'gpt-5.5-2026-04-23': { input: 5, output: 30, cachedInput: 0.5 },
        'gpt-5.4-2026-03-05': { input: 2.5, output: 15, cachedInput: 0.25 },
        'gpt-5.4-mini-2026-03-17': { input: 0.75, output: 4.50, cachedInput: 0.075 },
        'gpt-4o-transcribe': { input: 2.50, output: 10, cachedInput: 1.25 },
    
        'gpt-5.6-luna': { input: 0.2, output: 1.2, cachedInput: 0.02 },
        'gpt-5.6-terra': { input: 2, output: 12, cachedInput: 0.2 },
        'gpt-5.6-sol': { input: 4, output: 20, cachedInput: 0.4 },
        'gpt-6-astra': { input: 10, output: 50, cachedInput: 1 },
    
        'gemini-2.5-pro': { input: 1.25, output: 10 },
        'gemini-3.1-pro-preview': { input: 2, output: 12 },
        'gemini-2.5-flash': {input: 0.30, output: 2.50},
        'gemini-3.5-flash-lite': {input: 0.30, output: 2.50, cachedInput: 0.03}, //Flash-Lite charged $0.50/1M for audio vs $0.10 for text.

        'qwen3-max': {
        input: 1.20,
        output: 6.00,
        cachedInput: 0.24,
        },

        'qwen3-coder-plus': {
        input: 1.00,
        output: 5.00,
        cachedInput: 0, // caching not supported on this endpoint
        },

        'qwen3-coder-next': {
        input: 0.30,
        output: 1.50,
        cachedInput: 0,
        },

        'qwen3.5-flash': {
        input: 0.10, // <=128K; verify your region/tier
        output: 0.40,
        cachedInput: 0,
        },
        
        'qwen3.8-flash': {
                input: 0.15,
                output: 0.47,
                cachedInput: 0.016,
              },
            
              'qwen3.8-max': {
                input: 2.00,
                output: 6.00,
                cachedInput: 0.25,
              },

              'claude-opus-5-5': {
    input: 4,
    output: 20,
    cachedInput: 0.20,
  },

  'claude-opus-5': {
    input: 5,
    output: 25,
    cachedInput: 0.50,
  },

  'claude-sonnet-5': {
    input: 2,
    output: 10,
    cachedInput: 0.20,
  },

  'claude-sonnet-4-6': {
    input: 3,
    output: 15,
    cachedInput: 0.30,
  },

  'claude-haiku-4-5': {
    input: 1,
    output: 5,
    cachedInput: 0.10,
  },
    };

export const TTS_PRICING = {
        'tts-1': {perMilChar: 15},
        'grok-tts': {perMilChar: 15},

}

export const STT_PRICING = {
        'grok-stt-rest': {perMin: 0.10 / 60},
        'grok-stt-streaming': {perMin: 0.20 / 60},
        'gpt-transcribe': {perMin: 0.0045}, // better quality than gpt-live-transcribe, gpt-4o-transcribe
        'gpt-live-transcribe': {perMin: 0.017}, 
}


export const calculateCost = (model: keyof typeof MODEL_PRICING, count: {input: number, output: number, cachedInput: number}) => {
        const price = MODEL_PRICING[model]
        let input = price.input / 1000000 * (count.input - count.cachedInput)
        let cachedInput = (price.cachedInput ?? price.input) / 1000000 * count.cachedInput
        let output = price.output / 1000000 * count.output

        if(model == "gemini-2.5-pro" && count.input > 200_000) {
                input = 2.50 / 1000000 * count.input
        }
        if(model == "gemini-2.5-pro" && count.output > 200_000) {
                output = 15 / 1000000 * count.output
        }

        if(model == "gemini-3.1-pro-preview" && count.input > 200_000) {
                input = 4 / 1000000 * count.input
        }
        if(model == "gemini-3.1-pro-preview" && count.output > 200_000) {
                output = 18 / 1000000 * count.output
        }

        return {
                input,
                cachedInput,
                output,
                total: input + cachedInput + output
        }
}

export const calculateTTSCost = (model: keyof typeof TTS_PRICING, charCount: number) => {
        const price = TTS_PRICING[model]
        const total = price.perMilChar / 1000000 * charCount
        return {
                total,
        }
}
export const calculateSTTCost = (model: keyof typeof STT_PRICING, durationMin: number) => {
        const price = STT_PRICING[model]
        const total = price.perMin * durationMin
        return {
                total,
        }
}