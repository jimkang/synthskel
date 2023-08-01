/* global fsPromises */
import { decodeArrayBuffer } from './decode-array-buffer';

// #throws
export async function getAudioBufferFromFile({
  file,
}: {
  file: File;
}): Promise<AudioBuffer> {
  let arrayBuffer = await file.arrayBuffer();
  return getAudioBuffer(arrayBuffer);
}

// #throws
export async function getAudioBufferFromFilePath({
  filePath,
}: {
  filePath: string;
}) {
  var typedBufferView: Uint8Array = await fsPromises.readFile(filePath);
  return getAudioBuffer(typedBufferView.buffer);
}

function getAudioBuffer(arrayBuffer: ArrayBuffer) {
  return new Promise(executor);

  function executor(
    resolve: (decoded: AudioBuffer) => void,
    reject: (error: Error) => void
  ) {
    decodeArrayBuffer(arrayBuffer, done);

    function done(error: Error, decoded: AudioBuffer) {
      if (error) {
        reject(error);
        return;
      }
      resolve(decoded);
    }
  }
}
