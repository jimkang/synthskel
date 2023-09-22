import {
  Sampler,
  Envelope,
  Panner,
  SynthNode,
  Gain,
} from '../synths/synth-node';
// import { ScoreEvent, PlayEvent } from '../types';

export function playPlayEvent({ playEvent, startTime = 0 }) {
  // }: {
  //   playEvent: PlayEvent;
  //   startTime: number;
  // }) {
  if (playEvent.rest) {
    return;
  }

  console.log('Playing', playEvent.scoreEvent.rate);
  const actualStartTime = startTime + playEvent.scoreEvent.delay;
  playEvent.nodes.forEach((synth) =>
    synth.play({ startTime: actualStartTime, indefinite: true })
  );
  playEvent.started = true;
}

export function newPlayEventForScoreEvent({
  scoreEvent,
  sampleBuffer,
  variableSampleBuffers,
  ctx,
  tickLength,
  slideMode,
  envelopeCurve,
  ampFactor = 1.0,
  getEnvelopeLengthForScoreEvent,
}) {
  // }: {
  //   scoreEvent: ScoreEvent;
  //   sampleBuffer: AudioBuffer;
  //   variableSampleBuffers?: AudioBuffer[];
  //   ctx: AudioContext;
  //   tickLength: number;
  //   slideMode?: boolean;
  //   envelopeCurve?: number[];
  //   ampFactor?: number;
  //   getEnvelopeLengthForScoreEvent?: (
  //     se: ScoreEvent,
  //     tickLength: number
  //   ) => number;
  // }): PlayEvent {
  if (scoreEvent.rest) {
    return {
      scoreEvent,
      started: false,
      nodes: [],
      rest: true,
    };
  }

  var eventSampleBuffer = sampleBuffer;
  if (
    variableSampleBuffers &&
    !isNaN(scoreEvent.variableSampleIndex) &&
    scoreEvent.variableSampleIndex < variableSampleBuffers.length
  ) {
    eventSampleBuffer = variableSampleBuffers[scoreEvent.variableSampleIndex];
  }
  var sampler = new Sampler(ctx, {
    sampleBuffer: eventSampleBuffer, // TODO: Sample buffer by name.
    playbackRate: scoreEvent.rate,
    loop: !!scoreEvent.loop,
    loopStart: scoreEvent?.loop?.loopStartSeconds,
    loopEnd: scoreEvent?.loop?.loopEndSeconds,
    timeNeededForEnvelopeDecay: tickLength,
    enableRamp: slideMode,
    rampSeconds: tickLength / 5,
  });
  //const maxGain = 0.8/Math.pow(totalScoreEventCount, 3);
  var envelope = new Envelope(ctx, {
    envelopeLength: getEnvelopeLengthForScoreEvent
      ? getEnvelopeLengthForScoreEvent(scoreEvent, tickLength)
      : scoreEvent.absoluteLengthSeconds || tickLength,
    playCurve:
      envelopeCurve && envelopeCurve.map((x) => x * scoreEvent.peakGain),
  });
  var panner = new Panner(ctx, {
    pan: scoreEvent.pan,
    rampSeconds: tickLength,
  });

  sampler.connect({ synthNode: envelope, audioNode: null });
  envelope.connect({ synthNode: panner, audioNode: null });

  // var nodes: SynthNode[] = [sampler, envelope, panner];
  var nodes = [sampler, envelope, panner];
  if (ampFactor !== 1.0) {
    let gain = new Gain(ctx, { gain: ampFactor });
    panner.connect({ synthNode: gain, audioNode: null });
    nodes.push(gain);
  }

  return {
    scoreEvent,
    started: false,
    nodes,
  };
}
