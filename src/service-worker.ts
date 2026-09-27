import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

const cacheName = `tideline-${version}`;
const appAssets = [...build, ...files];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches
			.open(cacheName)
			.then((cache) => cache.addAll(appAssets))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	if (event.request.method !== 'GET') return;

	const url = new URL(event.request.url);
	if (url.origin !== self.location.origin) return;

	// HTML can contain an authenticated user's data. Keep it network-only and only
	// provide a generic offline page if navigation is not possible.
	if (event.request.mode === 'navigate') {
		event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
		return;
	}

	// The shell is immutable per build. Cache-first makes repeat launches fast and
	// keeps the interface available without caching Supabase responses.
	event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
});
