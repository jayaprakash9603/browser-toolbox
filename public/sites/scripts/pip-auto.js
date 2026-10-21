(function() {
	//#region src/core/pip/fullPlayerPip.ts
	/**
	* Moves the page's whole video player (video + the site's own controls: seek, speed, quality,
	* captions, cast, ...) into a Document Picture-in-Picture window that floats above every tab
	* and app. Works for YouTube and for generic players on any site whose player lives in the
	* top-level document.
	*
	* Must stay fully self-contained (no references to module scope): it is serialized by
	* chrome.scripting.executeScript and also bundled into the auto-PiP page script.
	*/
	async function enterFullPlayerPip() {
		const api = window.documentPictureInPicture;
		if (!api || window !== window.top) return "unsupported";
		if (api.window) return "entered";
		const collect = (root, out) => {
			root.querySelectorAll("video").forEach((v) => out.push(v));
			root.querySelectorAll("*").forEach((el) => {
				if (el.shadowRoot) collect(el.shadowRoot, out);
			});
		};
		const pickVideo = () => {
			const videos = [];
			collect(document, videos);
			let best = null;
			let bestScore = -1;
			for (const v of videos) {
				if (v.readyState === 0) continue;
				const r = v.getBoundingClientRect();
				if (r.width < 120 || r.height < 68) continue;
				const score = (!v.paused && !v.ended && v.readyState > 2 ? 0xe8d4a51000 : 0) + r.width * r.height;
				if (score > bestScore) {
					bestScore = score;
					best = v;
				}
			}
			return best;
		};
		const parentOf = (node) => {
			if (node.parentElement) return node.parentElement;
			const root = node.getRootNode();
			return root instanceof ShadowRoot ? root.host : null;
		};
		const findContainer = (video) => {
			const vr = video.getBoundingClientRect();
			let container = video;
			let node = video;
			for (let i = 0; i < 15; i++) {
				const parent = parentOf(node);
				if (!parent || parent === document.body || parent === document.documentElement) break;
				const r = parent.getBoundingClientRect();
				if (r.width > vr.width * 1.2 + 32 || r.height > vr.height * 1.45 + 72) break;
				container = parent;
				node = parent;
			}
			while (container.getRootNode() instanceof ShadowRoot) container = container.getRootNode().host;
			return container;
		};
		const resolveTarget = () => {
			const ytPlayer = document.querySelector("#movie_player, .html5-video-player");
			const ytVideo = ytPlayer?.querySelector("video") ?? null;
			if (ytPlayer && ytVideo && ytVideo.readyState > 0) return {
				video: ytVideo,
				container: ytPlayer
			};
			const v = pickVideo();
			if (!v) return null;
			const c = findContainer(v);
			return c === v ? null : {
				video: v,
				container: c
			};
		};
		const target = resolveTarget();
		if (!target || !target.container.parentNode) return "none";
		const { video, container } = target;
		if (video.mediaKeys) return "drm";
		const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9;
		const width = 640;
		const height = Math.round(width / ratio);
		let pip;
		try {
			pip = await api.requestWindow({
				width,
				height
			});
		} catch {
			return "error";
		}
		const pdoc = pip.document;
		for (const attr of Array.from(document.documentElement.attributes)) pdoc.documentElement.setAttribute(attr.name, attr.value);
		for (const attr of Array.from(document.body.attributes)) if (attr.name !== "style") pdoc.body.setAttribute(attr.name, attr.value);
		const sheets = [...Array.from(document.styleSheets), ...document.adoptedStyleSheets ?? []];
		for (const sheet of sheets) try {
			const style = pdoc.createElement("style");
			style.textContent = Array.from(sheet.cssRules).map((rule) => rule.cssText).join("\n");
			pdoc.head.appendChild(style);
		} catch {
			if (sheet.href) {
				const link = pdoc.createElement("link");
				link.rel = "stylesheet";
				link.href = sheet.href;
				pdoc.head.appendChild(link);
			}
		}
		const fit = pdoc.createElement("style");
		fit.textContent = "html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;background:#000!important;overflow:hidden!important}.html5-video-container{width:100%!important;height:100%!important}.ytp-chrome-bottom{width:calc(100% - 24px)!important;left:12px!important}.ytp-gradient-bottom,.ytp-gradient-top{width:100%!important}";
		pdoc.head.appendChild(fit);
		const chain = [];
		for (let a = container.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) chain.unshift(a);
		let host = pdoc.body;
		for (const ancestor of chain) {
			const shell = pdoc.createElement(ancestor.tagName.toLowerCase());
			for (const attr of Array.from(ancestor.attributes)) if (attr.name !== "style") shell.setAttribute(attr.name, attr.value);
			shell.style.cssText = "display:block!important;position:static!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;max-width:none!important;max-height:none!important;min-width:0!important;min-height:0!important;transform:none!important;overflow:visible!important";
			host.appendChild(shell);
			host = shell;
		}
		const originalParent = container.parentNode;
		const originalNext = container.nextSibling;
		const containerStyle = container.getAttribute("style");
		const videoStyle = video.getAttribute("style");
		const rect = container.getBoundingClientRect();
		const placeholder = document.createElement("div");
		placeholder.style.cssText = `width:${rect.width}px;height:${rect.height}px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;`;
		placeholder.textContent = "Playing in Picture-in-Picture";
		originalParent.insertBefore(placeholder, container);
		const fill = (el, props) => {
			for (const [key, value] of Object.entries(props)) el.style.setProperty(key, value, "important");
		};
		fill(container, {
			position: "fixed",
			top: "0",
			left: "0",
			right: "0",
			bottom: "0",
			width: "100%",
			height: "100%",
			"max-width": "none",
			"max-height": "none",
			margin: "0",
			transform: "none",
			"aspect-ratio": "auto"
		});
		fill(video, {
			width: "100%",
			height: "100%",
			"max-width": "none",
			"max-height": "none",
			"object-fit": "contain"
		});
		if (getComputedStyle(video).position === "absolute") fill(video, {
			top: "0",
			left: "0"
		});
		host.appendChild(container);
		let frame = 0;
		const nudge = () => {
			if (frame) return;
			frame = window.requestAnimationFrame(() => {
				frame = 0;
				window.dispatchEvent(new Event("resize"));
			});
		};
		pip.addEventListener("resize", nudge);
		const observer = new ResizeObserver(nudge);
		observer.observe(pdoc.documentElement);
		nudge();
		const forward = (event) => {
			let clone;
			if (event.type.startsWith("key")) {
				if (event.target && container.contains(event.target)) return;
				clone = new KeyboardEvent(event.type, event);
			} else if (event.type === "wheel") clone = new WheelEvent(event.type, event);
			else if (event.type.startsWith("pointer")) clone = new PointerEvent(event.type, event);
			else clone = new MouseEvent(event.type, event);
			document.dispatchEvent(clone);
		};
		const forwardTypes = [
			"mousemove",
			"pointermove",
			"mouseover",
			"mouseout",
			"wheel",
			"keydown",
			"keyup"
		];
		for (const type of forwardTypes) pdoc.addEventListener(type, forward, { passive: true });
		const restoreStyle = (el, value) => {
			if (value === null) el.removeAttribute("style");
			else el.setAttribute("style", value);
		};
		pip.addEventListener("pagehide", () => {
			pip.removeEventListener("resize", nudge);
			observer.disconnect();
			for (const type of forwardTypes) pdoc.removeEventListener(type, forward);
			restoreStyle(container, containerStyle);
			restoreStyle(video, videoStyle);
			if (placeholder.parentNode) placeholder.parentNode.replaceChild(container, placeholder);
			else if (originalNext && originalNext.parentNode === originalParent) originalParent.insertBefore(container, originalNext);
			else originalParent.appendChild(container);
			const realVisibility = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState")?.get?.call(document);
			if (window.__tbxPipResume) window.setTimeout(() => void video.play().catch(() => void 0), 0);
			else if (realVisibility === "hidden") video.pause();
			nudge();
		});
		return "entered";
	}
	/**
	* Embedded players from another origin (Dailymotion, Vimeo, news embeds) cannot open a Document
	* PiP window themselves and cannot be moved without reloading. Instead, open a fresh copy of the
	* same embed inside a Document PiP window from the top-level page, resume it at the current
	* position, and pause the original. On close, the original jumps to where the copy stopped.
	*
	* Talks to the auto-PiP page script inside the embed via postMessage ({ __tbxPip: ... }).
	* Must stay fully self-contained (serialized by chrome.scripting.executeScript).
	*/
	async function enterEmbeddedPlayerPip() {
		const api = window.documentPictureInPicture;
		if (!api || window !== window.top) return "unsupported";
		if (api.window) return "entered";
		const frames = Array.from(document.querySelectorAll("iframe")).filter((f) => {
			const r = f.getBoundingClientRect();
			return r.width >= 160 && r.height >= 90 && !!f.contentWindow && !!f.src;
		});
		if (frames.length === 0) return "none";
		const snapshots = await new Promise((resolve) => {
			const replies = [];
			const onMessage = (event) => {
				const data = event.data;
				if (!data || data.__tbxPip !== "snapshot") return;
				const frame = frames.find((f) => f.contentWindow === event.source);
				if (frame) replies.push({
					frame,
					t: Number(data.t) || 0,
					playing: !!data.playing,
					ratio: Number(data.ratio) || 16 / 9
				});
			};
			window.addEventListener("message", onMessage);
			for (const f of frames) f.contentWindow?.postMessage({ __tbxPip: "snapshot-request" }, "*");
			window.setTimeout(() => {
				window.removeEventListener("message", onMessage);
				resolve(replies);
			}, 350);
		});
		if (snapshots.length === 0) return "none";
		snapshots.sort((a, b) => Number(b.playing) - Number(a.playing));
		const target = snapshots[0];
		const original = target.frame;
		const width = 640;
		const height = Math.round(width / target.ratio);
		let pip;
		try {
			pip = await api.requestWindow({
				width,
				height
			});
		} catch {
			return "error";
		}
		original.contentWindow?.postMessage({ __tbxPip: "pause" }, "*");
		const url = new URL(original.src, location.href);
		const hash = url.hash.replace(/^#/, "");
		url.hash = `${hash ? `${hash}&` : ""}tbx-pip-t=${target.t.toFixed(2)}`;
		const pdoc = pip.document;
		const style = pdoc.createElement("style");
		style.textContent = "html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}iframe{position:fixed;inset:0;width:100%;height:100%;border:0}";
		pdoc.head.appendChild(style);
		const copy = pdoc.createElement("iframe");
		const allow = new Set((original.getAttribute("allow") ?? "").split(";").map((s) => s.trim()).filter(Boolean));
		for (const feature of [
			"autoplay",
			"fullscreen",
			"picture-in-picture",
			"encrypted-media"
		]) allow.add(feature);
		copy.setAttribute("allow", Array.from(allow).join("; "));
		copy.setAttribute("allowfullscreen", "");
		copy.src = url.toString();
		pdoc.body.appendChild(copy);
		let lastT = target.t;
		const onTime = (event) => {
			const data = event.data;
			if (data?.__tbxPip === "time" && event.source === copy.contentWindow) lastT = Number(data.t) || lastT;
		};
		pip.addEventListener("message", onTime);
		pip.addEventListener("pagehide", () => {
			pip.removeEventListener("message", onTime);
			const realVisibility = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState")?.get?.call(document);
			const resume = window.__tbxPipResume === true;
			original.contentWindow?.postMessage({
				__tbxPip: "seek",
				t: lastT,
				play: resume || realVisibility === "visible"
			}, "*");
		});
		return "entered";
	}
	//#endregion
	//#region src/core/pip/streamingPlayerPip.ts
	/**
	* Picture-in-Picture for DRM streaming players (Prime Video, Netflix, Hotstar, ...). Their own
	* player UI can't be moved (its layout is driven by the main window), so only the <video> moves
	* into a Document PiP window and a Prime Video-style control layer is drawn around it. Controls
	* press the site's own buttons when they exist, so playback logic stays with the site.
	*
	* Must stay fully self-contained (no references to module scope): it is serialized by
	* chrome.scripting.executeScript and also bundled into the auto-PiP page script.
	*/
	async function enterStreamingPlayerPip() {
		const api = window.documentPictureInPicture;
		if (!api || window !== window.top) return "unsupported";
		if (api.window) return "entered";
		const collect = (root, out) => {
			root.querySelectorAll("video").forEach((v) => out.push(v));
			root.querySelectorAll("*").forEach((el) => {
				if (el.shadowRoot) collect(el.shadowRoot, out);
			});
		};
		const videos = [];
		collect(document, videos);
		let video = null;
		let bestScore = -1;
		for (const v of videos) {
			if (v.readyState === 0) continue;
			const r = v.getBoundingClientRect();
			if (r.width < 120 || r.height < 68) continue;
			const score = (!v.paused && !v.ended ? 0xe8d4a51000 : 0) + r.width * r.height;
			if (score > bestScore) {
				bestScore = score;
				video = v;
			}
		}
		if (!video || !video.parentNode) return "none";
		const v = video;
		const q = (...selectors) => {
			for (const s of selectors) {
				const el = document.querySelector(s);
				if (el) return el;
			}
			return null;
		};
		const site = {
			title: () => q(".atvwebplayersdk-title-text", "[data-uia=\"video-title\"] h4", ".title-text"),
			episode: () => q(".atvwebplayersdk-subtitle-text", "[data-uia=\"video-title\"] span"),
			time: () => q(".atvwebplayersdk-timeindicator-text"),
			captions: () => q(".atvwebplayersdk-captions-text", ".player-timedtext", ".shaka-text-container"),
			playPause: () => q(".atvwebplayersdk-playpause-button", "button[data-uia=\"control-play-pause-play\"]", "button[data-uia=\"control-play-pause-pause\"]"),
			back: () => q(".atvwebplayersdk-fastseekback-button", "button[data-uia=\"control-back10\"]"),
			forward: () => q(".atvwebplayersdk-fastseekforward-button", "button[data-uia=\"control-forward10\"]"),
			next: () => q(".atvwebplayersdk-nexttitle-button", "button[data-uia=\"control-next\"]")
		};
		const ratio = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9;
		let pip;
		try {
			pip = await api.requestWindow({
				width: 720,
				height: Math.round(720 / ratio)
			});
		} catch {
			return "error";
		}
		const pdoc = pip.document;
		const style = pdoc.createElement("style");
		style.textContent = `
    html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden;color:#fff;
      font-family:"Amazon Ember","Segoe UI",system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
    video{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;
      max-width:none!important;max-height:none!important;object-fit:contain!important;transform:none!important;margin:0!important}
    .ui{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between;
      transition:opacity .25s ease;user-select:none}
    .ui.hide{opacity:0;cursor:none}
    .ui.hide *{pointer-events:none}
    .top{display:flex;align-items:flex-start;gap:14px;padding:16px 18px 40px;
      background:linear-gradient(rgba(0,0,0,.75),transparent)}
    .meta{flex:1;min-width:0}
    .title{font-size:20px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ep{margin-top:4px;font-size:14px;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .icons{display:flex;gap:6px}
    button{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#fff}
    button:focus-visible{outline:2px solid #fff;outline-offset:2px}
    .ib{width:34px;height:34px;border-radius:50%}
    .ib:hover{background:rgba(255,255,255,.15)}
    .ib svg{width:20px;height:20px}
    .ib.off{opacity:.55}
    .center{display:flex;align-items:center;justify-content:center;gap:28px}
    .skip svg{width:30px;height:30px}
    .play{width:60px;height:60px;border-radius:50%;background:rgba(66,66,66,.85)}
    .play:hover{background:rgba(90,90,90,.95)}
    .play svg{width:30px;height:30px}
    .bottom{padding:40px 18px 14px;background:linear-gradient(transparent,rgba(0,0,0,.8))}
    .bar{display:flex;align-items:center;gap:12px;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
    .track{position:relative;flex:1;height:14px;display:flex;align-items:center;cursor:pointer}
    .rail{position:absolute;left:0;right:0;height:2px;background:rgba(255,255,255,.35);border-radius:2px}
    .fill{position:absolute;left:0;height:2px;background:#fff;border-radius:2px}
    .track:hover .rail,.track:hover .fill{height:4px}
    .knob{position:absolute;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#fff;opacity:0;transition:opacity .15s}
    .track:hover .knob{opacity:1}
    .row{display:flex;justify-content:flex-end;margin-top:10px;min-height:30px}
    .next{padding:6px 12px;border-radius:4px;background:rgba(66,66,66,.9);font-size:13px;font-weight:700}
    .next:hover{background:rgba(90,90,90,.95)}
    .cc{position:fixed;left:50%;bottom:22%;transform:translateX(-50%);max-width:86%;text-align:center;
      font-size:clamp(14px,3.4vw,24px);line-height:1.35;text-shadow:0 0 4px #000,0 0 2px #000;pointer-events:none;white-space:pre-line}
    .cc:empty{display:none}
  `;
		pdoc.head.appendChild(style);
		const ICON = {
			play: "M8 5v14l11-7z",
			pause: "M6 19h4V5H6v14zm8-14v14h4V5h-4z",
			back: "M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.1 11h-.85v-3.26l-1.01.31v-.69l1.77-.63h.09V16zm4.28-1.76c0 .32-.03.6-.1.82s-.17.42-.29.57-.28.26-.45.33-.37.1-.59.1-.41-.03-.59-.1-.33-.18-.46-.33-.23-.34-.3-.57-.11-.5-.11-.82v-.74c0-.32.03-.6.1-.82s.17-.42.29-.57.28-.26.45-.33.37-.1.59-.1.41.03.59.1.33.18.46.33.23.34.3.57.11.5.11.82v.74zm-.85-.86c0-.19-.01-.35-.04-.48s-.07-.23-.12-.31-.11-.14-.19-.17-.16-.05-.25-.05-.18.02-.25.05-.14.09-.19.17-.09.18-.12.31-.04.29-.04.48v.97c0 .19.01.35.04.48s.07.24.12.32.11.14.19.17.16.05.25.05.18-.02.25-.05.14-.09.19-.17.09-.19.11-.32.04-.29.04-.48v-.97z",
			fwd: "M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2zm-7.46 2.22c-.06.05-.12.09-.2.12s-.17.04-.27.04c-.09 0-.17-.01-.25-.04s-.14-.06-.2-.11-.1-.1-.13-.17-.05-.14-.05-.22h-.85c0 .21.04.39.12.55s.19.28.33.38.29.18.46.23.35.07.53.07c.21 0 .41-.03.6-.08s.34-.14.48-.24.24-.24.32-.39.12-.33.12-.53c0-.23-.06-.44-.18-.61s-.3-.3-.54-.39c.1-.05.2-.1.28-.17s.15-.14.2-.22.1-.16.13-.25.04-.18.04-.27c0-.2-.04-.37-.11-.53s-.17-.28-.3-.38-.28-.18-.46-.23-.37-.08-.59-.08c-.19 0-.38.03-.54.08s-.32.13-.44.23-.23.21-.3.34-.11.29-.11.45h.85c0-.07.02-.14.05-.2s.07-.11.12-.15.11-.07.18-.1.14-.03.22-.03c.1 0 .18.01.25.04s.13.06.18.11.08.11.11.17.04.14.04.22c0 .18-.05.32-.16.43s-.26.16-.48.16h-.43v.66h.45c.11 0 .2.01.29.04s.16.06.22.11.11.12.14.2.05.18.05.29c0 .09-.01.17-.04.24s-.08.11-.13.17zm3.9-3.44c-.18-.07-.37-.1-.59-.1s-.41.03-.59.1-.33.18-.45.33-.23.34-.29.57-.1.5-.1.82v.74c0 .32.04.6.11.82s.17.42.3.57.28.26.46.33.37.1.59.1.41-.03.59-.1.33-.18.45-.33.22-.34.29-.57.1-.5.1-.82v-.74c0-.32-.04-.6-.11-.82s-.17-.42-.3-.57-.28-.26-.46-.33zm.01 2.57c0 .19-.01.35-.04.48s-.06.24-.11.32-.11.14-.19.17-.16.05-.25.05-.18-.02-.25-.05-.14-.09-.19-.17-.09-.19-.12-.32-.04-.29-.04-.48v-.97c0-.19.01-.35.04-.48s.06-.23.12-.31.11-.14.19-.17.16-.05.25-.05.18.02.25.05.14.09.19.17.09.18.12.31.04.29.04.48v.97z",
			cc: "M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z",
			vol: "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z",
			mute: "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z",
			tab: "M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"
		};
		const svg = (name) => {
			const s = pdoc.createElementNS("http://www.w3.org/2000/svg", "svg");
			s.setAttribute("viewBox", "0 0 24 24");
			const p = pdoc.createElementNS("http://www.w3.org/2000/svg", "path");
			p.setAttribute("d", ICON[name]);
			p.setAttribute("fill", "currentColor");
			s.appendChild(p);
			return s;
		};
		const mk = (tag, cls, text) => {
			const n = pdoc.createElement(tag);
			n.className = cls;
			if (text) n.textContent = text;
			return n;
		};
		const iconBtn = (cls, name, label, onClick) => {
			const b = mk("button", cls);
			b.title = label;
			b.setAttribute("aria-label", label);
			b.appendChild(svg(name));
			b.addEventListener("click", (e) => {
				e.stopPropagation();
				onClick();
				poke();
			});
			return b;
		};
		const setIcon = (b, name) => b.replaceChildren(svg(name));
		const parseClock = (s) => s.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
		const clock = () => {
			const parts = (site.time()?.textContent ?? "").match(/\d{1,2}(?::\d{2}){1,2}/g);
			if (parts && parts.length >= 2) return {
				elapsed: parseClock(parts[0]),
				total: parseClock(parts[1])
			};
			return {
				elapsed: v.currentTime,
				total: Number.isFinite(v.duration) ? v.duration : 0
			};
		};
		const fmt = (sec) => {
			const s = Math.max(0, Math.floor(sec));
			const h = Math.floor(s / 3600);
			const m = Math.floor(s % 3600 / 60);
			const ss = String(s % 60).padStart(2, "0");
			return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${String(m).padStart(2, "0")}:${ss}`;
		};
		const seekBy = (delta) => {
			v.currentTime = Math.max(0, v.currentTime + delta);
		};
		const ui = mk("div", "ui");
		const title = mk("div", "title");
		const episode = mk("div", "ep");
		const meta = mk("div", "meta");
		meta.append(title, episode);
		let ccOn = true;
		const ccBtn = iconBtn("ib", "cc", "Subtitles", () => {
			ccOn = !ccOn;
			ccBtn.classList.toggle("off", !ccOn);
			syncCaptions();
		});
		const volBtn = iconBtn("ib", v.muted ? "mute" : "vol", "Mute", () => {
			v.muted = !v.muted;
		});
		const tabBtn = iconBtn("ib", "tab", "Back to tab", () => pip.close());
		const icons = mk("div", "icons");
		icons.append(ccBtn, volBtn, tabBtn);
		const top = mk("div", "top");
		top.append(meta, icons);
		const togglePlay = () => {
			const btn = site.playPause();
			if (btn) btn.click();
			else if (v.paused) v.play();
			else v.pause();
		};
		const back = iconBtn("skip", "back", "Back 10 seconds", () => {
			const btn = site.back();
			if (btn) btn.click();
			else seekBy(-10);
		});
		const playBtn = iconBtn("play", v.paused ? "play" : "pause", "Play/Pause", togglePlay);
		const fwd = iconBtn("skip", "fwd", "Forward 10 seconds", () => {
			const btn = site.forward();
			if (btn) btn.click();
			else seekBy(10);
		});
		const center = mk("div", "center");
		center.append(back, playBtn, fwd);
		const elapsedEl = mk("span", "");
		const remainEl = mk("span", "");
		const track = mk("div", "track");
		const rail = mk("div", "rail");
		const fillEl = mk("div", "fill");
		const knob = mk("div", "knob");
		track.append(rail, fillEl, knob);
		track.addEventListener("click", (e) => {
			e.stopPropagation();
			const r = track.getBoundingClientRect();
			const { elapsed, total } = clock();
			if (!total) return;
			seekBy((e.clientX - r.left) / r.width * total - elapsed);
			poke();
		});
		const bar = mk("div", "bar");
		bar.append(elapsedEl, track, remainEl);
		const row = mk("div", "row");
		const nextBtn = mk("button", "next", "Next Episode");
		nextBtn.addEventListener("click", (e) => {
			e.stopPropagation();
			site.next()?.click();
		});
		row.appendChild(nextBtn);
		const bottom = mk("div", "bottom");
		bottom.append(bar, row);
		ui.append(top, center, bottom);
		const cc = mk("div", "cc");
		const originalParent = v.parentNode;
		const originalNext = v.nextSibling;
		const videoStyle = v.getAttribute("style");
		const rect = v.getBoundingClientRect();
		const placeholder = document.createElement("div");
		placeholder.style.cssText = `width:${rect.width}px;height:${rect.height}px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;`;
		placeholder.textContent = "Playing in Picture-in-Picture";
		originalParent.insertBefore(placeholder, v);
		pdoc.body.append(v, cc, ui);
		const syncCaptions = () => {
			cc.textContent = ccOn ? (site.captions()?.innerText ?? "").trim() : "";
		};
		const sync = () => {
			title.textContent = site.title()?.textContent?.trim() || document.title.replace(/\s*[-|].*$/, "");
			episode.textContent = site.episode()?.textContent?.trim() ?? "";
			const { elapsed, total } = clock();
			elapsedEl.textContent = fmt(elapsed);
			remainEl.textContent = total ? fmt(total - elapsed) : "";
			const pct = total ? `${Math.min(100, elapsed / total * 100)}%` : "0%";
			fillEl.style.width = pct;
			knob.style.left = pct;
			nextBtn.style.display = site.next() ? "" : "none";
			setIcon(playBtn, v.paused ? "play" : "pause");
			setIcon(volBtn, v.muted ? "mute" : "vol");
			syncCaptions();
		};
		sync();
		const timer = window.setInterval(sync, 250);
		const mediaEvents = [
			"play",
			"pause",
			"volumechange",
			"seeked"
		];
		for (const type of mediaEvents) v.addEventListener(type, sync);
		let hideTimer = 0;
		const poke = () => {
			ui.classList.remove("hide");
			window.clearTimeout(hideTimer);
			hideTimer = window.setTimeout(() => {
				if (!v.paused) ui.classList.add("hide");
			}, 2500);
		};
		pdoc.addEventListener("mousemove", poke);
		ui.addEventListener("click", (e) => {
			if (e.target === ui || e.target === center) togglePlay();
		});
		const onKey = (e) => {
			if (e.key === " " || e.key === "k") togglePlay();
			else if (e.key === "ArrowLeft") back.click();
			else if (e.key === "ArrowRight") fwd.click();
			else if (e.key === "m") volBtn.click();
			else return;
			e.preventDefault();
			poke();
		};
		pdoc.addEventListener("keydown", onKey);
		poke();
		pip.addEventListener("pagehide", () => {
			window.clearInterval(timer);
			window.clearTimeout(hideTimer);
			for (const type of mediaEvents) v.removeEventListener(type, sync);
			if (videoStyle === null) v.removeAttribute("style");
			else v.setAttribute("style", videoStyle);
			if (placeholder.parentNode) placeholder.parentNode.replaceChild(v, placeholder);
			else if (originalNext && originalNext.parentNode === originalParent) originalParent.insertBefore(v, originalNext);
			else originalParent.appendChild(v);
			const realVisibility = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState")?.get?.call(document);
			if (window.__tbxPipResume) window.setTimeout(() => void v.play().catch(() => void 0), 0);
			else if (realVisibility === "hidden") v.pause();
		});
		return "entered";
	}
	//#endregion
	//#region src/chrome/content/pip/auto.ts
	/** Set by the background when PiP (or auto-PiP) is switched off while this page is open. */
	var pipOff = () => window.__tbxPipOff === true;
	var videoCache = null;
	function collectVideosShallow(root, out) {
		root.querySelectorAll("video").forEach((v) => out.push(v));
	}
	function collectVideosDeep(root, out) {
		collectVideosShallow(root, out);
		root.querySelectorAll("*").forEach((el) => {
			if (el.shadowRoot) collectVideosDeep(el.shadowRoot, out);
		});
	}
	function allVideos() {
		const now = Date.now();
		if (videoCache && now - videoCache.at < 1e3) return videoCache.videos;
		const shallow = [];
		collectVideosShallow(document, shallow);
		const videos = shallow.length > 0 ? shallow : (() => {
			const deep = [];
			collectVideosDeep(document, deep);
			return deep;
		})();
		videoCache = {
			at: now,
			videos
		};
		return videos;
	}
	function largestVideo(filter) {
		const videos = allVideos();
		let best = null;
		let bestArea = 0;
		for (const v of videos) {
			if (v.readyState === 0) continue;
			const r = v.getBoundingClientRect();
			if (!filter(v, r)) continue;
			const area = r.width * r.height;
			if (area > bestArea) {
				bestArea = area;
				best = v;
			}
		}
		return best;
	}
	var playingVideo = () => largestVideo((v) => !v.paused && !v.ended && v.readyState > 2);
	var nativeVisibility = Object.getOwnPropertyDescriptor(Document.prototype, "visibilityState")?.get;
	var nativeHidden = Object.getOwnPropertyDescriptor(Document.prototype, "hidden")?.get;
	var realVisibility = () => nativeVisibility?.call(document) ?? "visible";
	var isFloatingCopy = /(?:^|[#&])tbx-pip-t=/.test(location.hash);
	var pipEnteredAt = 0;
	function pipActive() {
		const docPip = window.documentPictureInPicture;
		return isFloatingCopy || !!document.pictureInPictureElement || !!docPip?.window;
	}
	/**
	* While a video is floating, stop the page from reacting to the tab being hidden or blurred
	* (many players pause or tear down playback then) and from immediately kicking the video out
	* of PiP. Runs at document_start so these guards are in place before the page's own listeners.
	*/
	function installPipGuards() {
		try {
			Object.defineProperty(document, "visibilityState", {
				configurable: true,
				get: () => pipActive() ? "visible" : realVisibility()
			});
			Object.defineProperty(document, "hidden", {
				configurable: true,
				get: () => pipActive() ? false : Boolean(nativeHidden?.call(document))
			});
		} catch {}
		const swallow = (event) => {
			if (pipActive()) event.stopImmediatePropagation();
		};
		for (const type of ["visibilitychange", "webkitvisibilitychange"]) {
			document.addEventListener(type, swallow, true);
			window.addEventListener(type, swallow, true);
		}
		for (const type of ["blur", "freeze"]) window.addEventListener(type, swallow, true);
		document.addEventListener("enterpictureinpicture", () => pipEnteredAt = Date.now(), true);
		const nativeExit = document.exitPictureInPicture.bind(document);
		document.exitPictureInPicture = () => {
			if (Date.now() - pipEnteredAt < 2e3) return Promise.resolve();
			return nativeExit();
		};
	}
	/**
	* Pages sometimes replace requestPictureInPicture with a no-op to block PiP. Use the browser's
	* own implementation from a clean frame in that case. Does not touch DRM / content protection.
	*/
	async function requestPipUnblocked(video) {
		video.removeAttribute("disablePictureInPicture");
		try {
			Object.defineProperty(video, "disablePictureInPicture", {
				configurable: true,
				get: () => false,
				set: () => void 0
			});
		} catch {}
		const current = HTMLVideoElement.prototype.requestPictureInPicture;
		if (/\[native code\]/.test(Function.prototype.toString.call(current))) {
			await current.call(video);
			return;
		}
		const frame = document.createElement("iframe");
		frame.style.display = "none";
		document.documentElement.appendChild(frame);
		try {
			await (frame.contentWindow?.HTMLVideoElement.prototype.requestPictureInPicture ?? current).call(video);
		} finally {
			frame.remove();
		}
	}
	async function enterNativePip(video) {
		try {
			await requestPipUnblocked(video);
			video.addEventListener("leavepictureinpicture", () => {
				if (window.__tbxPipResume) video.play().catch(() => void 0);
				else if (realVisibility() === "hidden") video.pause();
			}, { once: true });
		} catch {}
	}
	async function onEnterPip() {
		if (pipOff()) return;
		if (!playingVideo()) {
			if (window === window.top) await enterEmbeddedPlayerPip();
			return;
		}
		const full = await enterFullPlayerPip();
		if (full === "entered") return;
		if (full === "drm" && await enterStreamingPlayerPip() === "entered") return;
		const video = playingVideo();
		if (video) await enterNativePip(video);
	}
	function register() {
		try {
			navigator.mediaSession.setActionHandler("enterpictureinpicture", pipOff() ? null : () => void onEnterPip());
		} catch {}
	}
	function buildIcon() {
		const NS = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(NS, "svg");
		for (const [k, v] of Object.entries({
			width: "20",
			height: "20",
			viewBox: "0 0 24 24",
			fill: "none",
			stroke: "currentColor",
			"stroke-width": "2",
			"aria-hidden": "true"
		})) svg.setAttribute(k, v);
		const rect = (x, y, w, h, rx, fill) => {
			const r = document.createElementNS(NS, "rect");
			r.setAttribute("x", x);
			r.setAttribute("y", y);
			r.setAttribute("width", w);
			r.setAttribute("height", h);
			r.setAttribute("rx", rx);
			if (fill) r.setAttribute("fill", fill);
			svg.appendChild(r);
		};
		rect("2", "4", "20", "14", "2");
		rect("12", "10", "8", "6", "1", "currentColor");
		return svg;
	}
	function installFrameButton() {
		if (window === window.top || !document.pictureInPictureEnabled) return;
		const bestVideo = () => largestVideo((_v, r) => r.width >= 160 && r.height >= 90);
		const btn = document.createElement("button");
		btn.type = "button";
		btn.setAttribute("aria-label", "Picture-in-Picture");
		btn.setAttribute("data-tbx-pip-btn", "");
		btn.title = "Picture-in-Picture";
		btn.style.cssText = "all:initial;position:fixed;z-index:2147483647;width:36px;height:36px;display:none;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;background:rgba(20,20,20,.72);color:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4);";
		btn.appendChild(buildIcon());
		let hideTimer = 0;
		const show = () => {
			const v = pipOff() ? null : bestVideo();
			if (!v) {
				btn.style.display = "none";
				return;
			}
			const r = v.getBoundingClientRect();
			btn.style.left = `${Math.max(8, r.left + 8)}px`;
			btn.style.top = `${Math.max(8, r.top + 8)}px`;
			btn.style.display = "flex";
			window.clearTimeout(hideTimer);
			hideTimer = window.setTimeout(() => {
				btn.style.display = "none";
			}, 2800);
		};
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (document.pictureInPictureElement) {
				document.exitPictureInPicture();
				return;
			}
			if (pipOff()) return;
			const v = bestVideo();
			if (!v) return;
			let handled = false;
			const onResult = (event) => {
				const data = event.data;
				if (event.source !== window.top || data?.__tbxPip !== "embedded-result") return;
				handled = true;
				window.removeEventListener("message", onResult);
				if (!data.ok) enterNativePip(v);
			};
			window.addEventListener("message", onResult);
			window.top?.postMessage({ __tbxPip: "open-embedded" }, "*");
			window.setTimeout(() => {
				if (handled) return;
				window.removeEventListener("message", onResult);
				enterNativePip(v);
			}, 1500);
		});
		btn.addEventListener("mouseenter", () => window.clearTimeout(hideTimer));
		btn.addEventListener("mouseleave", show);
		let moveRaf = 0;
		let lastMoveAt = 0;
		const onMove = () => {
			if (moveRaf) return;
			moveRaf = requestAnimationFrame(() => {
				moveRaf = 0;
				const now = Date.now();
				if (now - lastMoveAt < 250) return;
				lastMoveAt = now;
				show();
			});
		};
		document.addEventListener("mousemove", onMove, {
			passive: true,
			capture: true
		});
		document.documentElement.appendChild(btn);
	}
	function installEmbedBridge() {
		if (window === window.top) return;
		const mainVideo = () => largestVideo((_v, r) => r.width >= 160 && r.height >= 90);
		window.addEventListener("message", (event) => {
			if (event.source !== window.parent) return;
			const data = event.data;
			if (!data?.__tbxPip) return;
			const v = mainVideo();
			if (!v) return;
			if (data.__tbxPip === "snapshot-request") window.parent.postMessage({
				__tbxPip: "snapshot",
				t: v.currentTime,
				playing: !v.paused && !v.ended,
				ratio: v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9
			}, "*");
			else if (data.__tbxPip === "pause") v.pause();
			else if (data.__tbxPip === "seek") {
				if (Number.isFinite(data.t)) v.currentTime = Number(data.t);
				if (data.play) v.play().catch(() => void 0);
			}
		});
		const match = /(?:^|[#&])tbx-pip-t=([\d.]+)/.exec(location.hash);
		if (!match) return;
		const startAt = Number(match[1]);
		let resumed = false;
		const startedAt = Date.now();
		const timer = window.setInterval(() => {
			const v = mainVideo();
			if (!v) {
				if (Date.now() - startedAt > 2e4) window.clearInterval(timer);
				return;
			}
			if (!resumed && v.readyState > 0) {
				resumed = true;
				if (startAt > 0 && Math.abs(v.currentTime - startAt) > 1.5) v.currentTime = startAt;
				v.play().catch(() => {
					v.muted = true;
					v.play().catch(() => void 0);
				});
			}
			window.parent.postMessage({
				__tbxPip: "time",
				t: v.currentTime
			}, "*");
		}, 1e3);
	}
	function installTopBridge() {
		if (window !== window.top) return;
		window.addEventListener("message", (event) => {
			if (event.data?.__tbxPip !== "open-embedded" || !event.source) return;
			const source = event.source;
			if (pipOff()) {
				source.postMessage({
					__tbxPip: "embedded-result",
					ok: true
				}, "*");
				return;
			}
			enterEmbeddedPlayerPip().then((result) => {
				source.postMessage({
					__tbxPip: "embedded-result",
					ok: result === "entered"
				}, "*");
			});
		});
	}
	var guarded = window;
	if ("mediaSession" in navigator && !guarded.__tbxPipAuto) {
		guarded.__tbxPipAuto = true;
		installPipGuards();
		register();
		installFrameButton();
		installEmbedBridge();
		installTopBridge();
		document.addEventListener("playing", register, true);
		if (window === window.top) window.setInterval(register, 4e3);
	}
	//#endregion
})();
