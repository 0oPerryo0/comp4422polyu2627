/*
  webgl mesh wrapper class
*/

export class Mesh {
  constructor(gl, data, mode = gl.TRIANGLES) {
    this.gl = gl;
    this.mode = mode;
    this.count = data.indices.length;
    this.vertexCount = data.positions.length / 3;
    this.indexType =
      data.indices instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    this.vao = gl.createVertexArray();
    this.buffers = [];

    gl.bindVertexArray(this.vao);

    this.attribute(0, data.positions);
    this.attribute(1, data.colors);

    const indexBuffer = gl.createBuffer();
    this.buffers.push(indexBuffer);

    // ELEMENT_ARRAY_BUFFER binding is stored inside the currently bound VAO.
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data.indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  attribute(location, data) {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    this.buffers.push(buffer);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 0, 0);
  }

  // draw the 3D shape
  draw() {
    const gl = this.gl;
    gl.bindVertexArray(this.vao);
    gl.drawElements(this.mode, this.count, this.indexType, 0);
  }

  // free the GPU buffers and VAO
  dispose() {
    for (const buffer of this.buffers) this.gl.deleteBuffer(buffer);
    this.gl.deleteVertexArray(this.vao);
  }
}
