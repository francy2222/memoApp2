//#region Variabili Globali
window.MemoApp = {
    questions: [],
    currentQuestionIndex: 0,
    waitingForCorrectTyping: false,
    expectedAnswer: '',
    
    // Tracking progresso per certificazione
    stats: {
        totalAnswered: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        sessionStart: new Date(),
        questionsHistory: []
    },
    
    // Configurazioni
    config: {
        useEdgeTTS: false,
        edgeVoice: 'it-IT-DiegoNeural',
        edgeSpeed: 1,
        edgePitch: 0,
        speechEnabled: false,
        selectedVoice: null,
        inputEnabled: true,
        recognition: null,
        selectedLanguage: 'it-IT',
        autoPlayEnabled: false,
        questionVoiceAuto: null,
        answerVoiceAuto: null,
        pauseSecondsAuto: 2
    }
};
//#endregion

//#region Inizializzazione
document.addEventListener('DOMContentLoaded', function() {
    console.log('MemoApp - Inizializzazione...');
    
    // Inizializza moduli
    initializeUI();
    initializeSpeech();
    initializeEdgeTTS();
    initializeCertificate();
    
    // Carica voci disponibili
    if (window.speechSynthesis) {
        speechSynthesis.onvoiceschanged = function() {
            loadVoices();
            loadVoicesForAutoPlay();
        };
        loadVoices();
        loadVoicesForAutoPlay();
    }
    
    // Gestione file XML
    document.getElementById('xmlFile').addEventListener('change', handleFileLoad);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    console.log('MemoApp - Pronta!');
});

function handleFileLoad(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, "text/xml");
            
            const xmlQuestions = xmlDoc.getElementsByTagName('ArrayOfDomanda')[0].children;
            MemoApp.questions = [];
            
            for (let i = 0; i < xmlQuestions.length; i++) {
                const domandaNode = xmlQuestions[i];
                const questionTextNode = domandaNode.getElementsByTagName('domanda')[0];
                const answerTextNode = domandaNode.getElementsByTagName('risposta')[0];
                const indexNode = domandaNode.getElementsByTagName('Index')[0];
                
                if (questionTextNode && answerTextNode && indexNode) {
                    const indexValue = indexNode.textContent;
                    if (indexValue !== '-1') {
                        MemoApp.questions.push({
                            question: questionTextNode.textContent,
                            answer: answerTextNode.textContent,
                            id: crypto.randomUUID ? crypto.randomUUID() : Date.now() + '_' + i
                        });
                    }
                }
            }
            
            if (MemoApp.questions.length > 0) {
                document.getElementById('quizContainer').classList.remove('hide');
                MemoApp.currentQuestionIndex = 0;
                MemoApp.waitingForCorrectTyping = false;
                showQuestion();
                document.getElementById('playButton').disabled = false;
                
                // Reset statistiche
                MemoApp.stats = {
                    totalAnswered: 0,
                    correctAnswers: 0,
                    wrongAnswers: 0,
                    sessionStart: new Date(),
                    questionsHistory: []
                };
            } else {
                alert('Nessuna domanda trovata nel file XML');
            }
        } catch (error) {
            console.error('Errore nel parsing del file XML:', error);
            alert('Errore nel caricamento del file XML');
        }
    };
    
    reader.readAsText(file);
}

function handleKeyboardShortcuts(e) {
    if (document.getElementById('quizContainer').classList.contains('hide')) {
        return;
    }
    
    switch(e.key) {
        case 'ArrowRight':
            nextQuestion();
            break;
        case 'ArrowLeft':
            prevQuestion();
            break;
        case 'ArrowUp':
            showAnswer();
            break;
    }
}
//#endregion

//#region Funzioni Helper Globali
function loadVoices() {
    const voiceSelect = document.getElementById('voiceSelect');
    if (!voiceSelect) return;
    
    voiceSelect.innerHTML = '<option value="">Seleziona una voce</option>';
    
    const voices = window.speechSynthesis.getVoices();
    
    // Priorità a voci Google italiano
    const googleItalian = voices.filter(v => v.lang.includes('it-IT') && v.name.includes('Google'));
    const otherItalian = voices.filter(v => v.lang.includes('it-IT') && !v.name.includes('Google'));
    const otherVoices = voices.filter(v => !v.lang.includes('it-IT'));
    
    [...googleItalian, ...otherItalian, ...otherVoices].forEach((voice, i) => {
        const option = new Option(`${voice.name} (${voice.lang})`, i);
        if (voice.name.includes('Google') && voice.lang.includes('it-IT')) {
            option.style.fontWeight = 'bold';
        }
        voiceSelect.add(option);
    });
}

function loadVoicesForAutoPlay() {
    const questionSelect = document.getElementById('questionVoiceSelect');
    const answerSelect = document.getElementById('answerVoiceSelect');
    const voices = window.speechSynthesis.getVoices();
    
    [questionSelect, answerSelect].forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">Seleziona una voce</option>';
        
        // Priorità a voci Google italiano
        const googleItalian = voices.filter(v => v.lang.includes('it-IT') && v.name.includes('Google'));
        const otherItalian = voices.filter(v => v.lang.includes('it-IT') && !v.name.includes('Google'));
        
        [...googleItalian, ...otherItalian].forEach((voice, i) => {
            const option = new Option(`${voice.name}`, i);
            if (voice.name.includes('Google')) {
                option.style.fontWeight = 'bold';
            }
            select.add(option);
        });
    });
}

// Esponi funzioni globali necessarie
window.showQuestion = showQuestion;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.showAnswer = showAnswer;
window.checkAnswer = checkAnswer;
//#endregion
