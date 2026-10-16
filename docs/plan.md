# MUSIC CUP Implementation Plan

Goal: ship a polished responsive music tournament with real catalog and reliable progress.
Architecture: static React app, public JSONP catalog, pure tournament domain, local persistence.
Tech: React 18, Vite, MIT React Brackets and Zoom Pan Pinch.
Spec: design.md. User explicitly requested implementation and public repository.

1. Domain (src/domain.js, tests/domain.test.js): test 16/32/64 draw uniqueness, insufficient songs, full tournament, illegal advancement, ancestor invalidation, dedup preserving live, persistence validation. Implement and run node --test.
2. Catalog (src/catalog.js): artist search, artist lookup, album expansion in batches, cancellation, timeouts, progress, partial results, cache. Test normalization and use live API through browser.
3. UI (src/App.jsx, src/components.jsx, src/style.css): build artist search, single song list, tournament and winner surfaces. Verify keyboard labels, responsive overflow, actual artwork and complete bracket interaction.
4. Delivery: npm test/build/audit, desktop and mobile browser checks, refresh recovery, export, final independent review; fix important findings. Commit source, create public GitHub if authenticated; deploy Sites and verify terminal status.

Review focus: stale search responses; network partial failure; corrupted saved/imported state; change earlier result invalidates champion; mobile canvas interaction and selection counts.
