export async function readShader(url) {
  const response = await fetch(url);

  if (!response.ok)
    throw new Error(`Could not load shader (${response.status}): ${url}`);

  return response.text();
}
