import { Sampler, Envelope, Panner, Gain } from '../synths/synth-node';
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
    synth.play({
      startTime: actualStartTime,
      duration: playEvent.scoreEvent.absoluteLengthSeconds || undefined,
      indefinite: !playEvent.scoreEvent.finite,
    })
  );
  playEvent.started = true;
}

export function newPlayEventForScoreEvent({
  GenNodeClass = Sampler,
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
  var genNode = new GenNodeClass(ctx, {
    sampleBuffer: eventSampleBuffer, // TODO: Sample buffer by name.
    // playbackRate: scoreEvent.rate,
    freq: scoreEvent.rate * 330,
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

  genNode.connect({ synthNode: envelope, audioNode: null });
  envelope.connect({ synthNode: panner, audioNode: null });

  // var nodes: SynthNode[] = [genNode, envelope, panner];
  var nodes = [genNode, envelope, panner];
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
