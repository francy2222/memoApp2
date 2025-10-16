// autoplay.js - Riproduzione automatica
//#region Auto Play Functions

let autoPlayEnabled = false;
let questionVoiceAuto = null;
let answerVoiceAuto = null;
let pauseSecondsAuto = 2;

// Popola i menu delle voci per la lettura automatica
function loadVoicesForAutoPlay() {
    const questionSelect = document.getElementById('questionVoiceSelect');
    const answerSelect = document.getElementById('answerVoiceSelect');
    const voices = window.speechSynthesis.getVoices();

    [questionSelect, answerSelect].forEach(select => {
        select.innerHTML = '<option value="">Seleziona una voce</option>';
        voices.forEach((voice, i) => {
            const option = new Option(`${voice.name} (${voice.lang})`, i);
            select.add(option);
        });
    });
}

// Gestisce il click sul pulsante play/stop
document.getElementById('playButton').addEventListener('click', function () {
    const dialog = document.getElementById('voiceSettingsDialog');
    const playIcon = document.getElementById('playIcon');

    if (autoPlayEnabled) {
        stopAutoPlay();
        return;
    }

    console.log('Opening dialog...');
    try {
        if (typeof dialog.showModal === "function") {
            const speechCheckbox = document.getElementById('speechCheckbox');
            if (speechCheckbox.checked) {
                speechCheckbox.checked = false;
                document.getElementById('voiceSelect').disabled = true;
                speechEnabled = false;
            }
            dialog.showModal();
        } else {
            console.log('showModal is not supported');
            alert('Il tuo browser non supporta le finestre di dialogo native');
        }
    } catch (error) {
        console.error('Error showing dialog:', error);
        alert('Errore nell\'apertura della finestra di dialogo');
    }
});

// Gestione conferma dialog
document.getElementById('voiceSettingsDialog').addEventListener('close', function (e) {
    console.log('Dialog closed, returnValue:', this.returnValue);
    if (this.returnValue === '') {
        console.log('Dialog cancelled');
        return;
    }

    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices);

    questionVoiceAuto = voices[document.getElementById('questionVoiceSelect').value];
    answerVoiceAuto = voices[document.getElementById('answerVoiceSelect').value];
    pauseSecondsAuto = parseInt(document.getElementById('pauseSeconds').value);

    console.log('Selected voices and pause:', {
        questionVoice: questionVoiceAuto,
        answerVoice: answerVoiceAuto,
        pause: pauseSecondsAuto
    });

    startAutoPlay();
});

function startAutoPlay() {
    console.log('Starting auto play...');
    autoPlayEnabled = true;
    document.getElementById('playIcon').textContent = '⏹️';
    console.log('Auto play enabled:', autoPlayEnabled);
    readQuestionAndAnswerAuto();
}

function stopAutoPlay() {
    autoPlayEnabled = false;
    document.getElementById('playIcon').textContent = '▶️';
    speechSynthesis.cancel();
}

function readQuestionAndAnswerAuto() {
    console.log('Attempting to read question and answer...');
    if (!autoPlayEnabled) {
        console.log('Auto play is disabled, returning');
        return;
    }

    const currentQuestion = questions[currentQuestionIndex];
    console.log('Current question:', currentQuestion);

    let questionText = currentQuestion.question;
    if (questionText.includes('url::')) {
        questionText = questionText.split('url::')[0].trim();
    }
    console.log('Question text to read:', questionText);

    // Leggi la domanda
    const questionUtterance = new SpeechSynthesisUtterance(questionText);
    questionUtterance.voice = questionVoiceAuto;

    // Quando finisce la domanda, mostra e leggi la risposta
    questionUtterance.onend = function () {
        console.log('Question reading finished');
        setTimeout(() => {
            if (!autoPlayEnabled) return;

            // Mostra la risposta
            showAnswer();

            // Leggi la risposta
            const answerUtterance = new SpeechSynthesisUtterance(currentQuestion.answer);
            answerUtterance.voice = answerVoiceAuto;

            // Quando finisce la risposta, passa alla prossima domanda
            answerUtterance.onend = function () {
                console.log('Answer reading finished');
                setTimeout(() => {
                    if (!autoPlayEnabled) return;

                    if (currentQuestionIndex < questions.length - 1) {
                        currentQuestionIndex++;
                        showQuestion();
                        readQuestionAndAnswerAuto();
                    } else {
                        currentQuestionIndex = 0;
                        showQuestion();
                        readQuestionAndAnswerAuto();
                    }
                }, 2000);
            };

            speechSynthesis.speak(answerUtterance);
        }, pauseSecondsAuto * 1000);
    };

    speechSynthesis.speak(questionUtterance);
}

// Inizializza le voci
if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = function () {
        loadVoicesForAutoPlay();
    };
    loadVoicesForAutoPlay();
}

//#endregion
