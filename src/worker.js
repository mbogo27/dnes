// Single Worker entrypoint — this project is a genuine Cloudflare Worker
// (Workers Builds), not classic Pages, so there's no functions/ directory
// auto-routing here. Static files under public/ are served directly by the
// [assets] binding for any path that matches a real file; only /api/* and
// the /claim redirect ever reach this fetch handler.
import { onRequestPost as handleSubmit } from './api/submit.js';
import { onRequestPost as handleReact } from './api/react.js';
import { onRequestPost as handleClaimName } from './api/claim-name.js';
import { onRequestPost as handleClaimSlot } from './api/claim-slot.js';
import { onRequestPost as handleShare } from './api/share.js';
import { onRequestPost as handleEvents } from './api/events.js';
import { onRequestGet as handleStats } from './api/stats.js';

const ROUTES = {
  'POST /api/submit': handleSubmit,
  'POST /api/react': handleReact,
  'POST /api/claim-name': handleClaimName,
  'POST /api/claim-slot': handleClaimSlot,
  'POST /api/share': handleShare,
  'POST /api/events': handleEvents,
  'GET /api/stats': handleStats,
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // dobaness.com/claim — a direct entry point for the sales conversation
    // (was a Pages `_redirects` rule; that file only worked under Pages'
    // static routing, so the redirect moved here).
    if (url.pathname.replace(/\/+$/, '') === '/claim') {
      const dest = new URL('/', url);
      dest.search = 'claim=1';
      return Response.redirect(dest.toString(), 302);
    }

    const handler = ROUTES[request.method + ' ' + url.pathname];
    if (handler) {
      try {
        return await handler({ request, env, waitUntil: ctx.waitUntil.bind(ctx) });
      } catch (err) {
        return new Response(JSON.stringify({ ok: false, error: 'internal error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
