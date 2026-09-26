// The package ships without types; this covers the parts audioStreamPlayer uses.
declare module 'signalsmith-stretch' {
  export type StretchChange = {
    active?: boolean;
    // Pitch shift applied to live input.
    semitones?: number;
    tonalityHz?: number;
    formantSemitones?: number;
    formantCompensation?: boolean;
  };

  export interface StretchNode extends AudioWorkletNode {
    schedule(change: StretchChange): Promise<unknown>;
    // Seconds between audio going in and coming out.
    latency(): Promise<number>;
  }

  export default function SignalsmithStretch(
    context: BaseAudioContext,
    options?: AudioWorkletNodeOptions,
  ): Promise<StretchNode>;
}
