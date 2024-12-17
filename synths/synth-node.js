//var SoundbankReverb = require('soundbank-reverb');
// import wt from './wave-tables/Bass';

export var adsrCurve = new Float32Array([
  0, 0.5, 1, 1, 1, 1, 0.95, 0.9, 0.8, 0.72, 0.6, 0.3, 0.1, 0,
]);
//var asCurve = adsrCurve.slice(0, 3);

export class SynthNode {
  constructor(ctx, params) {
    this.ctx = ctx;
    this.params = params;
    this.node = null;
  }
  node() {
    return this.node;
  }
  syncToParams() {}
  cancelScheduledRamps() {}
  connect({ synthNode, audioNode }) {
    if (audioNode) {
      this.node.connect(audioNode);
    } else if (synthNode) {
      this.node.connect(synthNode.node);
    } else {
      throw new Error('No synthNode or raw AudioNode passed to connect.');
    }
  }
  play({ startTime = 0, endTime = undefined }) {
    if (this.node.start) {
      try {
        this.node.start(startTime);
        if (!isNaN(endTime)) {
          this.node.stop(endTime);
        }
      } catch (e) {
        console.log(e);
      }
    }
  }
}

export class VibratoGenerator extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createOscillator();
    this.node.frequency.value = +this.params.rateFreq;
  }
}

export class VibratoAmp extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createGain();
    this.node.gain.value = +this.params.pitchVariance;
  }
  connect({ synthNode, audioNode }) {
    var connectTargetNode = audioNode || synthNode.node;
    var connectTarget = connectTargetNode[this.params.destProp || 'detune'];
    this.node.connect(connectTarget);
  }
  play() {}
}

export class Gain extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createGain();
    this.node.gain.value = +this.params.gain;
  }
  fadeOut(fadeSeconds) {
    this.node.gain.linearRampToValueAtTime(0, fadeSeconds);
  }
  cancelScheduledRamps() {
    this.node.gain.cancelScheduledValues(this.ctx.currentTime);
  }
  play() {}
}

export class Envelope extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createGain();
    this.envelopeLength = 1;
    if (params.envelopeLength) {
      this.envelopeLength = +params.envelopeLength;
    }
    this.playCurve = params.playCurve;
  }
  play({ startTime }) {
    this.node.gain.value = 0;
    if (this.playCurve) {
      this.node.gain.setValueCurveAtTime(
        this.playCurve,
        startTime,
        this.envelopeLength
      );
    }
    this.envelopeCompletionTime = startTime + this.envelopeLength * 1.1;
  }
  cancelScheduledRamps() {
    this.node.gain.cancelScheduledValues(0);
  }
  linearRampTo(fadeSeconds, value) {
    this.node.gain.cancelScheduledValues(0);

    // If an envelope is still running its curve, that needs to finish first.
    var secondsUntilEnvelopeCompletion = 0;
    const now = this.ctx.currentTime;
    if (now < this.envelopeCompletionTime) {
      secondsUntilEnvelopeCompletion = this.envelopeCompletionTime - now;
    }
    // We will get a exception if we try to add a ramp event while the previous
    // value curve is still going.
    setTimeout(
      () => this.node.gain.linearRampToValueAtTime(value, fadeSeconds),
      secondsUntilEnvelopeCompletion * 1000
    );
  }
}

// export class ZeroEndsEnvelope extends SynthNode {
//   constructor(ctx, params) {
//     super(ctx, params);
//     this.node = this.ctx.createGain();
//     if (!params.envelopeLength) {
//       throw new Error('ZeroEndsEnvelope must have an envelopeLength');
//     }

//     const envelopeLength = +params.envelopeLength;

//     this.rampUpTime = envelopeLength / 20;
//     if (this.rampUpTime < 0.1) {
//       this.rampUpTime = 0.1;
//     } else if (this.rampUpTime > 1.0) {
//       this.rampUpTime = 1.0;
//     }

