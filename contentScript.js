const SERVICES = {
    chatgpt: {
        matcher: () => location.hostname.includes('chat.openai.com') || location.hostname.includes('chatgpt.com'),
        getItems: () => document.querySelectorAll('nav div[class^="group/sidebar"] a[class^="group __menu-item"]'),
        getContainer: () => document.querySelector('nav div[class^="group/sidebar"]'),
    },
    gemini: {
        matcher: () => location.hostname.includes('gemini.google.com'),
        getItems: () => document.querySelectorAll('gem-nav-list-item[data-test-id="conversation"]'),
        getContainer: () => document.querySelector('mat-nav-list[gem-sidenav-list]'),
    },
    claude: {
        matcher: () => location.hostname.includes('claude.ai'),
        getItems: () => document.querySelectorAll('div[data-row-key^="chat:"] a[href^="/chat/"]'),
        getContainer: () => {
            const first = document.querySelector('div[data-row-key^="chat:"] a[href^="/chat/"]');
            return first ? first.closest('div[data-row-key^="chat:"]')?.parentElement : null;
        }
    },
    deepai: {
        matcher: () => location.hostname.includes('deepai.org'),
        getItems: () => document.querySelectorAll('.chat-history-item-wrapper .chat-history-item'),
        getContainer: () => document.querySelector('.chat-history-item-wrapper'),
    },
    perplexity: {
        matcher: () => location.hostname.includes('perplexity.ai'),
        getItems: () => document.querySelectorAll('.group\\/history a[href^="/search/"]'),
        getContainer: () => document.querySelector('.group\\/history'),
    }
};

function getActiveService() {
    for (const [key, svc] of Object.entries(SERVICES)) {
        if (svc.matcher()) return key;
    }
    return null;
}

function getServiceItems(service) {
    return SERVICES[service]?.getItems() || [];
}

const BLUR_STYLE_ID = 'ai-chat-blur-style';
const BLUR_CLASS = 'ai-chat-blur-item';
const HOVER_REVEAL_CLASS = 'ai-chat-blur-hover-reveal';

// Injecte une seule fois la feuille de style qui gère le flou et le hover-to-reveal en CSS pur
function ensureBlurStylesheet() {
    if (document.getElementById(BLUR_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = BLUR_STYLE_ID;
    style.textContent = `
        .${BLUR_CLASS} { filter: blur(var(--ai-chat-blur-amount, 5px)); transition: filter 0.3s; }
        .${BLUR_CLASS}.${HOVER_REVEAL_CLASS}:hover { filter: none; }
    `;
    document.head.appendChild(style);
}

function applyBlur(enable, service, blurAmount, hoverReveal) {
    const items = getServiceItems(service);
    const blur = typeof blurAmount === 'number' ? blurAmount : 5;
    items.forEach(el => {
        if (enable) {
            ensureBlurStylesheet();
            el.style.setProperty('--ai-chat-blur-amount', `${blur}px`);
            el.classList.add(BLUR_CLASS);
            el.classList.toggle(HOVER_REVEAL_CLASS, !!hoverReveal);
        } else {
            el.classList.remove(BLUR_CLASS, HOVER_REVEAL_CLASS);
            el.style.removeProperty('--ai-chat-blur-amount');
        }
    });
}

// Wrapper pour appliquer le blur avec la valeur stockée
function applyBlurFromStorage(service) {
    chrome.storage.sync.get(['aiChatBlur'], (result) => {
        const prefs = result.aiChatBlur || {};
        applyBlur(!!prefs[service], service, prefs.blurAmount, prefs.hoverReveal);
    });
}


// Observe l'apparition du conteneur cible (sidebar ou liste Gemini)
function waitForContainerAndObserve(callback, service) {
    const getContainer = SERVICES[service]?.getContainer;
    let lastContainer = null;
    function observeContainer() {
        const container = getContainer();
        if (container && container !== lastContainer) {
            lastContainer = container;
            callback(container);
        }
    }
    observeContainer();
    // Observe le body pour détecter le remplacement du container (ex: clic "new chat" sur DeepAI)
    const bodyObserver = new MutationObserver(() => {
        observeContainer();
    });
    bodyObserver.observe(document.body, { childList: true, subtree: true });
}

// Observe les changements dans la liste des chats/conversations
function observeItems(container, service) {
    let lastBlurState = null;
    // Réapplique le flou à chaque mutation (ajout/suppression d'item)
    const observer = new MutationObserver(() => {
        chrome.storage.sync.get(['aiChatBlur'], (result) => {
            const prefs = result.aiChatBlur || {};
            const enabled = !!prefs[service];
            if (enabled !== lastBlurState) {
                lastBlurState = enabled;
            }
            applyBlur(enabled, service, prefs.blurAmount, prefs.hoverReveal);
        });
    });
    observer.observe(container, { childList: true, subtree: true });

    // Applique le flou immédiatement (pour les éléments déjà présents ou qui arrivent après un court délai)
    chrome.storage.sync.get(['aiChatBlur'], (result) => {
        const prefs = result.aiChatBlur || {};
        applyBlur(!!prefs[service], service, prefs.blurAmount, prefs.hoverReveal);
    });
}

function syncBlurFromStorageAndApply(service) {
    chrome.storage.sync.get(['aiChatBlur'], (result) => {
        const prefs = result.aiChatBlur || {};
        applyBlur(!!prefs[service], service);
    });
}

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.aiChatBlur) {
        const service = getActiveService();
        if (!service) return;
        const prefs = changes.aiChatBlur.newValue || {};
        applyBlur(!!prefs[service], service, prefs.blurAmount, prefs.hoverReveal);
    }
});

// Initialisation
const service = getActiveService();
if (service) {
    waitForContainerAndObserve((container) => {
        applyBlurFromStorage(service);
        observeItems(container, service);
    }, service);
}

