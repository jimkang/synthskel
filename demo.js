import handleError from 'handle-error-web';
import { version } from './package.json';
import ContextKeeper from 'audio-context-singleton';
import ep from 'errorback-promise';
// import {
//   getAudioBufferFromFile,
//   getAudioBufferFromFilePath,
// } from './tasks/get-audio-buffer-from-file';
import { MainOut } from './synths/main-out';
import { Sampler, Gain, Panner, Envelope } from './synths/synth-node';
import { downloadSamples } from './tasks/download-samples';

var noClipCurve = [0, 1, 1, 1, 1, 1, 0.95, 0.9, 0.8, 0.72, 0];

var { getCurrentContext } = ContextKeeper();

(async function go() {
  window.addEventListener('error', reportTopLevelError);
  renderVersion();

  document.getElementById('play-button').addEventListener('click', playChain);
})();

async function playChain() {
  var { error, values } = await ep(getCurrentContext);
  if (error) {
    handleError(error);
    return;
  }
  var ctx = values[0];
  // TODO: Promisify.
  var dlResult = await ep(downloadSamples, {
    ctx,
    sampleFiles: ['sink-drip.wav', 'vibraphone-swell-d4.wav'],
    baseURL: 'samples/',
  });
  if (dlResult.error) {
    handleError(dlResult.error);
    return;
  }
  var buffers = dlResult.values[0];
  var sampler = new Sampler(ctx, {
    sampleBuffer: buffers[1],
    loop: true,
    loopStart: 0,
    loopEnd: 0.3,
  });
  var amp = new Gain(ctx, { gain: 0.9 });
  var panner = new Panner(ctx, { pan: 0.3 });
  var envelope = new Envelope(ctx, {
    envelopeLength: 2 * 0.99,
    playCurve: noClipCurve,
  });
  var mainOut = MainOut({ ctx });

  sampler.connect({ synthNode: amp, audioNode: null });
  amp.connect({ synthNode: envelope, audioNode: null });
  envelope.connect({ synthNode: panner, audioNode: null });
  panner.connect({ synthNode: mainOut, audioNode: null });

  sampler.playLoop({ startSecs: 0, durationSecs: 5 });
  envelope.play();
}

function reportTopLevelError(event) {
  handleError(event.error);
}

function renderVersion() {
  var versionInfo = document.getElementById('version-info');
  versionInfo.textContent = version;
}
