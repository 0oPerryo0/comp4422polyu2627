async function readShader(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load shader (${response.status}): ${url}`);
  return response.text();
}

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation failed: ${message}`);
  }
  return shader;
}

export async function createProgram(gl, vertexURL, fragmentURL) {
  const sources = await Promise.all([readShader(vertexURL), readShader(fragmentURL)]);
  const shaders = [];
  const program = gl.createProgram();
  try {
    shaders.push(compile(gl, gl.VERTEX_SHADER, sources[0]));
    shaders.push(compile(gl, gl.FRAGMENT_SHADER, sources[1]));
    for (const shader of shaders) gl.attachShader(program, shader);
    gl.linkProgram(program);
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
