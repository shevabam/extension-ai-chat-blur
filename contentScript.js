const SERVICES = {
    chatgpt: {
        matcher: () => location.hostname.includes('chat.openai.com') || location.hostname.includes('chatgpt.com'),
        getItems: () => document.querySelectorAll('nav div[class^="group/sidebar"] a[class^="group __menu-item"]'),
        getContainer: () => document.querySelector('nav div[class^="group/sidebar"]'),
    },
    gemini: {
        matcher: () => location.hostname.includes('gemini.google.com'),
        getItems: () => document.querySelectorAll('.conversation-items-container'),
        getContainer: () => document.querySelector('.conversation-items-container')?.parentElement,
    },
    claude: {
        matcher: () => location.hostname.includes('claude.ai'),
        getItems: () => document.querySelectorAll('ul li a[href^="/chat/"]'),
        getContainer: () => {
            const first = document.querySelector('ul li a[href^="/chat/"]');
            return first ? first.closest('ul') : null;
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

function applyBlur(enable, service, blurAmount) {
    const items = getServiceItems(service);
    const blur = typeof blurAmount === 'number' ? blurAmount : 5;
    items.forEach(el => {
        if (enable) {
            el.style.filter = `blur(${blur}px)`;
            el.style.transition = 'filter 0.3s';
        } else {
            el.style.filter = '';
        }
    });
}

// Wrapper pour appliquer le blur avec la valeur stockée
function applyBlurFromStorage(service) {
    chrome.storage.sync.get(['aiChatBlur'], (result) => {
        const prefs = result.aiChatBlur || {};
        applyBlur(!!prefs[service], service, prefs.blurAmount);
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
            applyBlur(enabled, service, prefs.blurAmount);
        });
    });
    observer.observe(container, { childList: true, subtree: true });

    // Applique le flou immédiatement (pour les éléments déjà présents ou qui arrivent après un court délai)
    chrome.storage.sync.get(['aiChatBlur'], (result) => {
        const prefs = result.aiChatBlur || {};
        applyBlur(!!prefs[service], service);
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
        applyBlur(!!prefs[service], service);
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

