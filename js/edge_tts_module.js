/**
 * Edge TTS Module per MemoApp
 * @author Flejta & Claude
 * @version 1.0.0
 * @license MIT
 */

//#region Configurazione e Inizializzazione
const EdgeTTSModule = {
    // Configurazione Edge TTS
    config: {
        token: "6A5AA1D4EAFF4E9FB37E23D68491D6F4",
        version: "1-130.0.2849.68",
        baseUrl: "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1",
        defaultVoice: "it-IT-IsabellaNeural",
        defaultRate: "+0%",
        defaultPitch: "+0Hz",
        defaultVolume: "+0%",
        timeout: 10000
    },

    // Stato del modulo
    state: {
        isInitialized: false,
        currentSocket: null,
        isGenerating: false,
        audioCache: new Map(), // Cache opzionale per gli audio
        useCache: false, // Disabilitato di default, attivabile per performance
        currentRequestId: null
    },

    // Eventi personalizzati
    events: {
        onStart: null,
        onEnd: null,
        onBoundary: null,
        onError: null,
        onProgress: null
    },

    // Lista delle voci italiane disponibili
    voices: {
        "it-IT-IsabellaNeural": "Isabella (Donna)",
        "it-IT-DiegoNeural": "Diego (Uomo)", 
        "it-IT-ElsaNeural": "Elsa (Donna)",
        "it-IT-GiuseppeNeural": "Giuseppe (Uomo)"
    }
};
//#endregion

//#region Funzioni Principali
/**
 * Inizializza il modulo Edge TTS
 */
EdgeTTSModule.init = function(options = {}) {
    // Merge opzioni con configurazione default
    if (options.useCache !== undefined) {
        this.state.useCache = options.useCache;
    }
    
    if (options.defaultVoice && this.voices[options.defaultVoice]) {
        this.config.defaultVoice = options.defaultVoice;
    }

    // Registra eventi se forniti
    if (options.onStart) this.events.onStart = options.onStart;
    if (options.onEnd) this.events.onEnd = options.onEnd;
    if (options.onBoundary) this.events.onBoundary = options.onBoundary;
    if (options.onError) this.events.onError = options.onError;
    if (options.onProgress) this.events.onProgress = options.onProgress;

    this.state.isInitialized = true;
    console.log("[EdgeTTS] Modulo inizializzato", this.state.useCache ? "con cache" : "senza cache");
};

/**
 * Genera audio da testo usando Edge TTS
 * @param {string} text - Il testo da sintetizzare
 * @param {Object} options - Opzioni di sintesi
 * @returns {Promise<Blob>} - Blob audio MP3
 */
EdgeTTSModule.speak = async function(text, options = {}) {
    if (!this.state.isInitialized) {
        throw new Error("[EdgeTTS] Modulo non inizializzato. Chiama init() prima.");
    }

    // Parametri di sintesi
    const voice = options.voice || this.config.defaultVoice;
    const rate = options.rate || this.config.defaultRate;
    const pitch = options.pitch || this.config.defaultPitch;
    const volume = options.volume || this.config.defaultVolume;

    // Genera chiave cache
    const cacheKey = this.state.useCache ? 
        `${text}_${voice}_${rate}_${pitch}_${volume}` : null;

    // Controlla cache se abilitata
    if (this.state.useCache && this.state.audioCache.has(cacheKey)) {
        console.log("[EdgeTTS] Audio trovato in cache");
        const cachedBlob = this.state.audioCache.get(cacheKey);
        
        // Simula eventi per consistenza
        if (this.events.onStart) this.events.onStart();
        if (this.events.onEnd) setTimeout(() => this.events.onEnd(), 100);
        
        return cachedBlob;
    }

    // Genera nuovo audio
    try {
        this.state.isGenerating = true;
        if (this.events.onStart) this.events.onStart();

        const audioBlob = await this._generateAudio(text, voice, rate, pitch, volume);

        // Salva in cache se abilitata
        if (this.state.useCache && cacheKey) {
            this.state.audioCache.set(cacheKey, audioBlob);
            console.log(`[EdgeTTS] Audio salvato in cache (${this.state.audioCache.size} elementi)`);
        }

        return audioBlob;

    } catch (error) {
        console.error("[EdgeTTS] Errore generazione:", error);
        if (this.events.onError) this.events.onError(error);
        throw error;
    } finally {
        this.state.isGenerating = false;
    }
};

