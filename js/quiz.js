// quiz.js - Logica del quiz con supporto Edge TTS
//#region Quiz Functions

// Variabile globale per il motore TTS (condivisa con altri file)
let currentTTSEngine = localStorage.getItem('ttsEngine') || 'google';

function showQuestion() {
    waitingForCorrectTyping = false;
    expectedAnswer = '';
    
    // Reset riconoscimento vocale se presente
    if (typeof currentQuestionTranscript !== 'undefined') {
        currentQuestionTranscript = '';
    }

    const questionText = questions[currentQuestionIndex].question;
    const questionElement = document.getElementById('questionText');
    const imageContainer = document.getElementById('imageContainer');
    const answerInput = document.getElementById('answerInput');
    const feedback = document.getElementById('feedback');

    // Pulisci l'immagine solo se non c'è continue::
    if (!questionText.includes('continue::') || questionText.includes('url::')) {
        imageContainer.innerHTML = '';
    }
    answerInput.value = '';
    feedback.innerHTML = '';

    if (questionText.includes('url::')) {
        const parts = questionText.split('url::');
        questionElement.textContent = parts[0].trim();
        const url = parts[1].trim();

        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            // Gestione video YouTube
            const videoContainer = document.createElement('div');
            videoContainer.style.position = 'relative';
            videoContainer.style.width = '100%';
            videoContainer.style.paddingTop = '56.25%'; // Aspect ratio 16:9

            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.top = '0';
            iframe.style.left = '0';
            iframe.style.width = '100%';
            iframe.style.height = '100%';

            // Converti URL in formato embed
            let videoId = '';
            if (url.includes('youtube.com/watch?v=')) {
                videoId = url.split('watch?v=')[1];
            } else if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1];
            }
            if (videoId.includes('&')) {
                videoId = videoId.split('&')[0];
            }

            iframe.src = `https://www.youtube.com/embed/${videoId}`;
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
            iframe.allowFullscreen = true;
            iframe.onload = () => {
                document.getElementById('questionText').scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            };

            videoContainer.appendChild(iframe);
            imageContainer.appendChild(videoContainer);
            addSizeControls(imageContainer);
        } else {
            // Gestione immagine
            const img = document.createElement('img');
            img.src = url;
            img.onerror = function () {
                this.style.display = 'none';
                console.log('Errore nel caricamento dell\'immagine');
            };
            imageContainer.appendChild(img);
            addSizeControls(imageContainer);
        }
    } else {
        questionElement.textContent = questionText;
    }

    // Gestione sintesi vocale - MODIFICATA PER SUPPORTARE EDGE TTS
    if (speechEnabled && selectedVoice) {
        let textToRead = "";
        if (questionText.includes('url::')) {
            textToRead = questionText.split('url::')[0].trim();
        } else {
            textToRead = questionText;
        }

        // Controlla quale motore TTS usare
        if (currentTTSEngine === 'edge' && typeof EdgeTTSModule !== 'undefined') {
            // USA EDGE TTS
            console.log('[Quiz] Usando Edge TTS per leggere domanda');
            
            // Ferma eventuali sintesi in corso
            if (typeof EdgeTTSModule.stop === 'function') {
                EdgeTTSModule.stop();
            }
            
            EdgeTTSModule.speak(textToRead, {
                voice: selectedVoice // selectedVoice contiene l'ID della voce Edge
            }).then(audioBlob => {
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                audio.onended = () => {
                    URL.revokeObjectURL(audioUrl);
                    
                    // Gestisci riconoscimento vocale se attivo
                    if (typeof isListening !== 'undefined' && !inputEnabled) {
                        isListening = true;
                        const input = document.getElementById('answerInput');
                        if (input) {
                            input.placeholder = "Ascolto...";
                        }
                        console.log('[Quiz] Edge TTS terminato, riconoscimento vocale attivato');
                    }
                };
                
                audio.onerror = (e) => {
                    console.error('[Quiz] Errore riproduzione audio Edge TTS:', e);
                };
                
                audio.play().catch(error => {
                    console.error('[Quiz] Errore play() Edge TTS:', error);
                });
                
            }).catch(error => {
                console.error('[Quiz] Errore Edge TTS:', error);
                // Fallback a Google TTS in caso di errore
                useFallbackGoogleTTS(textToRead);
            });
            
        } else {
            // USA GOOGLE TTS (codice originale)
            console.log('[Quiz] Usando Google TTS per leggere domanda');
            speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.voice = selectedVoice;

            const words = textToRead.trim().split(/\s+/).length;
            const estimatedDuration = words / 200 * 60 * 1000 + 300;

            utterance.onstart = function () {
                const input = document.getElementById('answerInput');
                input.placeholder = "Wait...";
                isListening = false;
                console.log('Sintesi vocale iniziata, isListening false');

                setTimeout(() => {
                    isListening = true;
                    input.placeholder = "Ascolto...";
                    console.log('isListening true');
                }, estimatedDuration);
            };
            
            utterance.onerror = function(e) {
                console.error('[Quiz] Errore Google TTS:', e);
            };
            
            speechSynthesis.speak(utterance);
        }
    }

    // Aggiorna il contatore
    document.getElementById('currentQuestionNum').textContent = currentQuestionIndex + 1;
    document.getElementById('totalQuestions').textContent = questions.length;

    // Gestione campo di feedback
    answerInput.value = '';
    feedback.innerHTML = '';
    feedback.className = 'feedback';

    answerInput.focus();
}

