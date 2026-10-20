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
					"mono",
					"pacman",
					"minecraft",
					"sonic",
					"among",
					"adventure",
					"pusheen",
					"lightsaber",
					"sith"
				].map((id) => ({
					value: id,
					labelKey: `sites.youtube.progress.${id === "pusheen" ? "pusheenPink" : id}`
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
	//#region src/core/sites/youtube/scrubberAssets.ts
	function svgDataUri(svg) {
		return `data:image/svg+xml,${encodeURIComponent(svg.trim())}`;
	}
	var S = 32;
	function pixelSvg(body) {
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" shape-rendering="crispEdges">${body}</svg>`;
	}
	svgDataUri(pixelSvg(`
      <rect x="4" y="14" width="24" height="12" fill="#f4a460"/>
      <circle cx="10" cy="18" r="2" fill="#c41e3a"/>
      <circle cx="16" cy="20" r="2" fill="#c41e3a"/>
      <circle cx="22" cy="17" r="2" fill="#c41e3a"/>
      <path d="M4 14 L16 6 L28 14 Z" fill="#ffd966"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="2" y="14" width="28" height="6" fill="#ffb6c1"/>
      <rect x="6" y="10" width="14" height="10" fill="#9cf"/>
      <rect x="8" y="12" width="4" height="3" fill="#333"/>
      <rect x="14" y="12" width="4" height="3" fill="#333"/>
      <rect x="20" y="11" width="6" height="4" fill="#ffb6c1"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="12" ry="10" fill="#f5f5f5"/>
      <ellipse cx="10" cy="22" rx="6" ry="4" fill="#fff"/>
      <ellipse cx="22" cy="22" rx="6" ry="4" fill="#fff"/>
      <circle cx="12" cy="16" r="2" fill="#222"/>
      <circle cx="20" cy="16" r="2" fill="#222"/>
      <rect x="13" y="8" width="6" height="4" fill="#f5f5f5"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="11" ry="9" fill="#e8c170"/>
      <ellipse cx="8" cy="14" rx="4" ry="5" fill="#e8c170"/>
      <ellipse cx="24" cy="14" rx="4" ry="5" fill="#e8c170"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
      <ellipse cx="16" cy="21" rx="3" ry="2" fill="#fff"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="8" y="12" width="16" height="14" fill="#d4a574"/>
      <rect x="10" y="14" width="4" height="3" fill="#222"/>
      <rect x="18" y="14" width="4" height="3" fill="#222"/>
      <rect x="4" y="4" width="4" height="8" fill="#f97316"/>
      <rect x="24" y="6" width="4" height="6" fill="#ef4444"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="6" y="10" width="20" height="14" fill="#fcd34d"/>
      <rect x="8" y="14" width="7" height="4" fill="#111"/>
      <rect x="17" y="14" width="7" height="4" fill="#111"/>
      <rect x="15" y="14" width="2" height="4" fill="#111"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="16" rx="10" ry="9" fill="#fff"/>
      <circle cx="12" cy="15" r="2" fill="#222"/>
      <circle cx="20" cy="15" r="2" fill="#222"/>
      <rect x="4" y="22" width="6" height="4" fill="#fff"/>
      <rect x="22" y="22" width="6" height="4" fill="#fff"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="10" y="8" width="12" height="6" fill="#dc2626"/>
      <rect x="8" y="14" width="16" height="10" fill="#d4a574"/>
      <rect x="10" y="16" width="4" height="3" fill="#222"/>
      <rect x="18" y="16" width="4" height="3" fill="#222"/>
      <rect x="14" y="20" width="4" height="2" fill="#7f1d1d"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="14" rx="10" ry="8" fill="#ef4444"/>
      <ellipse cx="16" cy="22" rx="6" ry="6" fill="#fde68a"/>
      <circle cx="12" cy="12" r="2" fill="#fff"/>
      <circle cx="20" cy="14" r="2" fill="#fff"/>
    `)), svgDataUri(pixelSvg(`
      <polygon points="16,4 19,12 28,12 21,17 24,26 16,21 8,26 11,17 4,12 13,12" fill="#facc15"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="14" y="4" width="4" height="14" fill="#22d3ee"/>
      <rect x="12" y="16" width="8" height="4" fill="#22d3ee"/>
      <rect x="10" y="20" width="12" height="2" fill="#78716c"/>
      <rect x="14" y="22" width="4" height="6" fill="#57534e"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="8" y="8" width="16" height="20" fill="#4ade80"/>
      <rect x="10" y="12" width="4" height="4" fill="#14532d"/>
      <rect x="18" y="12" width="4" height="4" fill="#14532d"/>
      <rect x="12" y="20" width="8" height="4" fill="#14532d"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="14" cy="18" rx="10" ry="8" fill="#2563eb"/>
      <ellipse cx="22" cy="14" rx="6" ry="5" fill="#2563eb"/>
      <circle cx="20" cy="13" r="2" fill="#fff"/>
      <circle cx="20" cy="13" r="1" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <path d="M16 4 A12 12 0 1 1 16 28 L16 16 Z" fill="#facc15"/>
      <circle cx="22" cy="12" r="2" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="20" rx="9" ry="10" fill="#ef4444"/>
      <rect x="10" y="8" width="12" height="10" rx="4" fill="#ef4444"/>
      <ellipse cx="20" cy="12" rx="5" ry="4" fill="#7dd3fc"/>
      <rect x="12" y="14" width="8" height="4" fill="#1f2937"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="11" ry="10" fill="#f472b6"/>
      <ellipse cx="8" cy="14" rx="4" ry="5" fill="#f472b6"/>
      <ellipse cx="24" cy="14" rx="4" ry="5" fill="#f472b6"/>
      <ellipse cx="12" cy="17" rx="2" ry="3" fill="#222"/>
      <ellipse cx="20" cy="17" rx="2" ry="3" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#facc15"/>
      <polygon points="8,10 10,18 4,16" fill="#facc15"/>
      <polygon points="24,10 22,18 28,16" fill="#facc15"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
      <circle cx="16" cy="21" r="2" fill="#ef4444"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="8" y="10" width="16" height="16" rx="2" fill="#4ade80"/>
      <rect x="10" y="14" width="5" height="5" fill="#14532d"/>
      <rect x="17" y="14" width="5" height="5" fill="#14532d"/>
      <rect x="12" y="22" width="8" height="2" fill="#166534"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="12" ry="8" fill="#fbbf24"/>
      <ellipse cx="8" cy="16" rx="4" ry="5" fill="#fbbf24"/>
      <circle cx="12" cy="16" r="2" fill="#222"/>
      <circle cx="20" cy="16" r="2" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="11" ry="9" fill="#9ca3af"/>
      <rect x="8" y="10" width="4" height="4" fill="#9ca3af"/>
      <rect x="20" y="10" width="4" height="4" fill="#9ca3af"/>
      <circle cx="12" cy="17" r="1.5" fill="#222"/>
      <circle cx="20" cy="17" r="1.5" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#fff"/>
      <ellipse cx="8" cy="12" rx="4" ry="5" fill="#fff"/>
      <ellipse cx="24" cy="12" rx="4" ry="5" fill="#fff"/>
      <ellipse cx="8" cy="12" rx="2" ry="3" fill="#f472b6"/>
      <ellipse cx="24" cy="12" rx="2" ry="3" fill="#f472b6"/>
      <circle cx="13" cy="17" r="1.5" fill="#222"/>
      <circle cx="19" cy="17" r="1.5" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="10" y="8" width="12" height="18" rx="2" fill="#facc15"/>
      <circle cx="14" cy="14" r="2" fill="#fff"/>
      <circle cx="20" cy="14" r="3" fill="#fff"/>
      <circle cx="20" cy="14" r="1.5" fill="#222"/>
      <rect x="12" y="20" width="8" height="2" fill="#7f1d1d"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="15" y="4" width="2" height="18" fill="#e5e7eb"/>
      <rect x="12" y="20" width="8" height="3" fill="#1f2937"/>
      <rect x="14" y="22" width="4" height="6" fill="#57534e"/>
      <rect x="15" y="6" width="2" height="12" fill="#22d3ee"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="11" ry="8" fill="#d97706"/>
      <ellipse cx="8" cy="14" rx="5" ry="6" fill="#d97706"/>
      <ellipse cx="24" cy="14" rx="5" ry="6" fill="#d97706"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#f59e0b"/>
      <polygon points="8,12 10,20 4,18" fill="#f59e0b"/>
      <polygon points="24,12 22,20 28,18" fill="#f59e0b"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="8" fill="#f9a8d4"/>
      <rect x="6" y="12" width="4" height="8" fill="#f472b6"/>
      <rect x="22" y="12" width="4" height="8" fill="#f472b6"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="9" ry="7" fill="#facc15"/>
      <rect x="10" y="14" width="12" height="3" fill="#1f2937"/>
      <rect x="10" y="18" width="12" height="3" fill="#1f2937"/>
      <ellipse cx="22" cy="12" rx="4" ry="3" fill="#fff" opacity=".8"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="8" y="10" width="4" height="4" fill="#ef4444"/>
      <rect x="20" y="10" width="4" height="4" fill="#ef4444"/>
      <rect x="6" y="14" width="20" height="4" fill="#ef4444"/>
      <rect x="8" y="18" width="16" height="4" fill="#ef4444"/>
      <rect x="10" y="22" width="12" height="4" fill="#ef4444"/>
      <rect x="12" y="26" width="8" height="2" fill="#ef4444"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="6" y="12" width="20" height="12" rx="2" fill="#22c55e"/>
      <circle cx="16" cy="18" r="4" fill="#86efac"/>
      <text x="16" y="20" text-anchor="middle" font-size="6" fill="#14532d">$</text>
    `)), svgDataUri(pixelSvg(`
      <rect x="14" y="4" width="4" height="20" fill="#38bdf8"/>
      <rect x="13" y="22" width="6" height="6" fill="#9ca3af"/>
      <rect x="15" y="4" width="2" height="18" fill="#e0f2fe"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="14" y="4" width="4" height="20" fill="#ef4444"/>
      <rect x="13" y="22" width="6" height="6" fill="#9ca3af"/>
      <rect x="15" y="4" width="2" height="18" fill="#fecaca"/>
    `)), svgDataUri(pixelSvg(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#1f2937"/>
      <path d="M10 14 L16 10 L22 14 L20 18 L12 18 Z" fill="#fbbf24"/>
      <ellipse cx="12" cy="17" rx="2" ry="3" fill="#fff"/>
      <ellipse cx="20" cy="17" rx="2" ry="3" fill="#fff"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="6" y="16" width="20" height="8" rx="2" fill="#cbd5e1"/>
      <rect x="10" y="12" width="12" height="6" fill="#94a3b8"/>
      <rect x="8" y="22" width="4" height="4" fill="#1f2937"/>
      <rect x="20" y="22" width="4" height="4" fill="#1f2937"/>
    `)), svgDataUri(pixelSvg(`
      <rect x="4" y="20" width="24" height="3" fill="#78350f"/>
      <rect x="20" y="8" width="3" height="14" fill="#78350f"/>
      <ellipse cx="22" cy="8" rx="6" ry="3" fill="#a16207"/>
    `));
	//#endregion
	//#region src/core/sites/youtube/progressThemes.ts
	var DEFAULT_BAR = "#ff0000";
	var DEFAULT_PLAYED = "#cc0000";
	var DEFAULT_HEIGHT = 3;
	/** Built-in progress bar themes (color & gradient styles). */
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
		},
		{
			id: "pacman",
			labelKey: "sites.youtube.progress.pacman",
			bar: "#1f2937",
			played: "#facc15"
		},
		{
			id: "minecraft",
			labelKey: "sites.youtube.progress.minecraft",
			bar: "#14532d",
			played: "#4ade80"
		},
		{
			id: "sonic",
			labelKey: "sites.youtube.progress.sonic",
			bar: "#1e3a8a",
			played: "#38bdf8",
			animated: true,
			effect: "flow"
		},
		{
			id: "among",
			labelKey: "sites.youtube.progress.among",
			bar: "#1f2937",
			played: "#ef4444"
		},
		{
			id: "adventure",
			labelKey: "sites.youtube.progress.adventure",
			bar: "#4ade80",
			played: "#22c55e"
		},
		{
			id: "pusheen",
			labelKey: "sites.youtube.progress.pusheenPink",
			bar: "#fbcfe8",
			played: "#f472b6"
		},
		{
			id: "lightsaber",
			labelKey: "sites.youtube.progress.lightsaber",
			bar: "#0f172a",
			played: "#38bdf8",
			animated: true,
			effect: "glow"
		},
		{
			id: "sith",
			labelKey: "sites.youtube.progress.sith",
			bar: "#0f172a",
			played: "#ef4444",
			animated: true,
			effect: "glow"
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
		for (const f of YOUTUBE_FEATURES) {
			if (f.impl === "mirror") continue;
			values[f.id] = f.default;
		}
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
	var feedScanTimer = null;
	var feedCtx = null;
	var undoTimer = null;
	var stillWatchingObserver = null;
	var stillScanTimer = null;
	var wheelBound = false;
	var keyBound = false;
	var navHandler = null;
	var FEED_DEBOUNCE_MS = 120;
	var STILL_WATCHING_DEBOUNCE_MS = 200;
	function values(ctx) {
		return ctx.state.values;
	}
	/** Hiding tiles in the feed — requires DOM scans (keep separate from undo-bar cleanup). */
	function feedTileFiltersActive(ctx) {
		const v = values(ctx);
		return isFeatureOn(v, "keywordFilter") || isFeatureOn(v, "hideChannels") || isFeatureOn(v, "hideWatchedVideos");
	}
	function feedScriptsActive(ctx) {
		const v = values(ctx);
		return feedTileFiltersActive(ctx) || isFeatureOn(v, "autoHideUndoBar");
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
	function applyTile(tile, ctx) {
		const el = tile;
		if (shouldHideTile(tile, ctx)) el.style.display = "none";
		else el.style.removeProperty("display");
	}
	function scanTilesUnder(root, ctx) {
		if (root instanceof Element) {
			if (root.matches(TILE_SELECTOR)) applyTile(root, ctx);
			for (const tile of root.querySelectorAll(TILE_SELECTOR)) applyTile(tile, ctx);
		} else for (const tile of root.querySelectorAll?.(TILE_SELECTOR) ?? []) applyTile(tile, ctx);
	}
	function scanFeeds(ctx) {
		if (!feedTileFiltersActive(ctx)) return;
		scanTilesUnder(document, ctx);
	}
	function scheduleFeedScan(ctx, roots) {
		feedCtx = ctx;
		if (roots?.length) for (const root of roots) scanTilesUnder(root, ctx);
		if (feedScanTimer) return;
		feedScanTimer = setTimeout(() => {
			feedScanTimer = null;
			if (feedCtx) scanFeeds(feedCtx);
		}, FEED_DEBOUNCE_MS);
	}
	function feedObserveTarget() {
		return document.querySelector("ytd-app") ?? document.querySelector("#content") ?? document.body;
	}
	reg("feedFilters", {
		start(ctx) {
			if (!feedScriptsActive(ctx)) return;
			if (feedTileFiltersActive(ctx)) {
				scanFeeds(ctx);
				const target = feedObserveTarget();
				if (target) {
					feedObserver = new MutationObserver((mutations) => {
						const roots = [];
						for (const m of mutations) for (const node of m.addedNodes) if (node instanceof Element) roots.push(node);
						scheduleFeedScan(ctx, roots.length ? roots : void 0);
					});
					feedObserver.observe(target, {
						childList: true,
						subtree: true
					});
				}
			}
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
			feedCtx = null;
			if (feedScanTimer) clearTimeout(feedScanTimer);
			feedScanTimer = null;
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
	function dismissStillWatching() {
		for (const el of document.querySelectorAll("yt-confirm-dialog-renderer, tp-yt-paper-dialog")) if (isStillWatchingDialog(el.textContent ?? "")) el.querySelector("#button, [aria-label*=\"Yes\"], [aria-label*=\"Continue\"]")?.click();
	}
	reg("stillWatching", {
		start(ctx) {
			if (!isFeatureOn(values(ctx), "dismissStillWatching")) return;
			const target = document.querySelector("ytd-app") ?? document.body;
			stillWatchingObserver = new MutationObserver(() => {
				if (stillScanTimer) return;
				stillScanTimer = setTimeout(() => {
					stillScanTimer = null;
					dismissStillWatching();
				}, STILL_WATCHING_DEBOUNCE_MS);
			});
			stillWatchingObserver.observe(target, {
				childList: true,
				subtree: true
			});
			dismissStillWatching();
		},
		stop() {
			stillWatchingObserver?.disconnect();
			stillWatchingObserver = null;
			if (stillScanTimer) clearTimeout(stillScanTimer);
			stillScanTimer = null;
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
	var NAV_REFRESH_RUNNERS = [
		"sponsor",
		"dislikes",
		"redirectShorts",
		"player"
	];
	function onYoutubeNavigate(ctx) {
		if (!ctx.state.enabled) return;
		for (const id of NAV_REFRESH_RUNNERS) {
			const runner = runners.get(id);
			runner?.stop();
			runner?.start(ctx);
		}
		if (feedTileFiltersActive(ctx)) scanFeeds(ctx);
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
		for (const attr of [...root.attributes]) if (attr.name.startsWith("data-tbx-yt-")) root.removeAttribute(attr.name);
		clearProgressDom(root);
		const customProps = [];
		for (let i = 0; i < root.style.length; i++) {
			const name = root.style.item(i);
			if (name.startsWith("--tbx-yt-")) customProps.push(name);
		}
		for (const name of customProps) root.style.removeProperty(name);
		document.getElementById(STYLE_LINK_ID)?.remove();
		document.querySelectorAll("ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer").forEach((el) => el.style.removeProperty("display"));
	}
	//#endregion
	//#region src/chrome/content/sites/youtube/isolated.ts
	var cachedState = null;
	var navigateTimer = null;
	function readState(raw) {
		if (!raw || typeof raw !== "object") return null;
		const o = raw;
		if (!o.values) return null;
		return o;
	}
	function apply(raw) {
		const state = readState(raw);
		cachedState = state;
		if (!state?.enabled) {
			stopAll();
			return;
		}
		applyYoutubeEnhancer(state);
	}
	function scheduleNavigateRefresh() {
		if (!cachedState?.enabled) return;
		if (navigateTimer) clearTimeout(navigateTimer);
		navigateTimer = setTimeout(() => {
			navigateTimer = null;
			if (cachedState?.enabled) onYoutubeNavigate({
				state: cachedState,
				onNavigate: () => {}
			});
		}, 80);
	}
	var guarded = window;
	if (!guarded.__toolboxYtEnhancer) {
		guarded.__toolboxYtEnhancer = true;
		if (window === window.top) {
			chrome.storage.local.get("youtubeEnhancer", (result) => apply(result.youtubeEnhancer));
			chrome.storage.onChanged.addListener((changes, area) => {
				if (area === "local" && changes.youtubeEnhancer) apply(changes.youtubeEnhancer.newValue);
			});
			document.addEventListener("yt-navigate-finish", scheduleNavigateRefresh);
		}
	}
	//#endregion
})();
