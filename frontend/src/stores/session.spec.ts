import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError } from '../services/api';
import type { User } from '../types';
import { useSession } from './session';

const testUser: User = { id: 'session-user', email: 'teste@example.com', name: 'Usuário local', role: 'USER' };

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

describe('restauração da sessão', () => {
  it('compartilha a verificação em andamento e permite tentar novamente após falha', async () => {
    const store = useSession();
    const me = vi.spyOn(api, 'me')
      .mockRejectedValueOnce(new ApiError('API indisponível.', 503))
      .mockResolvedValueOnce(testUser);

    await Promise.all([store.restore(), store.restore()]);
    expect(me).toHaveBeenCalledTimes(1);
    expect(store.status).toBe('unavailable');
    expect(store.user).toBeNull();

    await store.restore();
    expect(store.status).toBe('authenticated');
    expect(store.user).toEqual(testUser);
  });

  it('marca como visitante quando a API confirma que não há uma sessão válida', async () => {
    const store = useSession();
    vi.spyOn(api, 'me').mockRejectedValue(new ApiError('Sessão expirada.', 401));

    await store.restore();

    expect(store.status).toBe('anonymous');
  });

  it('ignora uma resposta antiga que chega depois do login', async () => {
    const store = useSession();
    let rejectRestore!: (error: ApiError) => void;
    const pending = new Promise<User>((_resolve, reject) => { rejectRestore = reject; });
    vi.spyOn(api, 'me').mockReturnValue(pending);
    vi.spyOn(api, 'login').mockResolvedValue(testUser);

    const restoring = store.restore();
    await store.login(testUser.email, 'senha-local');
    rejectRestore(new ApiError('Sessão expirada.', 401));
    await restoring;

    expect(store.status).toBe('authenticated');
    expect(store.user).toEqual(testUser);
  });
});
