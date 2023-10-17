import { Gain } from './synth-node';

export function MainOut({
  ctx,
  gain = 1.0,
  skipCompressor = false,
  threshold = -14,
  ratio = 8,
  attack = 0.1,
}) {
  var mainOutNode = new Gain(ctx, { gain });
  var compressor = new DynamicsCompressorNode(ctx, {
    threshold,
    ratio,
    attack,
  });
  if (skipCompressor) {
    mainOutNode.connect({ synthNode: null, audioNode: ctx.destination });
  } else {
    mainOutNode.connect({ synthNode: null, audioNode: compressor });
    compressor.connect(ctx.destination);
  }
  return mainOutNode;
}