/**
 * Genera audio con WebSocket
 * @private
 */
EdgeTTSModule._generateAudio = function(text, voice, rate, pitch, volume) {
    return new Promise((resolve, reject) => {
        const requestId = this._generateRequestId();
        this.state.currentRequestId = requestId;

        // Prepara SSML
        const ssml = this._buildSSML(text, voice, rate, pitch, volume);
        
        // Crea WebSocket
        const wsUrl = `${this.config.baseUrl}?TrustedClientToken=${this.config.token}` +
                     `&ConnectionId=${requestId}`;
        
        const socket = new WebSocket(wsUrl);
        this.state.currentSocket = socket;
        
        const audioChunks = [];
        let timeoutId;

        // Gestione timeout
        const resetTimeout = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                socket.close();
                reject(new Error("[EdgeTTS] Timeout nella generazione audio"));
            }, this.config.timeout);
        };

        socket.onopen = () => {
            console.log("[EdgeTTS] Connessione WebSocket aperta");
            resetTimeout();
            
            // Invia configurazione
            const configMessage = this._buildConfigMessage();
            socket.send(configMessage);
            
            // Invia SSML
            const ssmlMessage = this._buildSSMLMessage(requestId, ssml);
            socket.send(ssmlMessage);
        };

        socket.onmessage = (event) => {
            resetTimeout();
            
            if (event.data instanceof Blob) {
                // Processa dati binari (audio)
                this._processAudioData(event.data, audioChunks);
            } else {
                // Processa messaggi di testo (eventi)
                this._processTextMessage(event.data, requestId);
            }
        };

        socket.onerror = (error) => {
            clearTimeout(timeoutId);
            console.error("[EdgeTTS] Errore WebSocket:", error);
            reject(error);
        };

        socket.onclose = () => {
            clearTimeout(timeoutId);
            this.state.currentSocket = null;
            
            if (audioChunks.length > 0) {
                // Crea blob MP3
                const audioBlob = new Blob(audioChunks, { type: "audio/mpeg" });
                console.log(`[EdgeTTS] Audio generato: ${(audioBlob.size / 1024).toFixed(2)} KB`);
                
                if (this.events.onEnd) this.events.onEnd();
                resolve(audioBlob);
            } else {
                reject(new Error("[EdgeTTS] Nessun dato audio ricevuto"));
            }
        };
    });
};
//#endregion

//#region Funzioni di Supporto
/**
 * Processa i dati audio ricevuti
 * @private
 */
EdgeTTSModule._processAudioData = function(data, audioChunks) {
    const reader = new FileReader();
    reader.onload = function() {
        const view = new Uint8Array(reader.result);
        
        // Cerca header "Path:audio\r\n"
        const headerEnd = this._findHeaderEnd(view);
        if (headerEnd > 0) {
            // Estrai solo i dati audio (salta header)
            const audioData = view.slice(headerEnd);
            if (audioData.length > 0) {
                audioChunks.push(audioData);
                
                // Notifica progresso
                if (this.events.onProgress) {
                    this.events.onProgress(audioChunks.length);
                }
            }
        }
    }.bind(this);
    reader.readAsArrayBuffer(data);
};

/**
 * Trova la fine dell'header nei dati binari
 * @private
 */
EdgeTTSModule._findHeaderEnd = function(view) {
    // Cerca sequenza "\r\n\r\n" che indica fine header
    for (let i = 0; i < view.length - 3; i++) {
        if (view[i] === 0x0d && view[i + 1] === 0x0a && 
            view[i + 2] === 0x0d && view[i + 3] === 0x0a) {
            return i + 4;
        }
    }
    return -1;
};

/**
 * Processa messaggi di testo (eventi)
 * @private
 */