//     var rampDownTime = envelopeLength / 10;
//     if (rampDownTime < 0.1) {
//       rampDownTime = 0.1;
//     } else if (rampDownTime > 2.0) {
//       rampDownTime = 2.0;
//     }
//     this.rampDownTime = rampDownTime;
//     this.rampDownStart = envelopeLength - rampDownTime;
//   }
//   play() {
//     // this.node.gain.value = 0;
//     this.node.gain.exponentialRampToValueAtTime(
//       1.0,
//       this.ctx.currentTime + this.rampUpTime
//     );
//     this.node.gain.setTargetAtTime(
//       0.0,
//       this.ctx.currentTime + this.rampDownStart,
//       this.rampDownTime / 5
//     );
//   }
// }

//export class Reverb extends SynthNode {
//constructor(ctx, params) {
//super(ctx, params);
//this.node = this.ctx.createGain();
//this.node = SoundbankReverb(ctx);
//this.node.time = this.params.reverbSeconds;
//this.node.wet.value = this.params.reverbWet;
//this.node.dry.value = this.params.reverbDry;
//}
//play() {}
//}

export class Compressor extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = ctx.createDynamicsCompressor();
  }
  play({ startTime }) {
    this.node.threshold.setValueAtTime(
      +this.params.compressorThreshold,
      startTime
    );
    this.node.knee.setValueAtTime(+this.params.compressorKnee, startTime);
    this.node.ratio.setValueAtTime(+this.params.compressorRatio, startTime);
    this.node.attack.setValueAtTime(+this.params.compressorAttack, startTime);
    this.node.release.setValueAtTime(+this.params.compressorRelease, startTime);
  }
}

// TODO: Common base class with Sampler?
export class Osc extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = this.ctx.createOscillator();
    this.node.frequency.value = +this.params.freq;
    this.rampSeconds = 0.1;
    if (this.params.rampSeconds) {
      this.rampSeconds = +this.params.rampSeconds;
    }

    const real = new Float32Array(2);
    const imag = new Float32Array(2);

    real[0] = 0;
    imag[0] = 0;
    real[1] = 1;
    imag[1] = 0;

    const wave = ctx.createPeriodicWave(real, imag);

    this.node.setPeriodicWave(wave);

    // this.node.type = this.params.type || 'sine';
    // const wave = ctx.createPeriodicWave(wt.real, wt.imag);
    // this.node.setPeriodicWave(wave);

    this.syncToParams();
  }
  cancelScheduledRamps() {
    this.node.frequency.cancelScheduledValues(this.ctx.currentTime);
  }
  syncToParams() {
    if (this.params.sampleDetune) {
      this.node.detune.value = +this.params.sampleDetune;
    }
    if (this.params.freq && this.params.freq !== this.node.frequency.value) {
      if (isNaN(this.node.frequency.value)) {
        this.node.frequency.value = +this.params.freq;
      } else {
        if (this.params.enableRamp) {
          console.log(
            'sliding from',
            this.node.frequency.value,
            'to',
            this.params.freq,
            'at',
            this.ctx.currentTime + this.rampSeconds
          );
          homemadeLinearRamp(
            this.node.frequency,
            +this.params.freq,
            this.ctx,
            +this.rampSeconds
          );
        } else {
          this.node.frequency.value = +this.params.freq;
        }
      }
    }

    if (this.params.loop) {
      this.node.loop = this.params.loop;
      if (!isNaN(this.params.loopStart)) {
        this.node.loopStart = +this.params.loopStart;
      }
      if (!isNaN(this.params.loopEnd)) {
        this.node.loopEnd = +this.params.loopEnd;
      }
    }
  }
  playLoop({ startSecs = 0, durationSecs }) {
    this.node.start(
      this.ctx.currentTime + +startSecs,
      +this.params.loopStart,
      durationSecs
    );
  }
  play({ startTime, loopStart, duration, indefinite }) {
    if (indefinite) {
      this.node.start(+startTime || 0);
      return;
    }

    if (isNaN(duration)) {
      this.node.start(+startTime || 0, loopStart || 0);
    } else {
      this.node.start(+startTime || 0, loopStart || 0, +duration);
    }
  }
  stop() {
    this.node.stop();
  }
}

