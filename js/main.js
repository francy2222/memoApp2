//#region Global Variables

let questions = [];
let currentQuestionIndex = 0;
let waitingForCorrectTyping = false;
let expectedAnswer = '';
let inputEnabled = true;

//#endregion

//#region File Loading

document.getElementById('xmlFile').addEventListener('change', function (e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, "text/xml");

            const xmlQuestions = xmlDoc.getElementsByTagName('ArrayOfDomanda')[0].children;
            questions = [];

            for (let i = 0; i < xmlQuestions.length; i++) {
                const domandaNode = xmlQuestions[i];
                const questionTextNode = domandaNode.getElementsByTagName('domanda')[0];
                const answerTextNode = domandaNode.getElementsByTagName('risposta')[0];
                const indexNode = domandaNode.getElementsByTagName('Index')[0];

                if (questionTextNode && answerTextNode && indexNode) {
                    const indexValue = indexNode.textContent;
                    if (indexValue !== '-1') {
                        questions.push({
                            question: questionTextNode.textContent,
                            answer: answerTextNode.textContent
                        });
                    }
                }
            }

            if (questions.length > 0) {
                document.getElementById('quizContainer').classList.remove('hide');
                currentQuestionIndex = 0;
                waitingForCorrectTyping = false;
                showQuestion();
                document.getElementById('playButton').disabled = false;
            } else {
                alert('Nessuna domanda trovata nel file XML');
            }
        } catch (error) {
            console.error('Errore nel parsing del file XML:', error);
            alert('Errore nel caricamento del file XML');
        }
    };

    reader.readAsText(file);
});

//#endregion

//#region Event Listeners

document.getElementById('checkButton').addEventListener('click', checkAnswer);
document.getElementById('nextButton').addEventListener('click', nextQuestion);
document.getElementById('prevButton').addEventListener('click', prevQuestion);
document.getElementById('showAnswerButton').addEventListener('click', showAnswer);
document.getElementById('copyQuestionButton').addEventListener('click', copyQuestion);
document.getElementById('deleteQuestionButton').addEventListener('click', deleteQuestion);
document.getElementById('randomizeButton').addEventListener('click', randomizeQuestions);
document.getElementById('restartButton').addEventListener('click', restartQuiz);
document.getElementById('reverseButton').addEventListener('click', reverseQuestions);
document.getElementById('swapQAButton').addEventListener('click', swapQuestionsAndAnswers);

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
    if (document.getElementById('quizContainer').classList.contains('hide')) {
        return;
    }

    switch (e.key) {
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
});

//#endregion
