(function() {
	//#region src/core/sites/youtube/constants.ts
	var PAGE_CMD_KEY = "__toolboxYtCmd";
	var PAGE_EVT_KEY = "__toolboxYtEvt";
	//#endregion
	//#region src/chrome/content/sites/youtube/main.ts
	var sponsorTimeHandler = null;
	function getVideo() {
		return document.querySelector("video.html5-main-video, video");
	}
	function getPlayer() {
		return document.querySelector("#movie_player") ?? null;
	}
	var MIN_RATE = .0625;
	var MAX_RATE = 16;
	var QUALITY_LABELS = {
		"144": "tiny",
		"360": "medium",
		"480": "large",
		"720": "hd720",
		"1080": "hd1080",
		"1440": "hd1440",
		"2160": "hd2160",
		"4320": "highres"
	};
	/** Best-effort: asks the player for a quality; YouTube falls back if unavailable for the video. */
	function applyQuality(value) {
		const player = document.querySelector("#movie_player");
		const q = QUALITY_LABELS[value];
		if (!player || !q) return;
		player.setPlaybackQualityRange?.(q, q);
		player.setPlaybackQuality?.(q);
	}
	function setRate(player, rate) {
		const next = Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
		const video = getVideo();
		if (next <= 2 && player?.setPlaybackRate) player.setPlaybackRate(next);
		else if (video) video.playbackRate = next;
	}
	function currentRate(player) {
		return getVideo()?.playbackRate ?? player?.getPlaybackRate?.() ?? 1;
	}
	function applyPlayerSettings(payload) {
		if (!payload) return;
		const player = getPlayer();
		const video = getVideo();
		if (!player && !video) return;
		const speed = Math.min(MAX_RATE, Math.max(MIN_RATE, Number(payload.defaultSpeed ?? 1) || 1));
		if (speed <= 2 && player?.setPlaybackRate) player.setPlaybackRate(speed);
		else if (video) video.playbackRate = speed;
		applyQuality(String(payload.defaultQuality ?? "auto"));
		if (payload.disableAutoplay && video) video.autoplay = false;
		if (payload.rememberVolume) {
			const saved = localStorage.getItem("tbx-yt-volume");
			if (saved && player?.setVolume) player.setVolume(Number(saved));
		}
		if (payload.alwaysTheater) document.querySelector(".ytp-size-button")?.click();
	}
	function skipSponsor(segments) {
		const video = getVideo();
		if (!video) return;
		if (sponsorTimeHandler) video.removeEventListener("timeupdate", sponsorTimeHandler);
		const jump = () => {
			const now = video.currentTime;
			for (const s of segments) {
				const [start, end] = s.segment;
				if (now >= start && now < end - .05) {
					video.currentTime = end;
					break;
				}
			}
		};
		sponsorTimeHandler = jump;
		jump();
		video.addEventListener("timeupdate", jump);
	}
	var guarded = window;
	if (!guarded.__toolboxSitesYtMain && window === window.top) {
		guarded.__toolboxSitesYtMain = true;
		window.addEventListener("message", (event) => {
			if (event.source !== window) return;
			const data = event.data;
			if (!data || data["__toolboxYtCmd"] === void 0) return;
			const cmd = String(data[PAGE_CMD_KEY]);
			const payload = data.payload;
			if (cmd === "applyPlayer") applyPlayerSettings(payload);
			if (cmd === "wheel" && payload && typeof payload === "object") {
				const p = payload;
				const player = getPlayer();
				if (p.volume && player?.setVolume && player.getVolume) {
					const next = Math.min(100, Math.max(0, player.getVolume() - p.deltaY * .05));
					player.setVolume(next);
					localStorage.setItem("tbx-yt-volume", String(next));
				}
				if (p.speed) setRate(player, currentRate(player) + (p.deltaY > 0 ? -.05 : .05));
			}
			if (cmd === "speedDelta" && payload && typeof payload === "object") {
				const player = getPlayer();
				const delta = Number(payload.delta);
				if (Number.isFinite(delta)) setRate(player, currentRate(player) + delta);
			}
			if (cmd === "sponsorSegments" && Array.isArray(payload)) skipSponsor(payload);
			window.postMessage({
				[PAGE_EVT_KEY]: "ack",
				payload: cmd
			}, location.origin || "*");
		});
	}
	//#endregion
})();
