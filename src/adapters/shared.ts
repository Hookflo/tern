export interface MinimalNodeRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  protocol?: string;
  get?: (name: string) => string | undefined;
  originalUrl?: string;
  url?: string;
  on?: (event: string, cb: (chunk?: any) => void) => void;
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

async function readIncomingMessageBody(request: MinimalNodeRequest): Promise<string> {
  if (!request.on) {
    return '';
  }

  const chunks: string[] = [];

  return new Promise<string>((resolve, reject) => {
    request.on?.('data', (chunk) => {
      if (typeof chunk === 'string') {
        chunks.push(chunk);
        return;
      }
      chunks.push(Buffer.from(chunk ?? '').toString('utf8'));
    });
    request.on?.('end', () => resolve(chunks.join('')));
    request.on?.('error', reject);
  });
}

export async function extractRawBody(request: MinimalNodeRequest): Promise<string> {
  const body = request.body;

  if (typeof body === 'string') {
    return body;
  }

  if (Buffer.isBuffer(body)) {
    return body.toString('utf8');
  }

  if (body && typeof body === 'object') {
    return JSON.stringify(body);
  }

  return readIncomingMessageBody(request);
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

export async function toWebRequest(request: MinimalNodeRequest): Promise<Request> {
  const protocol = request.protocol || 'https';
  const host = request.get?.('host') || getHeaderValue(request.headers, 'host') || 'localhost';
  const path = request.originalUrl || request.url || '/';
  const rawBody = await extractRawBody(request);

  return new Request(`${protocol}://${host}${path}`, {
    method: request.method || 'POST',
    headers: toHeadersInit(request.headers),
    body: rawBody,
  });
}
