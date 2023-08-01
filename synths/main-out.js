import { Gain } from './synth-node';

export function MainOut({ ctx }) {
  var mainOutNode = new Gain(ctx, { gain: 1.0 });
  var compressor = new DynamicsCompressorNode(ctx, {
    threshold: -14,
    ratio: 8,
    attack: 0.1,
  });
  mainOutNode.connect({ synthNode: null, audioNode: compressor });
  compressor.connect(ctx.destination);
  return mainOutNode;
}
