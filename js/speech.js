//#region Speech Recognition and Synthesis

let speechEnabled = false;
let selectedVoice = null;
let isListening = true;
let recognition = null;
let selectedLanguage = 'it-IT';
let micPermissionGranted = false;

function loadVoices() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '<option value="">Seleziona una voce</option>';

    const voices = window.speechSynthesis.getVoices();
    voices.forEach((voice, i) => {
        const option = new Option(`${voice.name} (${voice.lang})`, i);
        voiceSelect.add(option);
    });
}

// Gestisce l'attivazione/disattivazione della sintesi vocale
document.getElementById('speechCheckbox').addEventListener('change', function () {
    const voiceSelect = document.getElementById('voiceSelect');
    voiceSelect.disabled = !this.checked;
    speechEnabled = this.checked;
});

// Gestisce la selezione della voce
document.getElementById('voiceSelect').addEventListener('change', function () {
    const voices = window.speechSynthesis.getVoices();
    selectedVoice = voices[this.value];
});

// Toggle input vocale/tastiera
document.getElementById('toggleInput').addEventListener('click', function () {
    const input = document.getElementById('answerInput');
    const icon = document.getElementById('toggleIcon');

    inputEnabled = !inputEnabled;

    if (inputEnabled) {
        input.disabled = false;
        input.placeholder = "Scrivi la tua risposta...";
        icon.textContent = '🎤';
        input.classList.remove('input-disabled');
        disableVoiceInput(input, icon);
    } else {
        input.disabled = true;
        input.placeholder = "Modalità orale attiva";
        icon.textContent = '⌨️';
        input.classList.add('input-disabled');
        input.blur();
        document.getElementById('speechRecognitionDialog').showModal();
    }
});

// Gestisce la chiusura del dialog riconoscimento vocale
document.getElementById('speechRecognitionDialog').addEventListener('close', function (e) {
    const input = document.getElementById('answerInput');
    const icon = document.getElementById('toggleIcon');

    if (this.returnValue === 'confirm') {
        selectedLanguage = document.getElementById('languageSelect').value;
        enableVoiceInput(input, icon);
    } else {
        input.disabled = true;
        input.placeholder = "Modalità visualizzazione";
        icon.textContent = '⌨️';
        input.classList.add('input-disabled');
    }
});

async function requestPermanentMicPermission() {
    try {
        const result = await navigator.permissions.query({
            name: 'microphone'
        });
        console.log('Stato iniziale permesso:', result.state);

        if (result.state === 'granted') {
            console.log('Permesso microfono già concesso');
            return true;
        }

        if (result.state === 'prompt' || result.state === 'denied') {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true
            });
            stream.getTracks().forEach(track => track.stop());
            console.log('Nuovo permesso microfono concesso');
            return true;
        }

        result.onchange = function () {
            console.log('Stato permesso microfono cambiato a:', this.state);
        };

        return result.state === 'granted';
    } catch (err) {
        console.error('Errore nella richiesta del permesso:', err);
        return false;
    }
}

function disableVoiceInput(input, icon) {
    input.disabled = false;
    input.placeholder = "Scrivi la tua risposta...";
    icon.textContent = '🎤';
    input.classList.remove('input-disabled');
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
}

function startSpeechRecognition(input) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = selectedLanguage;

    recognition.onresult = function (event) {
        console.log('isListening:', isListening);

        if (!isListening) {
            console.log('Riconoscimento ignorato perché isListening è false');
            return;
        }

        const lastResult = event.results[event.results.length - 1];
        const lastTranscript = lastResult[0].transcript;
        console.log('Nuovo testo riconosciuto:', lastTranscript);

        if (lastTranscript.toLowerCase().includes('cancella risposta')) {
            console.log('Comando "cancella risposta" riconosciuto');
            input.value = '';
        } else {
            const oldValue = input.value;
            const newValue = oldValue + (oldValue ? " " : "") + lastTranscript;
            input.value = newValue;
            console.log('Nuovo valore input:', newValue);

            // Verifica progressiva della risposta
            if (checkAnswerProgressive(newValue, questions[currentQuestionIndex].answer)) {
                const feedback = document.getElementById('feedback');
                showFeedback(feedback, 'Corretto!', 'correct');
                setTimeout(() => {
                    currentQuestionIndex++;
                    if (currentQuestionIndex >= questions.length) {
                        currentQuestionIndex = 0;
                    }
                    showQuestion();
                }, 1000);
            }
        }
    };

    recognition.start();
}

async function enableVoiceInput(input, icon) {
    if (micPermissionGranted || await requestPermanentMicPermission()) {
        micPermissionGranted = true;
        input.disabled = true;
        input.placeholder = "Ascolto...";
        icon.textContent = '⌨️';
        input.classList.add('input-disabled');
        startSpeechRecognition(input);
    } else {
        alert('Per utilizzare il riconoscimento vocale è necessario consentire l\'accesso al microfono');
        input.disabled = false;
        input.placeholder = "Scrivi la tua risposta...";
        icon.textContent = '🎤';
        input.classList.remove('input-disabled');
    }
}

// Inizializza voci
if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

//#endregion
