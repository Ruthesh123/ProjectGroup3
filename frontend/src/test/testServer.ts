import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

type SubmitApplicationBody = {
  jobId: string;
  coverLetter?: string;
  resumeUrl?: string;
};

function isSubmitBody(v: unknown): v is SubmitApplicationBody {
  return !!v && typeof v === 'object' && typeof (v as any).jobId === 'string';
}

export const server = setupServer(
  http.post('/api/applications/submit', async ({ request }) => {
    const raw = await request.json();
    if (!isSubmitBody(raw)) {
      return HttpResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    return HttpResponse.json({ id: 'APP-1', ...raw }, { status: 201 });
  }),
  http.post('/api/saved', async () => HttpResponse.json({ ok: true }, { status: 200 })),
  http.delete('/api/saved/:jobId', async () => HttpResponse.json({ ok: true }, { status: 200 })),
);
