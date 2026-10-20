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
		const restoreStyle = (el, value) => {
			if (value === null) el.removeAttribute("style");
			else el.setAttribute("style", value);
		};
		pip.addEventListener("pagehide", () => {
			pip.removeEventListener("resize", nudge);
			observer.disconnect();
			restoreStyle(container, containerStyle);
			restoreStyle(video, videoStyle);
			if (placeholder.parentNode) placeholder.parentNode.replaceChild(container, placeholder);
			else if (originalNext && originalNext.parentNode === originalParent) originalParent.insertBefore(container, originalNext);
			else originalParent.appendChild(container);
			if (document.visibilityState === "hidden") video.pause();
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
			original.contentWindow?.postMessage({
				__tbxPip: "seek",
				t: lastT,
				play: document.visibilityState === "visible"
			}, "*");
		});
		return "entered";
	}
	//#endregion
	//#region src/chrome/content/pip/auto.ts
	function collectVideos(root, out) {
		root.querySelectorAll("video").forEach((v) => out.push(v));
		root.querySelectorAll("*").forEach((el) => {
			if (el.shadowRoot) collectVideos(el.shadowRoot, out);
		});
	}
	function largestVideo(filter) {
		const videos = [];
		collectVideos(document, videos);
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
	async function enterNativePip(video) {
		video.removeAttribute("disablePictureInPicture");
		video.disablePictureInPicture = false;
		try {
			await video.requestPictureInPicture();
			video.addEventListener("leavepictureinpicture", () => {
				if (document.visibilityState === "hidden") video.pause();
			}, { once: true });
		} catch {}
	}
	async function onEnterPip() {
		if (!playingVideo()) {
			if (window === window.top) await enterEmbeddedPlayerPip();
			return;
		}
		if (await enterFullPlayerPip() === "entered") return;
		const video = playingVideo();
		if (video) await enterNativePip(video);
	}
	function register() {
		try {
			navigator.mediaSession.setActionHandler("enterpictureinpicture", () => void onEnterPip());
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
		btn.title = "Picture-in-Picture";
		btn.style.cssText = "all:initial;position:fixed;z-index:2147483647;width:36px;height:36px;display:none;align-items:center;justify-content:center;cursor:pointer;border-radius:8px;background:rgba(20,20,20,.72);color:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4);";
		btn.appendChild(buildIcon());
		let hideTimer = 0;
		const show = () => {
			const v = bestVideo();
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
		document.addEventListener("mousemove", show, {
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
		register();
		installFrameButton();
		installEmbedBridge();
		installTopBridge();
		document.addEventListener("playing", register, true);
		window.setInterval(register, 4e3);
	}
	//#endregion
})();
