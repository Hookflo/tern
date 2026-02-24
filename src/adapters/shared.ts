export interface MinimalNodeRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  protocol?: string;
  get?: (name: string) => string | undefined;
  originalUrl?: string;
  url?: string;
  on?: (event: string, cb: (chunk?: unknown) => void) => void;
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string,
): string | undefined {
  const value = headers[name.toLowerCase()] ?? headers[name];
  if (Array.isArray(value)) {
    return value.join(',');
  }
  return value;
}

async function readIncomingMessageBodyAsBuffer(
  request: MinimalNodeRequest,
): Promise<Uint8Array> {
  if (!request.on) return new Uint8Array(0);

  const chunks: Uint8Array[] = [];

  return new Promise<Uint8Array>((resolve, reject) => {
    request.on?.('data', (chunk: unknown) => {
      if (chunk instanceof Uint8Array) {
        chunks.push(chunk);
      } else if (typeof chunk === 'string') {
        chunks.push(new TextEncoder().encode(chunk));
      } else if (chunk != null) {
        try {
          chunks.push(new TextEncoder().encode(String(chunk)));
        } catch {
          // skip unreadable chunk silently
        }
      }
    });
    request.on?.('end', () => {
      const totalLength = chunks.reduce((sum, c) => sum + c.byteLength, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.byteLength;
      }
      resolve(result);
    });
    request.on?.('error', (err: unknown) => reject(err));
  });
}

export async function extractRawBody(
  request: MinimalNodeRequest,
): Promise<Uint8Array> {
  const { body } = request;

  if (body instanceof Uint8Array) {
    return body;
  }
  if (typeof body === 'string') {
    return new TextEncoder().encode(body);
  }

  if (body !== null && body !== undefined && typeof body === 'object') {
    console.warn(
      '[Tern] Warning: request body is already parsed as JSON. '
        + 'Signature verification may fail. '
        + 'Add express.raw({ type: "*/*" }) before Tern on webhook routes, '
        + 'or register webhook routes before app.use(express.json()).',
    );
    return new TextEncoder().encode(JSON.stringify(body));
  }

  // nothing ran — read raw stream directly
  return readIncomingMessageBodyAsBuffer(request);
}

// converts Uint8Array to a plain ArrayBuffer that all TS versions accept as BodyInit
function toArrayBuffer(uint8: Uint8Array): ArrayBuffer {
  return uint8.buffer.slice(
    uint8.byteOffset,
    uint8.byteOffset + uint8.byteLength,
  ) as ArrayBuffer;
}

export function toHeadersInit(
  headers: Record<string, string | string[] | undefined>,
): HeadersInit {
  const normalized = new Headers();

  for (const [key, value] of Object.entries(headers)) {
    if (!value) {
      continue;
    }
    if (Array.isArray(value)) {
      normalized.set(key, value.join(','));
      continue;
    }
    normalized.set(key, value);
  }

  return normalized;
}

export async function toWebRequest(
  request: MinimalNodeRequest,
): Promise<Request> {
  const protocol = request.protocol || 'https';
  const host = request.get?.('host')
    || getHeaderValue(request.headers, 'host')
    || 'localhost';
  const path = request.originalUrl || request.url || '/';
  const rawBody = await extractRawBody(request);

  const init: RequestInit & { duplex?: string } = {
    method: request.method || 'POST',
    headers: toHeadersInit(request.headers),
    body: toArrayBuffer(rawBody),
    duplex: 'half',
  };

  return new Request(`${protocol}://${host}${path}`, init);
}
