export type Session = { user: { id: string; email: string; display_name: string } };
type State = { profile: { display_name: string; avatar_version: string | null }; inventory: never[]; catalog: never[]; cocktails: never[]; ingredients: never[]; activity: never[] };
async function send(method: string, path: string, body?: object) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Request failed.');
  return data;
}
export const api = {
  async uploadPhoto(file: File): Promise<{ error: { message: string } | null }> {
    try {
      const response = await fetch('/api/profile/photo', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Unable to upload photo.');
      return { error: null };
    } catch (e) { return { error: { message: e instanceof Error ? e.message : 'Unable to upload photo.' } }; }
  },
  async session(): Promise<Session | null> { const result = await send('GET', '/api/session'); return result.user ? { user: result.user } : null; },
  async state(): Promise<State> { return send('GET', '/api/state'); },
  async signOut(): Promise<void> { await send('POST', '/api/auth/logout'); },
  async request(method: string, path: string, body?: object): Promise<{ error: { message: string } | null }> {
    try { await send(method, path, body); return { error: null }; }
    catch (e) { return { error: { message: e instanceof Error ? e.message : 'Request failed.' } }; }
  },
};
