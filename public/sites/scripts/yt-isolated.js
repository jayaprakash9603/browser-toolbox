(function(){function e(e,t,n){let r=n?.impl??`css`,i=n?.default??!1;return t.map(t=>({id:t,section:e,kind:`toggle`,impl:r,default:i,...n?.bestEffort?{bestEffort:!0}:{},...n?.thirdParty?{thirdParty:!0}:{}}))}var t=[{id:`blockAds`,section:`ads`,kind:`toggle`,impl:`mirror`,mirrorKey:`youtubeEnabled`,default:!0},...e(`ads`,[`hideSponsored`,`hideMerch`,`hidePremiumUpsell`,`hideInfoPanels`,`hideAiSummaries`]),...e(`feeds`,[`hideShortsShelf`,`hideLive`,`hideStreamed`,`hideMixes`,`hidePlaylists`,`hideMoviesTv`,`hideUpcoming`,`hideMembersOnly`,`hideAutoDubbed`,`hideSuggestedSections`,`hideHomeCategories`,`disableHomeFeed`,`hideSubCollaborations`,`hideSubLatestBar`]),{id:`hideWatchedVideos`,section:`feeds`,kind:`toggle`,impl:`script`,default:!1},{id:`watchedMinPercent`,section:`feeds`,kind:`number`,impl:`script`,default:80,min:10,max:100,step:5},{id:`autoHideUndoBar`,section:`feeds`,kind:`toggle`,impl:`script`,default:!1},{id:`hideChannels`,section:`feeds`,kind:`toggle`,impl:`script`,default:!1},{id:`blockedChannels`,section:`feeds`,kind:`text`,impl:`script`,default:``},{id:`keywordFilter`,section:`feeds`,kind:`toggle`,impl:`script`,default:!1},{id:`blockedKeywords`,section:`feeds`,kind:`text`,impl:`script`,default:``},{id:`gridMinPerRow`,section:`feeds`,kind:`number`,impl:`css`,default:0,min:0,max:8,step:1},{id:`searchThumbSize`,section:`feeds`,kind:`select`,impl:`css`,default:`default`,options:[{value:`default`,labelKey:`sites.youtube.options.thumbDefault`},{value:`large`,labelKey:`sites.youtube.options.thumbLarge`},{value:`small`,labelKey:`sites.youtube.options.thumbSmall`}]},...e(`watch`,[`hideRelated`,`hideNextButton`,`hideWatermark`,`hideShareActions`,`hideMetadata`,`hideComments`,`hideChat`,`hideEndCards`,`hideEndscreen`]),{id:`disableAutoplay`,section:`watch`,kind:`toggle`,impl:`script`,default:!1},{id:`disableAmbient`,section:`watch`,kind:`toggle`,impl:`script`,default:!1},...e(`watch`,[`alwaysTheater`,`theaterFullSize`,`theaterNoEnlarge`],{bestEffort:!0}),{id:`alwaysOriginalAudio`,section:`watch`,kind:`toggle`,impl:`script`,default:!1,bestEffort:!0},{id:`pauseChannelTrailers`,section:`watch`,kind:`toggle`,impl:`script`,default:!1},{id:`videoSnapshot`,section:`watch`,kind:`toggle`,impl:`script`,default:!1},{id:`downloadTranscript`,section:`watch`,kind:`toggle`,impl:`script`,default:!1},{id:`dismissStillWatching`,section:`watch`,kind:`toggle`,impl:`script`,default:!1},{id:`defaultSpeed`,section:`player`,kind:`select`,impl:`script`,default:`1`,options:[{value:`0.1`,labelKey:`sites.youtube.options.speed01`},{value:`0.15`,labelKey:`sites.youtube.options.speed015`},{value:`0.25`,labelKey:`sites.youtube.options.speed025`},{value:`0.5`,labelKey:`sites.youtube.options.speed05`},{value:`0.75`,labelKey:`sites.youtube.options.speed075`},{value:`1`,labelKey:`sites.youtube.options.speed1`},{value:`1.25`,labelKey:`sites.youtube.options.speed125`},{value:`1.5`,labelKey:`sites.youtube.options.speed15`},{value:`1.75`,labelKey:`sites.youtube.options.speed175`},{value:`2`,labelKey:`sites.youtube.options.speed2`},{value:`2.5`,labelKey:`sites.youtube.options.speed25`},{value:`3`,labelKey:`sites.youtube.options.speed3`},{value:`4`,labelKey:`sites.youtube.options.speed4`},{value:`5`,labelKey:`sites.youtube.options.speed5`},{value:`8`,labelKey:`sites.youtube.options.speed8`},{value:`10`,labelKey:`sites.youtube.options.speed10`},{value:`16`,labelKey:`sites.youtube.options.speed16`}]},{id:`speedHotkeys`,section:`player`,kind:`toggle`,impl:`script`,default:!1},{id:`wheelVolume`,section:`player`,kind:`toggle`,impl:`script`,default:!1},{id:`wheelSpeed`,section:`player`,kind:`toggle`,impl:`script`,default:!1},{id:`defaultQuality`,section:`player`,kind:`select`,impl:`script`,default:`auto`,options:[{value:`auto`,labelKey:`sites.youtube.options.qualityAuto`},{value:`144`,labelKey:`sites.youtube.options.quality144`},{value:`360`,labelKey:`sites.youtube.options.quality360`},{value:`480`,labelKey:`sites.youtube.options.quality480`},{value:`720`,labelKey:`sites.youtube.options.quality720`},{value:`1080`,labelKey:`sites.youtube.options.quality1080`},{value:`1440`,labelKey:`sites.youtube.options.quality1440`},{value:`2160`,labelKey:`sites.youtube.options.quality2160`},{value:`4320`,labelKey:`sites.youtube.options.quality4320`}],bestEffort:!0},{id:`loopButton`,section:`player`,kind:`toggle`,impl:`script`,default:!1},{id:`rememberVolume`,section:`player`,kind:`toggle`,impl:`script`,default:!1},...e(`player`,[`hideFsMoreVideos`,`hideFsTitle`,`hideFsLike`,`compactPlayButton`,`removeControlBg`,`restoreMiniplayer`,`restoreCornerFullscreen`],{bestEffort:!0}),...e(`shorts`,[`hideShorts`,`hideShortsActions`,`hideShortsRemix`,`hideShortsRelatedLink`]),{id:`redirectShorts`,section:`shorts`,kind:`toggle`,impl:`script`,default:!1},{id:`shortsStopLoop`,section:`shorts`,kind:`toggle`,impl:`script`,default:!1},...e(`shorts`,[`shortsAlwaysProgress`,`shortsMetadataHover`]),{id:`shortsMinPerRow`,section:`shorts`,kind:`number`,impl:`css`,default:0,min:0,max:6,step:1},...e(`appearance`,[`fullTitles`,`squareCorners`,`hideChannelBanners`,`hideVoiceSearch`,`logoToSubscriptions`,`tidyGuide`,`noPinkGradient`,`noThemedHover`,`smallRelatedThumbs`]),{id:`progressTheme`,section:`progress`,kind:`select`,impl:`style`,default:`default`,options:[{value:`default`,labelKey:`sites.youtube.options.progressDefault`},{value:`custom`,labelKey:`sites.youtube.options.progressCustom`},...`ocean.neon.fire.gold.forest.violet.rose.slate.rainbow.candy.pride.midnight.mint.sunset.ice.lava.matrix.cyber.mono.pacman.minecraft.sonic.among.adventure.pusheen.lightsaber.sith`.split(`.`).map(e=>({value:e,labelKey:`sites.youtube.progress.${e===`pusheen`?`pusheenPink`:e}`}))]},{id:`progressBarColor`,section:`progress`,kind:`color`,impl:`style`,default:`#ff0000`},{id:`progressPlayedColor`,section:`progress`,kind:`color`,impl:`style`,default:`#cc0000`},{id:`progressHeight`,section:`progress`,kind:`number`,impl:`style`,default:3,min:2,max:12,step:1},{id:`progressScrubberEmoji`,section:`progress`,kind:`text`,impl:`style`,default:``},{id:`progressScrubberImage`,section:`progress`,kind:`text`,impl:`style`,default:``},...e(`embedded`,[`hideEmbedShare`,`hideEmbedPauseOverlay`]),{id:`sponsorBlock`,section:`community`,kind:`toggle`,impl:`script`,default:!1,thirdParty:!0},{id:`sponsorSkipNotice`,section:`community`,kind:`toggle`,impl:`script`,default:!1,thirdParty:!0},{id:`sponsorCategories`,section:`community`,kind:`multiselect`,impl:`script`,default:[`sponsor`,`selfpromo`,`interaction`,`intro`,`outro`,`filler`,`music_offtopic`],thirdParty:!0},{id:`returnDislikes`,section:`community`,kind:`toggle`,impl:`script`,default:!1,thirdParty:!0}];new Map(t.map(e=>[e.id,e]));var n=t.filter(e=>e.impl===`css`).map(e=>e.id);t.filter(e=>e.impl===`script`).map(e=>e.id);var r={extName:`Browser Toolbox`,extDescription:`All-in-one productivity toolbox: clipboard, text, developer, QA and web utilities in one side panel.`,actionTitle:`Open Browser Toolbox`,contextMenuOpen:`Open Browser Toolbox`,contextMenuPauseAdblock:`Pause ad blocking on this site`,contextMenuSaveImageAs:`Save image as`,contextMenuPip:`Picture-in-Picture`,commandTogglePip:`Toggle Picture-in-Picture for the current tab`};function i(e){try{if(typeof chrome<`u`&&chrome.i18n?.getMessage){let t=chrome.i18n.getMessage(e);if(t)return t}}catch{}return r[e]??``}function a(){return i(`extName`)||r.extName}a();function o(e){return`data:image/svg+xml,${encodeURIComponent(e.trim())}`}var s=32;function c(e){return`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges">${e}</svg>`}o(c(`
      <rect x="4" y="14" width="24" height="12" fill="#f4a460"/>
      <circle cx="10" cy="18" r="2" fill="#c41e3a"/>
      <circle cx="16" cy="20" r="2" fill="#c41e3a"/>
      <circle cx="22" cy="17" r="2" fill="#c41e3a"/>
      <path d="M4 14 L16 6 L28 14 Z" fill="#ffd966"/>
    `)),o(c(`
      <rect x="2" y="14" width="28" height="6" fill="#ffb6c1"/>
      <rect x="6" y="10" width="14" height="10" fill="#9cf"/>
      <rect x="8" y="12" width="4" height="3" fill="#333"/>
      <rect x="14" y="12" width="4" height="3" fill="#333"/>
      <rect x="20" y="11" width="6" height="4" fill="#ffb6c1"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="12" ry="10" fill="#f5f5f5"/>
      <ellipse cx="10" cy="22" rx="6" ry="4" fill="#fff"/>
      <ellipse cx="22" cy="22" rx="6" ry="4" fill="#fff"/>
      <circle cx="12" cy="16" r="2" fill="#222"/>
      <circle cx="20" cy="16" r="2" fill="#222"/>
      <rect x="13" y="8" width="6" height="4" fill="#f5f5f5"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="11" ry="9" fill="#e8c170"/>
      <ellipse cx="8" cy="14" rx="4" ry="5" fill="#e8c170"/>
      <ellipse cx="24" cy="14" rx="4" ry="5" fill="#e8c170"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
      <ellipse cx="16" cy="21" rx="3" ry="2" fill="#fff"/>
    `)),o(c(`
      <rect x="8" y="12" width="16" height="14" fill="#d4a574"/>
      <rect x="10" y="14" width="4" height="3" fill="#222"/>
      <rect x="18" y="14" width="4" height="3" fill="#222"/>
      <rect x="4" y="4" width="4" height="8" fill="#f97316"/>
      <rect x="24" y="6" width="4" height="6" fill="#ef4444"/>
    `)),o(c(`
      <rect x="6" y="10" width="20" height="14" fill="#fcd34d"/>
      <rect x="8" y="14" width="7" height="4" fill="#111"/>
      <rect x="17" y="14" width="7" height="4" fill="#111"/>
      <rect x="15" y="14" width="2" height="4" fill="#111"/>
    `)),o(c(`
      <ellipse cx="16" cy="16" rx="10" ry="9" fill="#fff"/>
      <circle cx="12" cy="15" r="2" fill="#222"/>
      <circle cx="20" cy="15" r="2" fill="#222"/>
      <rect x="4" y="22" width="6" height="4" fill="#fff"/>
      <rect x="22" y="22" width="6" height="4" fill="#fff"/>
    `)),o(c(`
      <rect x="10" y="8" width="12" height="6" fill="#dc2626"/>
      <rect x="8" y="14" width="16" height="10" fill="#d4a574"/>
      <rect x="10" y="16" width="4" height="3" fill="#222"/>
      <rect x="18" y="16" width="4" height="3" fill="#222"/>
      <rect x="14" y="20" width="4" height="2" fill="#7f1d1d"/>
    `)),o(c(`
      <ellipse cx="16" cy="14" rx="10" ry="8" fill="#ef4444"/>
      <ellipse cx="16" cy="22" rx="6" ry="6" fill="#fde68a"/>
      <circle cx="12" cy="12" r="2" fill="#fff"/>
      <circle cx="20" cy="14" r="2" fill="#fff"/>
    `)),o(c(`
      <polygon points="16,4 19,12 28,12 21,17 24,26 16,21 8,26 11,17 4,12 13,12" fill="#facc15"/>
    `)),o(c(`
      <rect x="14" y="4" width="4" height="14" fill="#22d3ee"/>
      <rect x="12" y="16" width="8" height="4" fill="#22d3ee"/>
      <rect x="10" y="20" width="12" height="2" fill="#78716c"/>
      <rect x="14" y="22" width="4" height="6" fill="#57534e"/>
    `)),o(c(`
      <rect x="8" y="8" width="16" height="20" fill="#4ade80"/>
      <rect x="10" y="12" width="4" height="4" fill="#14532d"/>
      <rect x="18" y="12" width="4" height="4" fill="#14532d"/>
      <rect x="12" y="20" width="8" height="4" fill="#14532d"/>
    `)),o(c(`
      <ellipse cx="14" cy="18" rx="10" ry="8" fill="#2563eb"/>
      <ellipse cx="22" cy="14" rx="6" ry="5" fill="#2563eb"/>
      <circle cx="20" cy="13" r="2" fill="#fff"/>
      <circle cx="20" cy="13" r="1" fill="#222"/>
    `)),o(c(`
      <path d="M16 4 A12 12 0 1 1 16 28 L16 16 Z" fill="#facc15"/>
      <circle cx="22" cy="12" r="2" fill="#222"/>
    `)),o(c(`
      <ellipse cx="16" cy="20" rx="9" ry="10" fill="#ef4444"/>
      <rect x="10" y="8" width="12" height="10" rx="4" fill="#ef4444"/>
      <ellipse cx="20" cy="12" rx="5" ry="4" fill="#7dd3fc"/>
      <rect x="12" y="14" width="8" height="4" fill="#1f2937"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="11" ry="10" fill="#f472b6"/>
      <ellipse cx="8" cy="14" rx="4" ry="5" fill="#f472b6"/>
      <ellipse cx="24" cy="14" rx="4" ry="5" fill="#f472b6"/>
      <ellipse cx="12" cy="17" rx="2" ry="3" fill="#222"/>
      <ellipse cx="20" cy="17" rx="2" ry="3" fill="#222"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#facc15"/>
      <polygon points="8,10 10,18 4,16" fill="#facc15"/>
      <polygon points="24,10 22,18 28,16" fill="#facc15"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
      <circle cx="16" cy="21" r="2" fill="#ef4444"/>
    `)),o(c(`
      <rect x="8" y="10" width="16" height="16" rx="2" fill="#4ade80"/>
      <rect x="10" y="14" width="5" height="5" fill="#14532d"/>
      <rect x="17" y="14" width="5" height="5" fill="#14532d"/>
      <rect x="12" y="22" width="8" height="2" fill="#166534"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="12" ry="8" fill="#fbbf24"/>
      <ellipse cx="8" cy="16" rx="4" ry="5" fill="#fbbf24"/>
      <circle cx="12" cy="16" r="2" fill="#222"/>
      <circle cx="20" cy="16" r="2" fill="#222"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="11" ry="9" fill="#9ca3af"/>
      <rect x="8" y="10" width="4" height="4" fill="#9ca3af"/>
      <rect x="20" y="10" width="4" height="4" fill="#9ca3af"/>
      <circle cx="12" cy="17" r="1.5" fill="#222"/>
      <circle cx="20" cy="17" r="1.5" fill="#222"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#fff"/>
      <ellipse cx="8" cy="12" rx="4" ry="5" fill="#fff"/>
      <ellipse cx="24" cy="12" rx="4" ry="5" fill="#fff"/>
      <ellipse cx="8" cy="12" rx="2" ry="3" fill="#f472b6"/>
      <ellipse cx="24" cy="12" rx="2" ry="3" fill="#f472b6"/>
      <circle cx="13" cy="17" r="1.5" fill="#222"/>
      <circle cx="19" cy="17" r="1.5" fill="#222"/>
    `)),o(c(`
      <rect x="10" y="8" width="12" height="18" rx="2" fill="#facc15"/>
      <circle cx="14" cy="14" r="2" fill="#fff"/>
      <circle cx="20" cy="14" r="3" fill="#fff"/>
      <circle cx="20" cy="14" r="1.5" fill="#222"/>
      <rect x="12" y="20" width="8" height="2" fill="#7f1d1d"/>
    `)),o(c(`
      <rect x="15" y="4" width="2" height="18" fill="#e5e7eb"/>
      <rect x="12" y="20" width="8" height="3" fill="#1f2937"/>
      <rect x="14" y="22" width="4" height="6" fill="#57534e"/>
      <rect x="15" y="6" width="2" height="12" fill="#22d3ee"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="11" ry="8" fill="#d97706"/>
      <ellipse cx="8" cy="14" rx="5" ry="6" fill="#d97706"/>
      <ellipse cx="24" cy="14" rx="5" ry="6" fill="#d97706"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#f59e0b"/>
      <polygon points="8,12 10,20 4,18" fill="#f59e0b"/>
      <polygon points="24,12 22,20 28,18" fill="#f59e0b"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="10" ry="8" fill="#f9a8d4"/>
      <rect x="6" y="12" width="4" height="8" fill="#f472b6"/>
      <rect x="22" y="12" width="4" height="8" fill="#f472b6"/>
      <circle cx="12" cy="17" r="2" fill="#222"/>
      <circle cx="20" cy="17" r="2" fill="#222"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="9" ry="7" fill="#facc15"/>
      <rect x="10" y="14" width="12" height="3" fill="#1f2937"/>
      <rect x="10" y="18" width="12" height="3" fill="#1f2937"/>
      <ellipse cx="22" cy="12" rx="4" ry="3" fill="#fff" opacity=".8"/>
    `)),o(c(`
      <rect x="8" y="10" width="4" height="4" fill="#ef4444"/>
      <rect x="20" y="10" width="4" height="4" fill="#ef4444"/>
      <rect x="6" y="14" width="20" height="4" fill="#ef4444"/>
      <rect x="8" y="18" width="16" height="4" fill="#ef4444"/>
      <rect x="10" y="22" width="12" height="4" fill="#ef4444"/>
      <rect x="12" y="26" width="8" height="2" fill="#ef4444"/>
    `)),o(c(`
      <rect x="6" y="12" width="20" height="12" rx="2" fill="#22c55e"/>
      <circle cx="16" cy="18" r="4" fill="#86efac"/>
      <text x="16" y="20" text-anchor="middle" font-size="6" fill="#14532d">$</text>
    `)),o(c(`
      <rect x="14" y="4" width="4" height="20" fill="#38bdf8"/>
      <rect x="13" y="22" width="6" height="6" fill="#9ca3af"/>
      <rect x="15" y="4" width="2" height="18" fill="#e0f2fe"/>
    `)),o(c(`
      <rect x="14" y="4" width="4" height="20" fill="#ef4444"/>
      <rect x="13" y="22" width="6" height="6" fill="#9ca3af"/>
      <rect x="15" y="4" width="2" height="18" fill="#fecaca"/>
    `)),o(c(`
      <ellipse cx="16" cy="18" rx="10" ry="9" fill="#1f2937"/>
      <path d="M10 14 L16 10 L22 14 L20 18 L12 18 Z" fill="#fbbf24"/>
      <ellipse cx="12" cy="17" rx="2" ry="3" fill="#fff"/>
      <ellipse cx="20" cy="17" rx="2" ry="3" fill="#fff"/>
    `)),o(c(`
      <rect x="6" y="16" width="20" height="8" rx="2" fill="#cbd5e1"/>
      <rect x="10" y="12" width="12" height="6" fill="#94a3b8"/>
      <rect x="8" y="22" width="4" height="4" fill="#1f2937"/>
      <rect x="20" y="22" width="4" height="4" fill="#1f2937"/>
    `)),o(c(`
      <rect x="4" y="20" width="24" height="3" fill="#78350f"/>
      <rect x="20" y="8" width="3" height="14" fill="#78350f"/>
      <ellipse cx="22" cy="8" rx="6" ry="3" fill="#a16207"/>
    `));var l=`#ff0000`,u=`#cc0000`,d=3,f=[{id:`default`,labelKey:`sites.youtube.progress.default`,bar:`#ff0000`,played:`#cc0000`},{id:`ocean`,labelKey:`sites.youtube.progress.ocean`,bar:`#0ea5e9`,played:`#0284c7`},{id:`neon`,labelKey:`sites.youtube.progress.neon`,bar:`#22d3ee`,played:`#06b6d4`,animated:!0,effect:`glow`},{id:`fire`,labelKey:`sites.youtube.progress.fire`,bar:`#f97316`,played:`#ea580c`,animated:!0,effect:`shimmer`},{id:`gold`,labelKey:`sites.youtube.progress.gold`,bar:`#eab308`,played:`#ca8a04`},{id:`forest`,labelKey:`sites.youtube.progress.forest`,bar:`#22c55e`,played:`#16a34a`},{id:`violet`,labelKey:`sites.youtube.progress.violet`,bar:`#a855f7`,played:`#9333ea`},{id:`rose`,labelKey:`sites.youtube.progress.rose`,bar:`#f43f5e`,played:`#e11d48`},{id:`slate`,labelKey:`sites.youtube.progress.slate`,bar:`#64748b`,played:`#475569`},{id:`rainbow`,labelKey:`sites.youtube.progress.rainbow`,bar:`linear-gradient(90deg,red,orange,yellow,green,blue,violet)`,played:`linear-gradient(90deg,#f43f5e,#eab308,#22c55e,#3b82f6,#a855f7)`,animated:!0,effect:`flow`},{id:`candy`,labelKey:`sites.youtube.progress.candy`,bar:`repeating-linear-gradient(45deg,#f472b6,#f472b6 8px,#fbcfe8 8px,#fbcfe8 16px)`,played:`#db2777`,animated:!0,effect:`flow`},{id:`pride`,labelKey:`sites.youtube.progress.pride`,bar:`linear-gradient(90deg,#e40303,#ff8c00,#ffed00,#008026,#24408e,#732982)`,played:`#555`},{id:`midnight`,labelKey:`sites.youtube.progress.midnight`,bar:`#312e81`,played:`#1e1b4b`},{id:`mint`,labelKey:`sites.youtube.progress.mint`,bar:`#6ee7b7`,played:`#34d399`},{id:`sunset`,labelKey:`sites.youtube.progress.sunset`,bar:`linear-gradient(90deg,#f43f5e,#f97316,#fbbf24)`,played:`#c2410c`},{id:`ice`,labelKey:`sites.youtube.progress.ice`,bar:`#bae6fd`,played:`#7dd3fc`},{id:`lava`,labelKey:`sites.youtube.progress.lava`,bar:`#450a0a`,played:`#dc2626`,animated:!0,effect:`glow`},{id:`matrix`,labelKey:`sites.youtube.progress.matrix`,bar:`#22c55e`,played:`#14532d`,animated:!0,effect:`matrix`},{id:`cyber`,labelKey:`sites.youtube.progress.cyber`,bar:`#f0abfc`,played:`#c026d3`,animated:!0,effect:`glow`},{id:`mono`,labelKey:`sites.youtube.progress.mono`,bar:`#fafafa`,played:`#a3a3a3`},{id:`pacman`,labelKey:`sites.youtube.progress.pacman`,bar:`#1f2937`,played:`#facc15`},{id:`minecraft`,labelKey:`sites.youtube.progress.minecraft`,bar:`#14532d`,played:`#4ade80`},{id:`sonic`,labelKey:`sites.youtube.progress.sonic`,bar:`#1e3a8a`,played:`#38bdf8`,animated:!0,effect:`flow`},{id:`among`,labelKey:`sites.youtube.progress.among`,bar:`#1f2937`,played:`#ef4444`},{id:`adventure`,labelKey:`sites.youtube.progress.adventure`,bar:`#4ade80`,played:`#22c55e`},{id:`pusheen`,labelKey:`sites.youtube.progress.pusheenPink`,bar:`#fbcfe8`,played:`#f472b6`},{id:`lightsaber`,labelKey:`sites.youtube.progress.lightsaber`,bar:`#0f172a`,played:`#38bdf8`,animated:!0,effect:`glow`},{id:`sith`,labelKey:`sites.youtube.progress.sith`,bar:`#0f172a`,played:`#ef4444`,animated:!0,effect:`glow`}];function p(e){return f.find(t=>t.id===e)}function ee(e){let t=String(e.progressTheme??`default`),n=String(e.progressBarColor??l),r=String(e.progressPlayedColor??u),i=Number(e.progressHeight??d),a=String(e.progressScrubberEmoji??``).trim(),o=String(e.progressScrubberImage??``).trim();return t!=="default"||n!==l||r!==u||i!==d||a.length>0||o.length>0}function te(e){let t=e.trim();return t?/^https:\/\//i.test(t)||/^data:image\//i.test(t):!1}function ne(e,t,n,r){let i=p(e),a=i?.bar??l,o=i?.played??u;return(e===`custom`||e==="default"||!i)&&(t&&(a=t),n&&(o=n)),{"--tbx-yt-progress-bar":a,"--tbx-yt-progress-played":o,"--tbx-yt-progress-height":`${r??d}px`}}function m(){let e={};for(let n of t)n.impl!==`mirror`&&(e[n.id]=n.default);return f.map(e=>e.id).includes(String(e.progressTheme))||(e.progressTheme=`default`),e}m();function re(e){try{let t=new URL(e,`https://www.youtube.com`),n=/^\/shorts\/([\w-]{11})/.exec(t.pathname);return n?`https://www.youtube.com/watch?v=${n[1]}`:null}catch{return null}}function ie(e){return e.split(/[\n,;]+/).map(e=>e.trim().toLowerCase()).filter(Boolean)}function ae(e){return e.split(/[\n,;]+/).map(e=>e.trim().toLowerCase().replace(/^@/,``)).filter(Boolean)}function oe(e,t){if(!t.length)return!1;let n=e.toLowerCase();return t.some(e=>n.includes(e))}function se(e,t,n){if(!n.length)return!1;let r=e.toLowerCase(),i=t.toLowerCase();return n.some(e=>r.includes(e)||i===e||r===e)}function ce(e){if(!e)return null;let t=/(\d+)\s*%/.exec(e);return t?Number(t[1]):null}function le(e){return/still watching|video paused|continue watching/i.test(e)}function h(e){return`data-tbx-yt-${e.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`)}`}function g(e,t){let n=e[t];return n===!0||n===`true`}function _(e,t){window.postMessage({__toolboxYtCmd:e,payload:t},location.origin||`*`)}var v=new Map;function y(e,t){v.set(e,t)}var b=`ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer`,x=null,S=null,C=null,w=null,T=null,E=null,D=!1,O=!1,k=null,A=0,j=null,ue=120,de=200;function M(e){return e.state.values}function N(e){let t=M(e);return g(t,`keywordFilter`)||g(t,`hideChannels`)||g(t,`hideWatchedVideos`)}function fe(e){let t=M(e);return N(e)||g(t,`autoHideUndoBar`)}function pe(e,t){let n=e.querySelector(`#video-title, .title`)?.textContent??``,r=e.querySelector(`#channel-name, ytd-channel-name`)?.textContent?.trim()??``,i=e.querySelector(`a[href*="/channel/"], a[href*="/@"]`)?.getAttribute(`href`)??``;if(g(M(t),`keywordFilter`)){let e=ie(String(M(t).blockedKeywords??``));if(e.length&&oe(n,e))return!0}if(g(M(t),`hideChannels`)){let e=ae(String(M(t).blockedChannels??``));if(e.length&&se(r,i,e))return!0}if(g(M(t),`hideWatchedVideos`)){let n=Number(M(t).watchedMinPercent??80),r=e.querySelector(`ytd-thumbnail-overlay-resume-playback-renderer`);if(!r)return!1;let i=ce(r.getAttribute(`aria-label`)??null);if(i!=null&&i>=n)return!0}return!1}function P(e,t){let n=e;pe(e,t)?n.style.display=`none`:n.style.removeProperty(`display`)}function F(e,t){if(e instanceof Element){e.matches(b)&&P(e,t);for(let n of e.querySelectorAll(b))P(n,t)}else for(let n of e.querySelectorAll?.(b)??[])P(n,t)}function I(e){N(e)&&F(document,e)}var L=new Set;function R(e,t){C=e,t?.forEach(e=>L.add(e)),!S&&(S=setTimeout(()=>{S=null;let e=[...L];if(L.clear(),C)for(let t of e)t instanceof Node&&t.isConnected&&F(t,C)},ue))}function me(){return document.querySelector(`ytd-browse #contents`)??document.querySelector(`ytd-browse`)??document.querySelector(`ytd-two-column-browse-results-renderer`)??null}y(`feedFilters`,{start(e){if(fe(e)){if(N(e)){I(e);let t=me();t&&(x=new MutationObserver(t=>{let n=[];for(let e of t)for(let t of e.addedNodes)t instanceof Element&&n.push(t);R(e,n.length?n:void 0)}),x.observe(t,{childList:!0,subtree:!0}))}g(M(e),`autoHideUndoBar`)&&(w=setInterval(()=>{document.querySelectorAll(`yt-button-renderer #button[aria-label*="Undo"]`).forEach(e=>{let t=e.closest(`ytd-notification-action-renderer, tp-yt-paper-toast`);t&&(t.style.display=`none`)})},5e3))}},stop(){x?.disconnect(),x=null,C=null,S&&clearTimeout(S),S=null,L.clear(),w&&clearInterval(w),w=null,document.querySelectorAll(b).forEach(e=>e.style.removeProperty(`display`))}}),y(`redirectShorts`,{start(e){if(!g(M(e),`redirectShorts`))return;let t=()=>{let e=re(location.href);e&&location.replace(e)};t(),j=t,document.addEventListener(`yt-navigate-finish`,t)},stop(){j&&document.removeEventListener(`yt-navigate-finish`,j),j=null}});function z(e){k&&document.querySelector(`#movie_player`)?.contains(e.target)&&(e.preventDefault(),_(`wheel`,{deltaY:e.deltaY,...k}))}function B(e){e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||((e.key===`<`||e.key===`,`)&&_(`speedDelta`,{delta:-.25}),(e.key===`>`||e.key===`.`)&&_(`speedDelta`,{delta:.25}))}y(`player`,{start(e){let t=M(e);_(`applyPlayer`,{defaultSpeed:t.defaultSpeed,defaultQuality:t.defaultQuality,disableAutoplay:g(t,`disableAutoplay`),rememberVolume:g(t,`rememberVolume`),alwaysTheater:g(t,`alwaysTheater`)}),(g(t,`wheelVolume`)||g(t,`wheelSpeed`))&&(k={volume:g(t,`wheelVolume`),speed:g(t,`wheelSpeed`)},D||(D=!0,document.addEventListener(`wheel`,z,{passive:!1}))),g(t,`speedHotkeys`)&&!O&&(O=!0,document.addEventListener(`keydown`,B)),g(t,`shortsStopLoop`)&&document.querySelectorAll(`video`).forEach(e=>{e.loop&&(e.loop=!1,e.dataset.tbxYtLoop=`1`)})},stop(){k=null,D&&document.removeEventListener(`wheel`,z),D=!1,O&&document.removeEventListener(`keydown`,B),O=!1,document.querySelectorAll(`video[data-tbx-yt-loop]`).forEach(e=>{e.loop=!0,delete e.dataset.tbxYtLoop})}});function he(){_(`applyPlayer`,null),_(`clearSponsor`,null)}function V(){for(let e of document.querySelectorAll(`yt-confirm-dialog-renderer, tp-yt-paper-dialog`))le(e.textContent??``)&&e.querySelector(`#button, [aria-label*="Yes"], [aria-label*="Continue"]`)?.click()}y(`stillWatching`,{start(e){if(!g(M(e),`dismissStillWatching`))return;let t=document.querySelector(`ytd-app`)??document.body;T=new MutationObserver(()=>{E||=setTimeout(()=>{E=null,V()},de)}),T.observe(t,{childList:!0,subtree:!0}),V()},stop(){T?.disconnect(),T=null,E&&clearTimeout(E),E=null}}),y(`sponsor`,{start(e){if(!g(M(e),`sponsorBlock`))return;let t=new URLSearchParams(location.search).get(`v`);if(!t)return;let n=++A;chrome.runtime.sendMessage({type:`YT_SPONSOR_SEGMENTS`,videoId:t,categories:Array.isArray(M(e).sponsorCategories)?M(e).sponsorCategories:[]}).then(e=>{let t=e&&`ok`in e&&e.ok?e.data?.segments:void 0;t&&n===A&&_(`sponsorSegments`,t)}).catch(()=>{})},stop(){A++,_(`clearSponsor`,null)}}),y(`dislikes`,{start(e){if(!g(M(e),`returnDislikes`))return;let t=new URLSearchParams(location.search).get(`v`);t&&chrome.runtime.sendMessage({type:`YT_DISLIKES`,videoId:t}).catch(()=>{})},stop(){}});function ge(e){if(H(),e.state.enabled)for(let t of v.values())t.start(e)}function H(){for(let e of v.values())e.stop()}var _e=[`sponsor`,`dislikes`,`redirectShorts`,`player`,`feedFilters`,`stillWatching`];function U(e){if(e.state.enabled){for(let t of _e){let n=v.get(t);n?.stop(),n?.start(e)}N(e)&&I(e)}}var W=`toolbox-yt-css`,ve=`data-tbx-yt-active`,G=`data-tbx-yt-progress-theme`,K=`data-tbx-yt-progress-animated`,q=`data-tbx-yt-progress-effect`;function ye(e){let t=document.documentElement;t.setAttribute(ve,`true`);for(let r of n)r!==`gridMinPerRow`&&r!==`shortsMinPerRow`&&r!==`searchThumbSize`&&(e.values[r]===!0?t.setAttribute(h(r),`true`):t.removeAttribute(h(r)));let r=Number(e.values.gridMinPerRow??0);r>0?t.setAttribute(h(`gridMinPerRow`),String(r)):t.removeAttribute(h(`gridMinPerRow`));let i=Number(e.values.shortsMinPerRow??0);i>0?t.setAttribute(h(`shortsMinPerRow`),String(i)):t.removeAttribute(h(`shortsMinPerRow`));let a=String(e.values.searchThumbSize??`default`);a==="default"?t.removeAttribute(h(`searchThumbSize`)):t.setAttribute(h(`searchThumbSize`),a)}function J(e){e.removeAttribute(h(`progressOn`)),e.removeAttribute(G),e.removeAttribute(K),e.removeAttribute(q),e.removeAttribute(h(`scrubberEmoji`)),e.removeAttribute(h(`scrubberImage`));for(let t of[`--tbx-yt-progress-bar`,`--tbx-yt-progress-played`,`--tbx-yt-progress-height`,`--tbx-yt-scrubber-emoji`,`--tbx-yt-scrubber-image`,`--tbx-yt-scrubber-size`])e.style.removeProperty(t)}function be(e){let t=document.documentElement;if(!ee(e.values)){J(t);return}let n=String(e.values.progressTheme??`default`),r=String(e.values.progressBarColor??`#ff0000`),i=String(e.values.progressPlayedColor??`#cc0000`),a=Number(e.values.progressHeight??3),o=p(n),s=ne(n,r,i,a);for(let[e,n]of Object.entries(s))t.style.setProperty(e,n);t.setAttribute(h(`progressOn`),`true`),t.setAttribute(G,n),o?.animated?(t.setAttribute(K,`true`),o.effect?t.setAttribute(q,o.effect):t.removeAttribute(q)):(t.removeAttribute(K),t.removeAttribute(q));let c=String(e.values.progressScrubberEmoji??``).trim(),l=String(e.values.progressScrubberImage??``).trim();if(c)t.setAttribute(h(`scrubberEmoji`),`true`),t.style.setProperty(`--tbx-yt-scrubber-emoji`,`"${c.replace(/"/g,``)}"`),t.style.setProperty(`--tbx-yt-scrubber-size`,`22px`),t.removeAttribute(h(`scrubberImage`)),t.style.removeProperty(`--tbx-yt-scrubber-image`);else if(l&&te(l)){t.setAttribute(h(`scrubberImage`),`true`);let e=l.replace(/"/g,`\\"`);t.style.setProperty(`--tbx-yt-scrubber-image`,`url("${e}")`),t.style.setProperty(`--tbx-yt-scrubber-size`,`28px`),t.removeAttribute(h(`scrubberEmoji`)),t.style.removeProperty(`--tbx-yt-scrubber-emoji`)}else t.removeAttribute(h(`scrubberEmoji`)),t.removeAttribute(h(`scrubberImage`)),t.style.removeProperty(`--tbx-yt-scrubber-emoji`),t.style.removeProperty(`--tbx-yt-scrubber-image`),t.style.setProperty(`--tbx-yt-scrubber-size`,`14px`)}function xe(){if(document.getElementById(W))return;let e=document.createElement(`link`);e.id=W,e.rel=`stylesheet`,e.href=chrome.runtime.getURL(`sites/youtube/youtube.css`),document.head.appendChild(e)}function Se(e){if(!e.enabled){Y();return}xe(),ye(e),be(e),ge({state:e,onNavigate:()=>U({state:e,onNavigate:()=>{}})})}function Y(){H(),he();let e=document.documentElement;for(let t of[...e.attributes])t.name.startsWith(`data-tbx-yt-`)&&e.removeAttribute(t.name);J(e);let t=[];for(let n=0;n<e.style.length;n++){let r=e.style.item(n);r.startsWith(`--tbx-yt-`)&&t.push(r)}for(let n of t)e.style.removeProperty(n);document.getElementById(W)?.remove(),document.querySelectorAll(`ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer`).forEach(e=>e.style.removeProperty(`display`))}var X=null,Z=null;function Ce(e){if(!e||typeof e!=`object`)return null;let t=e;return t.values?t:null}function Q(e){let t=Ce(e);if(X=t,!t?.enabled){Y();return}Se(t)}function we(){X?.enabled&&(Z&&clearTimeout(Z),Z=setTimeout(()=>{Z=null,X?.enabled&&U({state:X,onNavigate:()=>{}})},80))}var $=window;$.__toolboxYtEnhancer||($.__toolboxYtEnhancer=!0,window===window.top&&(chrome.storage.local.get(`youtubeEnhancer`,e=>Q(e.youtubeEnhancer)),chrome.storage.onChanged.addListener((e,t)=>{t===`local`&&e.youtubeEnhancer&&Q(e.youtubeEnhancer.newValue)}),document.addEventListener(`yt-navigate-finish`,we)))})();