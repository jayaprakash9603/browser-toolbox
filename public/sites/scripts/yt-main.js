(function() {
	//#region src/core/sites/youtube/constants.ts
	var PAGE_CMD_KEY = "__toolboxYtCmd";
	var PAGE_EVT_KEY = "__toolboxYtEvt";
	//#endregion
	//#region src/chrome/content/sites/youtube/main.ts
	function getVideo() {
		return document.querySelector("video.html5-main-video, video");
	}
	function getPlayer() {
		return document.querySelector("#movie_player") ?? null;
	}
	function applyPlayerSettings(payload) {
		if (!payload) return;
		const player = getPlayer();
		const video = getVideo();
		if (!player && !video) return;
		const speed = Number(payload.defaultSpeed ?? 1);
		if (player?.setPlaybackRate) player.setPlaybackRate(speed);
		else if (video) video.playbackRate = speed;
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
		const t = video.currentTime;
		for (const s of segments) {
			const [start, end] = s.segment;
			if (t >= start && t < end - .05) {
				video.currentTime = end;
				break;
			}
		}
		video.addEventListener("timeupdate", () => {
			const now = video.currentTime;
			for (const s of segments) {
				const [start, end] = s.segment;
				if (now >= start && now < end - .05) video.currentTime = end;
			}
		});
	}
	var guarded = window;
	if (!guarded.__toolboxYtMain) {
		guarded.__toolboxYtMain = true;
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
				if (p.speed && player?.setPlaybackRate && player.getPlaybackRate) {
					const next = Math.min(4, Math.max(.25, player.getPlaybackRate() + (p.deltaY > 0 ? -.05 : .05)));
					player.setPlaybackRate(next);
				}
			}
			if (cmd === "speedDelta" && payload && typeof payload === "object") {
				const player = getPlayer();
				const delta = Number(payload.delta);
				if (player?.setPlaybackRate && player.getPlaybackRate) player.setPlaybackRate(Math.min(4, Math.max(.25, player.getPlaybackRate() + delta)));
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
