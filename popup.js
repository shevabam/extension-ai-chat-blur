document.addEventListener('DOMContentLoaded', () => {
    localizeHtmlPage();

    const SERVICES = [
        { key: 'chatgpt', label: 'ChatGPT' },
        { key: 'gemini', label: 'Gemini' },
        { key: 'claude', label: 'Claude' },
        { key: 'deepai', label: 'DeepAI' },
        { key: 'perplexity', label: 'Perplexity' }
    ];
    const toggles = {};
    const statuses = {};
    for (const { key } of SERVICES) {
        toggles[key] = document.getElementById(`toggle-${key}`);
        statuses[key] = document.getElementById(`status-${key}`);
    }

    const labels = {
        0: chrome.i18n.getMessage("service_disabled"),
        1: chrome.i18n.getMessage("service_enabled")
    }

    // Load preferences
    chrome.storage.sync.get(['aiChatBlur'], (result) => {
        const prefs = result.aiChatBlur || {};
        SERVICES.forEach(({ key }) => {
            toggles[key].checked = !!prefs[key];
            statuses[key].textContent = labels[+toggles[key].checked];
        });

        // Blur gauge
        const blurRange = document.getElementById('blur-range');
        const blurValue = document.getElementById('blur-value');
        const blurAmount = typeof prefs.blurAmount === 'number' ? prefs.blurAmount : 6;
        blurRange.value = blurAmount;
        blurValue.textContent = blurAmount;
        blurRange.addEventListener('input', (e) => {
            blurValue.textContent = blurRange.value;
        });
        blurRange.addEventListener('change', (e) => {
            chrome.storage.sync.get(['aiChatBlur'], (result2) => {
                const prefs2 = result2.aiChatBlur || {};
                prefs2.blurAmount = Number(blurRange.value);
                chrome.storage.sync.set({ aiChatBlur: prefs2 }, () => {
                    blurValue.textContent = blurRange.value;

                    // Notifie tous les tabs pour MAJ immédiate
                    chrome.tabs.query({}, (tabs) => {
                        for (const tab of tabs) {
                            // Gère les tabs sans content script injecté sans erreur visible
                            try {
                                const res = chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_BLUR_AMOUNT', blurAmount: Number(blurRange.value) });
                                if (res && typeof res.then === 'function') {
                                    res.catch(() => {});
                                }
                            } catch (e) {
                                
                            }
                        }
                    });
                });
            });
        });
    });

    // Gestion dynamique des toggles
    SERVICES.forEach(({ key }) => {
        toggles[key].addEventListener('change', () => {
            chrome.storage.sync.get(['aiChatBlur'], (result) => {
                const prefs = result.aiChatBlur || {};
                prefs[key] = toggles[key].checked;
                chrome.storage.sync.set({ aiChatBlur: prefs }, () => {
                    statuses[key].textContent = labels[+toggles[key].checked];
                });
            });
        });
    });

});


function localizeHtmlPage() {
    // Localize by replacing __MSG_***__ meta tags
    var objects = document.getElementsByTagName('html');
    for (var j = 0; j < objects.length; j++) {
        var obj = objects[j];

        var valStrH = obj.innerHTML.toString();
        var valNewH = valStrH.replace(/__MSG_(\w+)__/g, function(match, v1) {
            return v1 ? chrome.i18n.getMessage(v1) : "";
        });

        if(valNewH != valStrH) {
            obj.innerHTML = valNewH;
        }
    }
}