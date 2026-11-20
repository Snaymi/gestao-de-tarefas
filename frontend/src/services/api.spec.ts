import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('requisições de autenticação', () => {
  it('distingue credenciais incorretas de uma API indisponível', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(Response.json({ message: 'Credenciais inválidas.' }, { status: 401 }))
      .mockResolvedValueOnce(new Response('<html>Aguarde</html>', { status: 503 }));
    vi.stubGlobal('fetch', fetch);

    await expect(api.login('teste@example.com', 'senha-incorreta'))
      .rejects.toMatchObject({ status: 401, message: 'Credenciais inválidas.' });
    await expect(api.me()).rejects.toMatchObject({ status: 503 });
  });

  it.each([
    () => new Response('<html>Starting...</html>', { status: 200 }),
    () => Response.json({})
  ])('rejeita uma resposta sem sessão válida mesmo com HTTP 200', async makeResponse => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(makeResponse()));

    await expect(api.me()).rejects.toMatchObject({ status: 502 });
  });

  it.each(['headers', 'body'])('aborta o login quando a resposta fica presa em %s', async phase => {
    vi.useFakeTimers();
    const fetch = vi.fn((_url, options: RequestInit) => {
      const pending = new Promise<never>((_resolve, reject) => {
        options.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true });
      });
      return phase === 'headers' ? pending : Promise.resolve({ ok: true, json: () => pending });
    });
    vi.stubGlobal('fetch', fetch);

    const outcome = expect(api.login('teste@example.com', 'senha-local')).rejects.toMatchObject({ status: 0 });

    await vi.advanceTimersByTimeAsync(90_000);
    await outcome;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1].signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});