EdgeTTSModule._processTextMessage = function(message, requestId) {
    // Parsing eventi boundary per tracking parole
    if (message.includes("word.boundary") && this.events.onBoundary) {
        const match = message.match(/"offset":(\d+).*?"text":"([^"]+)"/);
        if (match) {
            const offset = parseInt(match[1]);
            const word = match[2];
            this.events.onBoundary(word, offset);
        }
    }
    
    // Log altri eventi se debug abilitato
    if (message.includes("turn.start")) {
        console.log("[EdgeTTS] Inizio sintesi");
    } else if (message.includes("turn.end")) {
        console.log("[EdgeTTS] Fine sintesi");
    }
};

/**
 * Costruisce il messaggio SSML
 * @private
 */
EdgeTTSModule._buildSSML = function(text, voice, rate, pitch, volume) {
    // Escape caratteri XML
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    return `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" 
               xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="it-IT">
            <voice name="${voice}">
                <prosody rate="${rate}" pitch="${pitch}" volume="${volume}">
                    ${escapedText}
                </prosody>
            </voice>
        </speak>
    `.trim();
};

/**
 * Costruisce il messaggio di configurazione
 * @private
 */
EdgeTTSModule._buildConfigMessage = function() {
    const config = {
        context: {
            synthesis: {
                audio: {
                    metadataoptions: {
                        sentenceBoundaryEnabled: "false",
                        wordBoundaryEnabled: "true"
                    },
                    outputFormat: "audio-24khz-96kbitrate-mono-mp3"
                }
            }
        }
    };
    
    return `X-Timestamp:${new Date().toISOString()}\r\n` +
           `Content-Type:application/json; charset=utf-8\r\n` +
           `Path:speech.config\r\n\r\n` +
           JSON.stringify(config);
};

/**
 * Costruisce il messaggio SSML per WebSocket
 * @private
 */
EdgeTTSModule._buildSSMLMessage = function(requestId, ssml) {
    return `X-RequestId:${requestId}\r\n` +
           `Content-Type:application/ssml+xml\r\n` +
           `X-Timestamp:${new Date().toISOString()}\r\n` +
           `Path:ssml\r\n\r\n` +
           ssml;
};

/**
 * Genera ID richiesta univoco
 * @private
 */
EdgeTTSModule._generateRequestId = function() {
    const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    return uuid.replace(/-/g, '').toUpperCase();
};
//#endregion

//#region Funzioni Utility Pubbliche
/**
 * Ferma la sintesi in corso
 */
EdgeTTSModule.stop = function() {
    if (this.state.currentSocket) {
        this.state.currentSocket.close();
        this.state.currentSocket = null;
        console.log("[EdgeTTS] Sintesi fermata");
    }
    this.state.isGenerating = false;
};

/**
 * Pulisce la cache audio
 */
EdgeTTSModule.clearCache = function() {
    const size = this.state.audioCache.size;
    this.state.audioCache.clear();
    console.log(`[EdgeTTS] Cache pulita (${size} elementi rimossi)`);
};

/**
 * Abilita/disabilita cache
 */
EdgeTTSModule.setCacheEnabled = function(enabled) {
    this.state.useCache = enabled;
    if (!enabled) {
        this.clearCache();
    }
    console.log(`[EdgeTTS] Cache ${enabled ? 'abilitata' : 'disabilitata'}`);
};

/**
 * Ottieni lista voci disponibili
 */
EdgeTTSModule.getVoices = function() {
    return Object.entries(this.voices).map(([id, name]) => ({
        id: id,
        name: name,
        lang: 'it-IT'
    }));
};

/**
 * Testa la connessione Edge TTS
 */
EdgeTTSModule.test = async function() {
    try {
        console.log("[EdgeTTS] Test connessione...");
        const blob = await this.speak("Test connessione Edge TTS", {
            voice: this.config.defaultVoice
        });
        console.log("[EdgeTTS] Test completato con successo!");
        return blob;
    } catch (error) {
        console.error("[EdgeTTS] Test fallito:", error);
        throw error;
    }
};
//#endregion

// Esporta il modulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EdgeTTSModule;
}
