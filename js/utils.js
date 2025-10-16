// utils.js - Funzioni utilità
//#region Utility Functions

function normalizeText(text) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function cleanText(text) {
    return text.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"\s]/g, '');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function compareAnswers(userAnswer, correctAnswer) {
    const ignoreCase = document.getElementById('ignoreCaseCheckbox').checked;
    const ignoreFormatting = document.getElementById('ignoreFormattingCheckbox').checked;

    let processedUserAnswer = userAnswer;
    let processedCorrectAnswer = correctAnswer;

    if (ignoreFormatting) {
        processedUserAnswer = cleanText(normalizeText(processedUserAnswer));
        processedCorrectAnswer = cleanText(normalizeText(processedCorrectAnswer));
    }

    if (ignoreCase) {
        processedUserAnswer = processedUserAnswer.toLowerCase();
        processedCorrectAnswer = processedCorrectAnswer.toLowerCase();
    }

    return processedUserAnswer === processedCorrectAnswer;
}

function fuzzyMatch(str1, str2) {
    // Implementazione dell'algoritmo di Levenshtein Distance
    const a = str1.toLowerCase();
    const b = str2.toLowerCase();
    const costs = [];

    for (let i = 0; i <= a.length; i++) {
        costs[i] = [i];
    }
    for (let j = 0; j <= b.length; j++) {
        costs[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            if (a.charAt(i - 1) === b.charAt(j - 1)) {
                costs[i][j] = costs[i - 1][j - 1];
            } else {
                costs[i][j] = Math.min(
                    costs[i - 1][j] + 1, // deletion
                    costs[i][j - 1] + 1, // insertion
                    costs[i - 1][j - 1] + 1 // substitution
                );
            }
        }
    }

    // Calcola percentuale di similarità
    const maxLength = Math.max(a.length, b.length);
    const similarity = 1 - (costs[a.length][b.length] / maxLength);
    return similarity;
}

function checkAnswerProgressive(userAnswer, correctAnswer) {
    // 1. Controllo esatto (già esistente)
    if (compareAnswers(userAnswer, correctAnswer)) {
        return true;
    }

    // 2. Fuzzy matching
    const similarity = fuzzyMatch(userAnswer, correctAnswer);
    if (similarity > 0.85) { // 85% di similarità
        return true;
    }

    // 3. Controllo parole chiave
    const keywords = correctAnswer.toLowerCase().split(' ');
    const userWords = userAnswer.toLowerCase().split(' ');
    const matchedKeywords = keywords.filter(keyword =>
        userWords.some(userWord => fuzzyMatch(keyword, userWord) > 0.9)
    );
    if (matchedKeywords.length >= keywords.length * 0.8) { // 80% delle parole chiave
        return true;
    }

    return false;
}

function showFeedback(element, content, type) {
    element.innerHTML = content;
    element.className = `feedback ${type} visible`;
}

function addSizeControls(container) {
    const controls = document.createElement('div');
    controls.className = 'size-controls';

    const decreaseBtn = document.createElement('button');
    decreaseBtn.className = 'size-btn';
    decreaseBtn.innerHTML = '−';
    decreaseBtn.title = 'Riduci dimensione';

    const increaseBtn = document.createElement('button');
    increaseBtn.className = 'size-btn';
    increaseBtn.innerHTML = '+';
    increaseBtn.title = 'Aumenta dimensione';

    controls.appendChild(decreaseBtn);
    controls.appendChild(increaseBtn);
    container.appendChild(controls);

    const content = container.querySelector('img, iframe');
    let currentSize = 100;

    increaseBtn.onclick = (e) => {
        e.stopPropagation();
        currentSize += 10;
        content.style.width = `${currentSize}%`;
        if (content.tagName === 'IFRAME') {
            content.style.height = `${(currentSize * 9) / 16}vw`;
        }
    };

    decreaseBtn.onclick = (e) => {
        e.stopPropagation();
        if (currentSize > 20) {
            currentSize -= 10;
            content.style.width = `${currentSize}%`;
            if (content.tagName === 'IFRAME') {
                content.style.height = `${(currentSize * 9) / 16}vw`;
            }
        }
    };
}

//#endregion
