import { readShader } from './read-shader.js';
import { compile } from './compile-shader.js';

/*
  Create a program (same as in lab)
*/

export async function createProgram(gl, vertexURL, fragmentURL) {
  const [vertexSource, fragmentSource] = await Promise.all([
    readShader(vertexURL),
    readShader(fragmentURL),
  ]);

  const program = gl.createProgram();
  let vertexShader;
  let fragmentShader;

  // if anything fails, delete the program; the shaders are always deleted
  try {
    vertexShader = compile(gl, gl.VERTEX_SHADER, vertexSource);
    fragmentShader = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // read the log before the program is deleted in the catch block
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Shader linking failed: ${gl.getProgramInfoLog(program)}`);
    }

    return program;
  } catch (error) {
    gl.deleteProgram(program);
    throw error;
  } finally {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
  }
}