export class Sampler extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = ctx.createBufferSource();
    this.node.buffer = this.params.sampleBuffer;
    this.rampSeconds = 0.1;
    if (this.params.rampSeconds) {
      this.rampSeconds = +this.params.rampSeconds;
    }
    this.syncToParams();
  }
  cancelScheduledRamps() {
    this.node.playbackRate.cancelScheduledValues(this.ctx.currentTime);
  }
  syncToParams() {
    if (this.params.sampleDetune) {
      this.node.detune.value = +this.params.sampleDetune;
    }
    if (
      this.params.playbackRate &&
      this.params.playbackRate !== this.node.playbackRate.value
    ) {
      if (isNaN(this.node.playbackRate.value)) {
        this.node.playbackRate.value = +this.params.playbackRate;
      } else {
        if (this.params.enableRamp) {
          console.log(
            'sliding from',
            this.node.playbackRate.value,
            'to',
            this.params.playbackRate,
            'at',
            this.ctx.currentTime + this.rampSeconds
          );
          homemadeLinearRamp(
            this.node.playbackRate,
            +this.params.playbackRate,
            this.ctx,
            +this.rampSeconds
          );
        } else {
          this.node.playbackRate.value = +this.params.playbackRate;
        }
      }
    }

    if (this.params.loop) {
      this.node.loop = this.params.loop;
      if (!isNaN(this.params.loopStart)) {
        this.node.loopStart = +this.params.loopStart;
      }
      if (!isNaN(this.params.loopEnd)) {
        this.node.loopEnd = +this.params.loopEnd;
      }
    }
  }
  playLoop({ startSecs = 0, durationSecs }) {
    this.node.start(
      this.ctx.currentTime + +startSecs,
      +this.params.loopStart,
      durationSecs
    );
  }
  play({ startTime, loopStart, duration, indefinite }) {
    if (indefinite) {
      this.node.start(+startTime || 0);
      return;
    }

    if (isNaN(duration)) {
      this.node.start(+startTime || 0, loopStart || 0);
    } else {
      this.node.start(+startTime || 0, loopStart || 0, +duration);
    }
  }
  stop() {
    this.node.stop();
  }
}

export class Panner extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = new StereoPannerNode(this.ctx, { pan: +params.pan });
  }
  node() {
    return this.node;
  }
  cancelScheduledRamps() {
    this.node.pan.cancelScheduledValues(this.ctx.currentTime);
  }
  syncToParams() {
    //this.node.pan.linearRampToValueAtTime(
    //this.params.pan,
    //isNaN(this.params.rampSeconds) ? 0.1 : this.params.rampSeconds
    //);
    homemadeLinearRamp(
      this.node.pan,
      +this.params.pan,
      this.ctx,
      isNaN(this.params.rampSeconds) ? 0.1 : +this.params.rampSeconds
    );
  }
  play() {}
}

// Warning: cancelScheduledValues doesn't cover this.
function homemadeLinearRamp(param, targetVal, ctx, durationSeconds) {
  const startTime = ctx.currentTime;
  const startVal = param.value;
  const valDelta = targetVal - startVal;
  window.requestAnimationFrame(updateParam);

  function updateParam() {
    const elapsed = ctx.currentTime - startTime;
    const progress = elapsed / durationSeconds;
    param.value = startVal + progress * valDelta;
    if (progress < 1) {
      window.requestAnimationFrame(updateParam);
    }
  }
}

export class Reverb extends SynthNode {
  constructor(ctx, params) {
    super(ctx, params);
    this.node = ctx.createConvolver();
    this.node.buffer = params.buffer;
  }
}
