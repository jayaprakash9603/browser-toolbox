(function() {
	//#region src/core/sites/youtube/constants.ts
	var PAGE_CMD_KEY = "__toolboxYtCmd";
	//#endregion
	//#region src/core/sites/youtube/features.ts
	function toggles(section, ids, opts) {
		const impl = opts?.impl ?? "css";
		const defaultVal = opts?.default ?? false;
		return ids.map((id) => ({
			id,
			section,
			kind: "toggle",
			impl,
			default: defaultVal,
			...opts?.bestEffort ? { bestEffort: true } : {},
			...opts?.thirdParty ? { thirdParty: true } : {}
		}));
	}
	var YOUTUBE_FEATURES = [
		{
			id: "blockAds",
			section: "ads",
			kind: "toggle",
			impl: "mirror",
			mirrorKey: "youtubeEnabled",
			default: true
		},
		...toggles("ads", [
			"hideSponsored",
			"hideMerch",
			"hidePremiumUpsell",
			"hideInfoPanels",
			"hideAiSummaries"
		]),
		...toggles("feeds", [
			"hideShortsShelf",
			"hideLive",
			"hideStreamed",
			"hideMixes",
			"hidePlaylists",
			"hideMoviesTv",
			"hideUpcoming",
			"hideMembersOnly",
			"hideAutoDubbed",
			"hideSuggestedSections",
			"hideHomeCategories",
			"disableHomeFeed",
			"hideSubCollaborations",
			"hideSubLatestBar"
		]),
		{
			id: "hideWatchedVideos",
			section: "feeds",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "watchedMinPercent",
			section: "feeds",
			kind: "number",
			impl: "script",
			default: 80,
			min: 10,
			max: 100,
			step: 5
		},
		{
			id: "autoHideUndoBar",
			section: "feeds",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "hideChannels",
			section: "feeds",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "blockedChannels",
			section: "feeds",
			kind: "text",
			impl: "script",
			default: ""
		},
		{
			id: "keywordFilter",
			section: "feeds",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "blockedKeywords",
			section: "feeds",
			kind: "text",
			impl: "script",
			default: ""
		},
		{
			id: "gridMinPerRow",
			section: "feeds",
			kind: "number",
			impl: "css",
			default: 0,
			min: 0,
			max: 8,
			step: 1
		},
		{
			id: "searchThumbSize",
			section: "feeds",
			kind: "select",
			impl: "css",
			default: "default",
			options: [
				{
					value: "default",
					labelKey: "sites.youtube.options.thumbDefault"
				},
				{
					value: "large",
					labelKey: "sites.youtube.options.thumbLarge"
				},
				{
					value: "small",
					labelKey: "sites.youtube.options.thumbSmall"
				}
			]
		},
		...toggles("watch", [
			"hideRelated",
			"hideNextButton",
			"hideWatermark",
			"hideShareActions",
			"hideMetadata",
			"hideComments",
			"hideChat",
			"hideEndCards",
			"hideEndscreen"
		]),
		{
			id: "disableAutoplay",
			section: "watch",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "disableAmbient",
			section: "watch",
			kind: "toggle",
			impl: "script",
			default: false
		},
		...toggles("watch", [
			"alwaysTheater",
			"theaterFullSize",
			"theaterNoEnlarge"
		], { bestEffort: true }),
		{
			id: "alwaysOriginalAudio",
			section: "watch",
			kind: "toggle",
			impl: "script",
			default: false,
			bestEffort: true
		},
		{
			id: "pauseChannelTrailers",
			section: "watch",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "videoSnapshot",
			section: "watch",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "downloadTranscript",
			section: "watch",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "dismissStillWatching",
			section: "watch",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "defaultSpeed",
			section: "player",
			kind: "select",
			impl: "script",
			default: "1",
			options: [
				{
					value: "0.25",
					labelKey: "sites.youtube.options.speed025"
				},
				{
					value: "0.5",
					labelKey: "sites.youtube.options.speed05"
				},
				{
					value: "0.75",
					labelKey: "sites.youtube.options.speed075"
				},
				{
					value: "1",
					labelKey: "sites.youtube.options.speed1"
				},
				{
					value: "1.25",
					labelKey: "sites.youtube.options.speed125"
				},
				{
					value: "1.5",
					labelKey: "sites.youtube.options.speed15"
				},
				{
					value: "1.75",
					labelKey: "sites.youtube.options.speed175"
				},
				{
					value: "2",
					labelKey: "sites.youtube.options.speed2"
				}
			]
		},
		{
			id: "speedHotkeys",
			section: "player",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "wheelVolume",
			section: "player",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "wheelSpeed",
			section: "player",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "defaultQuality",
			section: "player",
			kind: "select",
			impl: "script",
			default: "auto",
			options: [
				{
					value: "auto",
					labelKey: "sites.youtube.options.qualityAuto"
				},
				{
					value: "144",
					labelKey: "sites.youtube.options.quality144"
				},
				{
					value: "360",
					labelKey: "sites.youtube.options.quality360"
				},
				{
					value: "480",
					labelKey: "sites.youtube.options.quality480"
				},
				{
					value: "720",
					labelKey: "sites.youtube.options.quality720"
				},
				{
					value: "1080",
					labelKey: "sites.youtube.options.quality1080"
				}
			],
			bestEffort: true
		},
		{
			id: "loopButton",
			section: "player",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "rememberVolume",
			section: "player",
			kind: "toggle",
			impl: "script",
			default: false
		},
		...toggles("player", [
			"hideFsMoreVideos",
			"hideFsTitle",
			"hideFsLike",
			"compactPlayButton",
			"removeControlBg",
			"restoreMiniplayer",
			"restoreCornerFullscreen"
		], { bestEffort: true }),
		...toggles("shorts", [
			"hideShorts",
			"hideShortsActions",
			"hideShortsRemix",
			"hideShortsRelatedLink"
		]),
		{
			id: "redirectShorts",
			section: "shorts",
			kind: "toggle",
			impl: "script",
			default: false
		},
		{
			id: "shortsStopLoop",
			section: "shorts",
			kind: "toggle",
			impl: "script",
			default: false
		},
		...toggles("shorts", ["shortsAlwaysProgress", "shortsMetadataHover"]),
		{
			id: "shortsMinPerRow",
			section: "shorts",
			kind: "number",
			impl: "css",
			default: 0,
			min: 0,
			max: 6,
			step: 1
		},
		...toggles("appearance", [
			"fullTitles",
			"squareCorners",
			"hideChannelBanners",
			"hideVoiceSearch",
			"logoToSubscriptions",
			"tidyGuide",
			"noPinkGradient",
			"noThemedHover",
			"smallRelatedThumbs"
		]),
		{
			id: "progressTheme",
			section: "progress",
			kind: "select",
			impl: "style",
			default: "default",
			options: [
				{
					value: "default",
					labelKey: "sites.youtube.options.progressDefault"
				},
				{
					value: "custom",
					labelKey: "sites.youtube.options.progressCustom"
				},
				...[
					"ocean",
					"neon",
					"fire",
					"gold",
					"forest",
					"violet",
					"rose",
					"slate",
					"rainbow",
					"candy",
					"pride",
					"midnight",
					"mint",
					"sunset",
					"ice",
					"lava",
					"matrix",
					"cyber",
					"mono"
				].map((id) => ({
					value: id,
					labelKey: `sites.youtube.progress.${id}`
				}))
			]
		},
		{
			id: "progressBarColor",
			section: "progress",
			kind: "color",
			impl: "style",
			default: "#ff0000"
		},
		{
			id: "progressPlayedColor",
			section: "progress",
			kind: "color",
			impl: "style",
			default: "#cc0000"
		},
		{
			id: "progressHeight",
			section: "progress",
			kind: "number",
			impl: "style",
			default: 3,
			min: 2,
			max: 12,
			step: 1
		},
		{
			id: "progressScrubberEmoji",
			section: "progress",
			kind: "text",
			impl: "style",
			default: ""
		},
		{
			id: "progressScrubberImage",
			section: "progress",
			kind: "text",
			impl: "style",
			default: ""
		},
		...toggles("embedded", ["hideEmbedShare", "hideEmbedPauseOverlay"]),
		{
			id: "sponsorBlock",
			section: "community",
			kind: "toggle",
			impl: "script",
			default: false,
			thirdParty: true
		},
		{
			id: "sponsorSkipNotice",
			section: "community",
			kind: "toggle",
			impl: "script",
			default: false,
			thirdParty: true
		},
		{
			id: "sponsorCategories",
			section: "community",
			kind: "multiselect",
			impl: "script",
			default: [
				"sponsor",
				"selfpromo",
				"interaction",
				"intro",
				"outro",
				"filler",
				"music_offtopic"
			],
			thirdParty: true
		},
		{
			id: "returnDislikes",
			section: "community",
			kind: "toggle",
			impl: "script",
			default: false,
			thirdParty: true
		}
	];
	new Map(YOUTUBE_FEATURES.map((f) => [f.id, f]));
	var CSS_FEATURE_IDS = YOUTUBE_FEATURES.filter((f) => f.impl === "css").map((f) => f.id);
	YOUTUBE_FEATURES.filter((f) => f.impl === "script").map((f) => f.id);
	//#endregion
	//#region src/core/i18n/chromeMessages.ts
	var CHROME_UI_FALLBACKS = {
		extName: "Browser Toolbox",
		extDescription: "All-in-one productivity toolbox: clipboard, text, developer, QA and web utilities in one side panel.",
		actionTitle: "Open Browser Toolbox",
		contextMenuOpen: "Open Browser Toolbox",
		contextMenuPauseAdblock: "Pause ad blocking on this site"
	};
	function getChromeMessage(messageName) {
		try {
			if (typeof chrome !== "undefined" && chrome.i18n?.getMessage) {
				const value = chrome.i18n.getMessage(messageName);
				if (value) return value;
			}
		} catch {}
		return CHROME_UI_FALLBACKS[messageName] ?? "";
	}
	function getExtensionName() {
		return getChromeMessage("extName") || CHROME_UI_FALLBACKS.extName;
	}
	getExtensionName();
	//#endregion
	//#region src/core/sites/youtube/progressThemes.ts
	var DEFAULT_BAR = "#ff0000";
	var DEFAULT_PLAYED = "#cc0000";
	var DEFAULT_HEIGHT = 3;
	/** Built-in progress bar themes (Custom Progress Bar–style). */
	var PROGRESS_THEMES = [
		{
			id: "default",
			labelKey: "sites.youtube.progress.default",
			bar: "#ff0000",
			played: "#cc0000"
		},
		{
			id: "ocean",
			labelKey: "sites.youtube.progress.ocean",
			bar: "#0ea5e9",
			played: "#0284c7"
		},
		{
			id: "neon",
			labelKey: "sites.youtube.progress.neon",
			bar: "#22d3ee",
			played: "#06b6d4",
			animated: true,
			effect: "glow"
		},
		{
			id: "fire",
			labelKey: "sites.youtube.progress.fire",
			bar: "#f97316",
			played: "#ea580c",
			animated: true,
			effect: "shimmer"
		},
		{
			id: "gold",
			labelKey: "sites.youtube.progress.gold",
			bar: "#eab308",
			played: "#ca8a04"
		},
		{
			id: "forest",
			labelKey: "sites.youtube.progress.forest",
			bar: "#22c55e",
			played: "#16a34a"
		},
		{
			id: "violet",
			labelKey: "sites.youtube.progress.violet",
			bar: "#a855f7",
			played: "#9333ea"
		},
		{
			id: "rose",
			labelKey: "sites.youtube.progress.rose",
			bar: "#f43f5e",
			played: "#e11d48"
		},
		{
			id: "slate",
			labelKey: "sites.youtube.progress.slate",
			bar: "#64748b",
			played: "#475569"
		},
		{
			id: "rainbow",
			labelKey: "sites.youtube.progress.rainbow",
			bar: "linear-gradient(90deg,red,orange,yellow,green,blue,violet)",
			played: "linear-gradient(90deg,#f43f5e,#eab308,#22c55e,#3b82f6,#a855f7)",
			animated: true,
			effect: "flow"
		},
		{
			id: "candy",
			labelKey: "sites.youtube.progress.candy",
			bar: "repeating-linear-gradient(45deg,#f472b6,#f472b6 8px,#fbcfe8 8px,#fbcfe8 16px)",
			played: "#db2777",
			animated: true,
			effect: "flow"
		},
		{
			id: "pride",
			labelKey: "sites.youtube.progress.pride",
			bar: "linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#24408e,#732982)",
			played: "#555"
		},
		{
			id: "midnight",
			labelKey: "sites.youtube.progress.midnight",
			bar: "#312e81",
			played: "#1e1b4b"
		},
		{
			id: "mint",
			labelKey: "sites.youtube.progress.mint",
			bar: "#6ee7b7",
			played: "#34d399"
		},
		{
			id: "sunset",
			labelKey: "sites.youtube.progress.sunset",
			bar: "linear-gradient(90deg,#f43f5e,#f97316,#fbbf24)",
			played: "#c2410c"
		},
		{
			id: "ice",
			labelKey: "sites.youtube.progress.ice",
			bar: "#bae6fd",
			played: "#7dd3fc"
		},
		{
			id: "lava",
			labelKey: "sites.youtube.progress.lava",
			bar: "#450a0a",
			played: "#dc2626",
			animated: true,
			effect: "glow"
		},
		{
			id: "matrix",
			labelKey: "sites.youtube.progress.matrix",
			bar: "#22c55e",
			played: "#14532d",
			animated: true,
			effect: "matrix"
		},
		{
			id: "cyber",
			labelKey: "sites.youtube.progress.cyber",
			bar: "#f0abfc",
			played: "#c026d3",
			animated: true,
			effect: "glow"
		},
		{
			id: "mono",
			labelKey: "sites.youtube.progress.mono",
			bar: "#fafafa",
			played: "#a3a3a3"
		}
	];
	function getProgressTheme(themeId) {
		return PROGRESS_THEMES.find((t) => t.id === themeId);
	}
	function isProgressCustomizationActive(values) {
		const theme = String(values.progressTheme ?? "default");
		const barColor = String(values.progressBarColor ?? DEFAULT_BAR);
		const playedColor = String(values.progressPlayedColor ?? DEFAULT_PLAYED);
		const height = Number(values.progressHeight ?? DEFAULT_HEIGHT);
		const emoji = String(values.progressScrubberEmoji ?? "").trim();
		const image = String(values.progressScrubberImage ?? "").trim();
		return theme !== "default" || barColor !== DEFAULT_BAR || playedColor !== DEFAULT_PLAYED || height !== DEFAULT_HEIGHT || emoji.length > 0 || image.length > 0;
	}
	function isAllowedScrubberImageUrl(url) {
		const t = url.trim();
		if (!t) return false;
		return /^https:\/\//i.test(t) || /^data:image\//i.test(t);
	}
	function themeCssVars(themeId, customBar, customPlayed, height) {
		const theme = getProgressTheme(themeId);
		let bar = theme?.bar ?? DEFAULT_BAR;
		let played = theme?.played ?? DEFAULT_PLAYED;
		if (themeId === "custom" || themeId === "default" || !theme) {
			if (customBar) bar = customBar;
			if (customPlayed) played = customPlayed;
		}
		return {
			"--tbx-yt-progress-bar": bar,
			"--tbx-yt-progress-played": played,
			"--tbx-yt-progress-height": `${height ?? DEFAULT_HEIGHT}px`
		};
	}
	//#endregion
	//#region src/core/sites/youtube/service.ts
	function defaultYoutubeValues() {
		const values = {};
		for (const f of YOUTUBE_FEATURES) values[f.id] = f.default;
		if (!PROGRESS_THEMES.map((t) => t.id).includes(String(values.progressTheme))) values.progressTheme = "default";
		return values;
	}
	defaultYoutubeValues();
	//#endregion
	//#region src/core/sites/youtube/helpers.ts
	/** `/shorts/ID` → `/watch?v=ID` */
	function shortsToWatchUrl(url) {
		try {
			const parsed = new URL(url, "https://www.youtube.com");
			const m = /^\/shorts\/([\w-]{11})/.exec(parsed.pathname);
			if (!m) return null;
			return `https://www.youtube.com/watch?v=${m[1]}`;
		} catch {
			return null;
		}
	}
	function parseKeywordList(text) {
		return text.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
	}
	function parseChannelList(text) {
		return text.split(/[\n,;]+/).map((s) => s.trim().toLowerCase().replace(/^@/, "")).filter(Boolean);
	}
	function matchesKeyword(title, keywords) {
		if (!keywords.length) return false;
		const hay = title.toLowerCase();
		return keywords.some((k) => hay.includes(k));
	}
	function matchesChannel(channelName, channelId, blocked) {
		if (!blocked.length) return false;
		const name = channelName.toLowerCase();
		const id = channelId.toLowerCase();
		return blocked.some((b) => name.includes(b) || id === b || name === b);
	}
	function watchedPercentFromAria(aria) {
		if (!aria) return null;
		const m = /(\d+)\s*%/.exec(aria);
		return m ? Number(m[1]) : null;
	}
	function isStillWatchingDialog(text) {
		return /still watching|video paused|continue watching/i.test(text);
	}
	function featureAttrName(id) {
		return `data-tbx-yt-${id.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;
	}
	function isFeatureOn(values, id) {
		const v = values[id];
		return v === true || v === "true";
	}
	//#endregion
	//#region src/chrome/content/sites/youtube/bridge.ts
	function postToMain(command, payload) {
		window.postMessage({
			[PAGE_CMD_KEY]: command,
			payload
		}, location.origin || "*");
	}
	//#endregion
	//#region src/chrome/content/sites/youtube/features/index.ts
	var runners = /* @__PURE__ */ new Map();
	function reg(id, runner) {
		runners.set(id, runner);
	}
	var TILE_SELECTOR = "ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer";
	var feedObserver = null;
	var undoTimer = null;
	var stillWatchingObserver = null;
	var wheelBound = false;
	var keyBound = false;
	var navHandler = null;
	function values(ctx) {
		return ctx.state.values;
	}
	function feedFiltersActive(ctx) {
		const v = values(ctx);
		return isFeatureOn(v, "keywordFilter") || isFeatureOn(v, "hideChannels") || isFeatureOn(v, "hideWatchedVideos") || isFeatureOn(v, "autoHideUndoBar");
	}
	function shouldHideTile(tile, ctx) {
		const title = tile.querySelector("#video-title, .title")?.textContent ?? "";
		const channel = tile.querySelector("#channel-name, ytd-channel-name")?.textContent?.trim() ?? "";
		const channelId = tile.querySelector("a[href*=\"/channel/\"], a[href*=\"/@\"]")?.getAttribute("href") ?? "";
		if (isFeatureOn(values(ctx), "keywordFilter")) {
			const keys = parseKeywordList(String(values(ctx).blockedKeywords ?? ""));
			if (keys.length && matchesKeyword(title, keys)) return true;
		}
		if (isFeatureOn(values(ctx), "hideChannels")) {
			const blocked = parseChannelList(String(values(ctx).blockedChannels ?? ""));
			if (blocked.length && matchesChannel(channel, channelId, blocked)) return true;
		}
		if (isFeatureOn(values(ctx), "hideWatchedVideos")) {
			const min = Number(values(ctx).watchedMinPercent ?? 80);
			const progress = tile.querySelector("ytd-thumbnail-overlay-resume-playback-renderer");
			if (!progress) return false;
			const pct = watchedPercentFromAria(progress.getAttribute("aria-label") ?? null);
			if (pct != null && pct >= min) return true;
		}
		return false;
	}
	function scanFeeds(ctx) {
		if (!feedFiltersActive(ctx)) return;
		for (const tile of document.querySelectorAll(TILE_SELECTOR)) {
			const el = tile;
			if (shouldHideTile(tile, ctx)) el.style.display = "none";
			else el.style.removeProperty("display");
		}
	}
	reg("feedFilters", {
		start(ctx) {
			if (!feedFiltersActive(ctx)) return;
			scanFeeds(ctx);
			feedObserver = new MutationObserver(() => scanFeeds(ctx));
			feedObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
			if (isFeatureOn(values(ctx), "autoHideUndoBar")) undoTimer = setInterval(() => {
				document.querySelectorAll("yt-button-renderer #button[aria-label*=\"Undo\"]").forEach((el) => {
					const row = el.closest("ytd-notification-action-renderer, tp-yt-paper-toast");
					if (row) row.style.display = "none";
				});
			}, 5e3);
		},
		stop() {
			feedObserver?.disconnect();
			feedObserver = null;
			if (undoTimer) clearInterval(undoTimer);
			undoTimer = null;
			document.querySelectorAll(TILE_SELECTOR).forEach((el) => el.style.removeProperty("display"));
		}
	});
	reg("redirectShorts", {
		start(ctx) {
			if (!isFeatureOn(values(ctx), "redirectShorts")) return;
			const fix = () => {
				const next = shortsToWatchUrl(location.href);
				if (next) location.replace(next);
			};
			fix();
			navHandler = fix;
			document.addEventListener("yt-navigate-finish", fix);
		},
		stop() {
			if (navHandler) document.removeEventListener("yt-navigate-finish", navHandler);
			navHandler = null;
		}
	});
	reg("player", {
		start(ctx) {
			const v = values(ctx);
			if (!(v.defaultSpeed !== "1" || v.defaultQuality !== "auto" || isFeatureOn(v, "disableAutoplay") || isFeatureOn(v, "disableAmbient") || isFeatureOn(v, "alwaysOriginalAudio") || isFeatureOn(v, "rememberVolume") || isFeatureOn(v, "loopButton") || isFeatureOn(v, "alwaysTheater") || isFeatureOn(v, "wheelVolume") || isFeatureOn(v, "wheelSpeed") || isFeatureOn(v, "speedHotkeys") || isFeatureOn(v, "shortsStopLoop"))) return;
			postToMain("applyPlayer", {
				defaultSpeed: v.defaultSpeed,
				defaultQuality: v.defaultQuality,
				disableAutoplay: v.disableAutoplay,
				disableAmbient: v.disableAmbient,
				alwaysOriginalAudio: v.alwaysOriginalAudio,
				rememberVolume: v.rememberVolume,
				loopButton: v.loopButton,
				alwaysTheater: v.alwaysTheater
			});
			if (isFeatureOn(v, "wheelVolume") || isFeatureOn(v, "wheelSpeed")) {
				if (!wheelBound) {
					wheelBound = true;
					document.addEventListener("wheel", (e) => {
						if (!document.querySelector("#movie_player")?.contains(e.target)) return;
						e.preventDefault();
						postToMain("wheel", {
							deltaY: e.deltaY,
							volume: isFeatureOn(v, "wheelVolume"),
							speed: isFeatureOn(v, "wheelSpeed")
						});
					}, { passive: false });
				}
			}
			if (isFeatureOn(v, "speedHotkeys") && !keyBound) {
				keyBound = true;
				document.addEventListener("keydown", (e) => {
					if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
					if (e.key === "<" || e.key === ",") postToMain("speedDelta", { delta: -.25 });
					if (e.key === ">" || e.key === ".") postToMain("speedDelta", { delta: .25 });
				});
			}
			if (isFeatureOn(v, "shortsStopLoop")) document.querySelectorAll("video").forEach((video) => {
				video.loop = false;
			});
		},
		stop() {
			postToMain("applyPlayer", null);
		}
	});
	reg("stillWatching", {
		start(ctx) {
			if (!isFeatureOn(values(ctx), "dismissStillWatching")) return;
			stillWatchingObserver = new MutationObserver(() => {
				for (const el of document.querySelectorAll("yt-confirm-dialog-renderer, tp-yt-paper-dialog")) if (isStillWatchingDialog(el.textContent ?? "")) el.querySelector("#button, [aria-label*=\"Yes\"], [aria-label*=\"Continue\"]")?.click();
			});
			stillWatchingObserver.observe(document.body, {
				childList: true,
				subtree: true
			});
		},
		stop() {
			stillWatchingObserver?.disconnect();
			stillWatchingObserver = null;
		}
	});
	reg("sponsor", {
		start(ctx) {
			if (!isFeatureOn(values(ctx), "sponsorBlock")) return;
			const videoId = new URLSearchParams(location.search).get("v");
			if (!videoId) return;
			chrome.runtime.sendMessage({
				type: "YT_SPONSOR_SEGMENTS",
				videoId,
				categories: Array.isArray(values(ctx).sponsorCategories) ? values(ctx).sponsorCategories : []
			}).then((res) => {
				const segments = res && "ok" in res && res.ok ? res.data?.segments : void 0;
				if (segments) postToMain("sponsorSegments", segments);
			}).catch(() => {});
		},
		stop() {}
	});
	reg("dislikes", {
		start(ctx) {
			if (!isFeatureOn(values(ctx), "returnDislikes")) return;
			const videoId = new URLSearchParams(location.search).get("v");
			if (!videoId) return;
			chrome.runtime.sendMessage({
				type: "YT_DISLIKES",
				videoId
			}).catch(() => {});
		},
		stop() {}
	});
	function startScriptFeatures(ctx) {
		stopScriptFeatures();
		if (!ctx.state.enabled) return;
		for (const runner of runners.values()) runner.start(ctx);
	}
	function stopScriptFeatures() {
		for (const runner of runners.values()) runner.stop();
	}
	function onYoutubeNavigate(ctx) {
		if (!ctx.state.enabled) return;
		stopScriptFeatures();
		startScriptFeatures(ctx);
	}
	//#endregion
	//#region src/chrome/content/sites/youtube/manager.ts
	var STYLE_LINK_ID = "toolbox-yt-css";
	var ACTIVE_ATTR = "data-tbx-yt-active";
	var PROGRESS_THEME_ATTR = "data-tbx-yt-progress-theme";
	var PROGRESS_ANIM_ATTR = "data-tbx-yt-progress-animated";
	var PROGRESS_EFFECT_ATTR = "data-tbx-yt-progress-effect";
	function applyCssFeatures(state) {
		const root = document.documentElement;
		root.setAttribute(ACTIVE_ATTR, "true");
		for (const id of CSS_FEATURE_IDS) {
			if (id === "gridMinPerRow" || id === "shortsMinPerRow" || id === "searchThumbSize") continue;
			if (state.values[id] === true) root.setAttribute(featureAttrName(id), "true");
			else root.removeAttribute(featureAttrName(id));
		}
		const grid = Number(state.values.gridMinPerRow ?? 0);
		if (grid > 0) root.setAttribute(featureAttrName("gridMinPerRow"), String(grid));
		else root.removeAttribute(featureAttrName("gridMinPerRow"));
		const shortsRow = Number(state.values.shortsMinPerRow ?? 0);
		if (shortsRow > 0) root.setAttribute(featureAttrName("shortsMinPerRow"), String(shortsRow));
		else root.removeAttribute(featureAttrName("shortsMinPerRow"));
		const thumb = String(state.values.searchThumbSize ?? "default");
		if (thumb !== "default") root.setAttribute(featureAttrName("searchThumbSize"), thumb);
		else root.removeAttribute(featureAttrName("searchThumbSize"));
	}
	function clearProgressDom(root) {
		root.removeAttribute(featureAttrName("progressOn"));
		root.removeAttribute(PROGRESS_THEME_ATTR);
		root.removeAttribute(PROGRESS_ANIM_ATTR);
		root.removeAttribute(PROGRESS_EFFECT_ATTR);
		root.removeAttribute(featureAttrName("scrubberEmoji"));
		root.removeAttribute(featureAttrName("scrubberImage"));
		for (const key of [
			"--tbx-yt-progress-bar",
			"--tbx-yt-progress-played",
			"--tbx-yt-progress-height",
			"--tbx-yt-scrubber-emoji",
			"--tbx-yt-scrubber-image",
			"--tbx-yt-scrubber-size"
		]) root.style.removeProperty(key);
	}
	function applyProgressStyle(state) {
		const root = document.documentElement;
		if (!isProgressCustomizationActive(state.values)) {
			clearProgressDom(root);
			return;
		}
		const themeId = String(state.values.progressTheme ?? "default");
		const barColor = String(state.values.progressBarColor ?? "#ff0000");
		const playedColor = String(state.values.progressPlayedColor ?? "#cc0000");
		const height = Number(state.values.progressHeight ?? 3);
		const theme = getProgressTheme(themeId);
		const vars = themeCssVars(themeId, barColor, playedColor, height);
		for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
		root.setAttribute(featureAttrName("progressOn"), "true");
		root.setAttribute(PROGRESS_THEME_ATTR, themeId);
		if (theme?.animated) {
			root.setAttribute(PROGRESS_ANIM_ATTR, "true");
			if (theme.effect) root.setAttribute(PROGRESS_EFFECT_ATTR, theme.effect);
			else root.removeAttribute(PROGRESS_EFFECT_ATTR);
		} else {
			root.removeAttribute(PROGRESS_ANIM_ATTR);
			root.removeAttribute(PROGRESS_EFFECT_ATTR);
		}
		const emoji = String(state.values.progressScrubberEmoji ?? "").trim();
		const imageRaw = String(state.values.progressScrubberImage ?? "").trim();
		if (emoji) {
			root.setAttribute(featureAttrName("scrubberEmoji"), "true");
			root.style.setProperty("--tbx-yt-scrubber-emoji", `"${emoji.replace(/"/g, "")}"`);
			root.style.setProperty("--tbx-yt-scrubber-size", "22px");
			root.removeAttribute(featureAttrName("scrubberImage"));
			root.style.removeProperty("--tbx-yt-scrubber-image");
		} else if (imageRaw && isAllowedScrubberImageUrl(imageRaw)) {
			root.setAttribute(featureAttrName("scrubberImage"), "true");
			const safe = imageRaw.replace(/"/g, "\\\"");
			root.style.setProperty("--tbx-yt-scrubber-image", `url("${safe}")`);
			root.style.setProperty("--tbx-yt-scrubber-size", "28px");
			root.removeAttribute(featureAttrName("scrubberEmoji"));
			root.style.removeProperty("--tbx-yt-scrubber-emoji");
		} else {
			root.removeAttribute(featureAttrName("scrubberEmoji"));
			root.removeAttribute(featureAttrName("scrubberImage"));
			root.style.removeProperty("--tbx-yt-scrubber-emoji");
			root.style.removeProperty("--tbx-yt-scrubber-image");
			root.style.setProperty("--tbx-yt-scrubber-size", "14px");
		}
	}
	function ensureCssLink() {
		if (document.getElementById(STYLE_LINK_ID)) return;
		const link = document.createElement("link");
		link.id = STYLE_LINK_ID;
		link.rel = "stylesheet";
		link.href = chrome.runtime.getURL("sites/youtube/youtube.css");
		document.head.appendChild(link);
	}
	function applyYoutubeEnhancer(state) {
		if (!state.enabled) {
			stopAll();
			return;
		}
		ensureCssLink();
		applyCssFeatures(state);
		applyProgressStyle(state);
		startScriptFeatures({
			state,
			onNavigate: () => onYoutubeNavigate({
				state,
				onNavigate: () => {}
			})
		});
	}
	function stopAll() {
		stopScriptFeatures();
		const root = document.documentElement;
		root.removeAttribute(ACTIVE_ATTR);
		for (const id of CSS_FEATURE_IDS) root.removeAttribute(featureAttrName(id));
		clearProgressDom(root);
		root.removeAttribute(featureAttrName("searchThumbSize"));
		root.removeAttribute(featureAttrName("gridMinPerRow"));
		root.removeAttribute(featureAttrName("shortsMinPerRow"));
		document.getElementById(STYLE_LINK_ID)?.remove();
		document.querySelectorAll("ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer").forEach((el) => el.style.removeProperty("display"));
	}
	//#endregion
	//#region src/chrome/content/sites/youtube/isolated.ts
	function readState(raw) {
		if (!raw || typeof raw !== "object") return null;
		const o = raw;
		if (!o.values) return null;
		return o;
	}
	function apply(raw) {
		const state = readState(raw);
		if (!state?.enabled) {
			stopAll();
			return;
		}
		applyYoutubeEnhancer(state);
	}
	var guarded = window;
	if (!guarded.__toolboxYtEnhancer) {
		guarded.__toolboxYtEnhancer = true;
		chrome.storage.local.get("youtubeEnhancer", (result) => apply(result.youtubeEnhancer));
		chrome.storage.onChanged.addListener((changes, area) => {
			if (area === "local" && changes.youtubeEnhancer) apply(changes.youtubeEnhancer.newValue);
		});
		document.addEventListener("yt-navigate-finish", () => {
			chrome.storage.local.get("youtubeEnhancer", (result) => {
				const state = readState(result.youtubeEnhancer);
				if (state?.enabled) onYoutubeNavigate({
					state,
					onNavigate: () => {}
				});
			});
		});
	}
	//#endregion
})();