// Funzione di fallback per Google TTS
function useFallbackGoogleTTS(textToRead) {
    console.log('[Quiz] Fallback a Google TTS');
    if ('speechSynthesis' in window) {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(textToRead);
        
        // Trova una voce italiana
        const voices = speechSynthesis.getVoices();
        const italianVoice = voices.find(v => v.lang.includes('it-IT'));
        if (italianVoice) {
            utterance.voice = italianVoice;
        }
        
        utterance.lang = 'it-IT';
        speechSynthesis.speak(utterance);
    }
}

function checkAnswer() {
    const userAnswer = document.getElementById('answerInput').value.trim();
    const correctAnswer = questions[currentQuestionIndex].answer;
    const feedback = document.getElementById('feedback');
    const answerInput = document.getElementById('answerInput');

    if (waitingForCorrectTyping) {
        if (compareAnswers(userAnswer, expectedAnswer)) {
            currentQuestionIndex = 0;
            waitingForCorrectTyping = false;
            expectedAnswer = '';
            answerInput.value = '';
            showQuestion();
        } else {
            showFeedback(
                feedback,
                'Per favore, digita esattamente: <span class="correct-answer">' + expectedAnswer + '</span>',
                'incorrect'
            );
            if (!inputEnabled) {
                answerInput.value = '';
            }
        }
    } else {
        if (compareAnswers(userAnswer, correctAnswer)) {
            showFeedback(feedback, 'Corretto!', 'correct');
            answerInput.value = '';

            setTimeout(() => {
                currentQuestionIndex++;
                if (currentQuestionIndex >= questions.length) {
                    currentQuestionIndex = 0;
                    alert('Quiz completato! Ricominciamo dall\'inizio.');
                }
                showQuestion();
            }, 1000);
        } else {
            showFeedback(
                feedback,
                'Sbagliato! La risposta corretta è: <span class="correct-answer">' +
                correctAnswer + '</span><br>Per continuare, digitala correttamente.',
                'incorrect'
            );
            if (!inputEnabled) {
                answerInput.value = '';
            }
            waitingForCorrectTyping = true;
            expectedAnswer = correctAnswer;
        }
    }

    answerInput.focus();
    document.getElementById('questionText').scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        showQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        showQuestion();
    }
}

function showAnswer() {
    const feedback = document.getElementById('feedback');
    showFeedback(feedback, '<span class="correct-answer">' + questions[currentQuestionIndex].answer + '</span>', '');
}

function copyQuestion() {
    const questionText = questions[currentQuestionIndex].question;
    const cleanQuestion = questionText.includes('url::') ?
        questionText.split('url::')[0].trim() :
        questionText.trim();
    document.getElementById('answerInput').value = cleanQuestion;
}

function deleteQuestion() {
    if (confirm('Sei sicuro di voler eliminare questa domanda?')) {
        questions.splice(currentQuestionIndex, 1);
        if (questions.length === 0) {
            alert('Non ci sono più domande nel quiz.');
            document.getElementById('quizContainer').classList.add('hide');
        } else {
            if (currentQuestionIndex >= questions.length) {
                currentQuestionIndex = questions.length - 1;
            }
            showQuestion();
        }
    }
}

function randomizeQuestions() {
    for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
    }
    currentQuestionIndex = 0;
    showQuestion();
}

function restartQuiz() {
    currentQuestionIndex = 0;
    showQuestion();
}

function reverseQuestions() {
    questions.reverse();
    currentQuestionIndex = 0;
    showQuestion();
}

function swapQuestionsAndAnswers() {
    questions.forEach(q => {
        const temp = q.question;
        q.question = q.answer;
        q.answer = temp;
    });
    showQuestion();
}

//#endregion
