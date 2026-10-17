import { readShader } from './read-shader.js';
import { compile } from './complie-shader.js';

/*
  Create a program (same as in lab)
*/

export async function createProgram(gl, vertexURL, fragmentURL) {
  const sources = await Promise.all([
    readShader(vertexURL),
    readShader(fragmentURL),
  ]);

  const program = gl.createProgram();
  const vertexShader = compile(gl, gl.VERTEX_SHADER, sources[0]);
  const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, sources[1]);

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    throw new Error(`Shader linking failed: ${gl.getProgramInfoLog(program)}`);
  }

  return program;
}
