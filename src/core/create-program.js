import { readShader } from './read-shader.js';
import { compile } from './compile-shader.js';

/*
  Create a program (same as in lab)
*/

export async function createProgram(gl, vertexURL, fragmentURL) {
  const sources = await Promise.all([
    readShader(vertexURL),
    readShader(fragmentURL),
  ]);

  const program = gl.createProgram();
  const shaders = [];

  // if anything fails, delete the program; the shaders are always deleted
  try {
    shaders.push(compile(gl, gl.VERTEX_SHADER, sources[0]));
    shaders.push(compile(gl, gl.FRAGMENT_SHADER, sources[1]));

    for (const shader of shaders) gl.attachShader(program, shader);
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
    for (const shader of shaders) gl.deleteShader(shader);
  }
}
