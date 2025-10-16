// quiz.js - Logica del quiz
//#region Quiz Functions

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

    // Gestione sintesi vocale
    if (speechEnabled && selectedVoice) {
        speechSynthesis.cancel();
        let textToRead = "";
        if (questionText.includes('url::')) {
            textToRead = questionText.split('url::')[0].trim();
        } else {
            textToRead = questionText;
        }
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
        speechSynthesis.speak(utterance);
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
        if (questions.length <= 1) {
            alert('Non puoi eliminare l\'ultima domanda del questionario');
            return;
        }

        questions.splice(currentQuestionIndex, 1);

        if (currentQuestionIndex >= questions.length) {
            currentQuestionIndex = questions.length - 1;
        }
        showQuestion();
    }
}

function randomizeQuestions() {
    if (questions.length > 0) {
        questions = shuffleArray([...questions]);
        currentQuestionIndex = 0;
        showQuestion();
    }
}

function reverseQuestions() {
    if (questions.length > 0) {
        questions = questions.reverse();
        currentQuestionIndex = 0;
        showQuestion();
    }
}

function restartQuiz() {
    if (questions.length > 0) {
        currentQuestionIndex = 0;
        waitingForCorrectTyping = false;
        expectedAnswer = '';
        showQuestion();
    }
}

function swapQuestionsAndAnswers() {
    questions.forEach(question => {
        let originalQuestion = question.question;
        let originalAnswer = question.answer;

        if (originalQuestion.includes('url::')) {
            const parts = originalQuestion.split('url::');
            question.answer = parts[0].trim();
            question.question = originalAnswer + ' url::' + parts[1];
        } else if (originalQuestion.includes('continue::')) {
            const parts = originalQuestion.split('continue::');
            const continuePart = 'continue::';
            originalQuestion = parts[0].trim();
        } else {
            question.question = originalAnswer;
            question.answer = originalQuestion;
        }
    });

    showQuestion();
}

//#endregion
