// ==========================================
// 🛑 YOUR GOOGLE SHEET CSV LINK
// ==========================================
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQi3wglj0KY9gukaN6oVdot2tKiUEWcfxXi_0ZSO3QUttnUz2UriGxceXnHk9Sm25I7L-7MwbPzK9Rt/pub?output=csv"; [cite: 184]

let allQuestions = [];
let currentPendingQuestions = [];
let currentTopicQuestions = []; [cite: 185]
let currentQuestionIndex = 0;
let score = 0;
let currentGrade = ''; 
let currentTopic = '';
let timerInterval; [cite: 186]
let secondsElapsed = 0;
let audioCtx;

// Helper to get column data regardless of exact header casing/naming
function getChapterName(q) {
    return q.Chapter_Number_Name || q.Topic || q.topic || ""; [cite: 186, 187]
}

function getViews() {
    return {
        loading: document.getElementById('loading-screen'),
        grade: document.getElementById('grade-view'),
        topic: document.getElementById('topic-view'),
        type: document.getElementById('type-view'),
        practice: document.getElementById('practice-view'),
        score: document.getElementById('score-view')
    }; [cite: 187, 188]
}

function showView(viewName) {
    const views = getViews(); [cite: 188]
    Object.values(views).forEach(v => { [cite: 189]
        if (v) v.classList.add('hidden');
    });
    if (views[viewName]) { [cite: 190]
        views[viewName].classList.remove('hidden');
    } [cite: 191]
}

function playSound(type) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)(); [cite: 191, 192]
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'correct') { [cite: 193]
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); [cite: 194]
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } else { [cite: 195]
        oscillator.type = 'sine'; 
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); [cite: 196]
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } [cite: 197]
}

function preloadImages(questionsArray) {
    questionsArray.forEach(q => {
        if (q.Image_URL && q.Image_URL.trim() !== '') {
            const img = new Image();
            img.onerror = function() {
                console.warn("Skipping broken database image link:", q.Image_URL);
            };
            img.src = q.Image_URL.trim(); [cite: 197, 198]
        }
    });
} [cite: 199]

function init() {
    document.getElementById('loading-screen').classList.remove('hidden');
    Papa.parse(GOOGLE_SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            allQuestions = results.data;
            if (allQuestions.length === 0) {
                document.getElementById('loading-screen').innerHTML = `<p class="text-red-600 font-bold text-2xl">Error: No questions found.</p>`; [cite: 199, 200]
                return;
            }
            preloadImages(allQuestions);
            showGrades();
        },
        error: function(error) {
            console.error("Database Error:", error);
            document.getElementById('loading-screen').innerHTML = `<p class="text-red-600 font-bold text-xl mt-4">Error loading database.</p>`; [cite: 200, 201]
        }
    });
} [cite: 202]

function showGrades() {
    document.getElementById('nav-back-grades').classList.add('hidden');
    document.getElementById('nav-back-topics').classList.add('hidden');
    
    const grades = [...new Set(allQuestions.map(q => q.Grade))]
        .filter(Boolean)
        .sort((a, b) => a - b);
    const container = document.getElementById('grade-buttons'); [cite: 202, 203]
    container.innerHTML = '';
    grades.forEach(grade => {
        const btn = document.createElement('button');
        btn.className = 'bg-white border-4 border-blue-500 text-blue-700 hover:bg-blue-50 font-extrabold text-3xl py-6 px-6 rounded-2xl shadow-md transition-transform hover:-translate-y-1';
        btn.innerText = `Grade ${grade}`;
        btn.onclick = () => showTopics(grade);
        container.appendChild(btn);
    });
    showView('grade'); [cite: 204]
}

function showTopics(selectedGrade) {
    document.getElementById('nav-back-grades').classList.remove('hidden');
    document.getElementById('nav-back-topics').classList.add('hidden');
    currentGrade = selectedGrade; 
    document.getElementById('selected-grade-title').innerText = `Grade ${selectedGrade} - Select Chapter`;
    const gradeQuestions = allQuestions.filter(q => q.Grade == selectedGrade); [cite: 204, 205]
    
    const topics = [...new Set(gradeQuestions.map(q => getChapterName(q)))].filter(Boolean).sort((a, b) => {
        return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
    });
    const container = document.getElementById('topic-buttons'); [cite: 205, 206]
    container.innerHTML = '';
    container.className = "grid grid-cols-1 md:grid-cols-2 gap-4 w-full";
    topics.forEach(topic => { [cite: 206, 207]
        const btn = document.createElement('button');
        btn.className = 'flex items-center text-left bg-white border-l-8 border-blue-600 border-t border-r border-b border-slate-200 hover:border-blue-500 hover:bg-blue-50 p-5 rounded-r-xl shadow-sm transition-all hover:scale-[1.02]';
        btn.innerHTML = `
            <div class="bg-blue-100 text-blue-700 rounded-lg p-3 mr-4">
                <i class="fas fa-book-open text-xl"></i>
            </div>
            <span class="font-bold text-xl text-slate-800">${topic}</span> [cite: 207, 208]
        `;
        btn.onclick = () => showQuestionTypes(topic, gradeQuestions.filter(q => getChapterName(q) === topic));
        container.appendChild(btn);
    });
    showView('topic'); [cite: 209]
}

function showQuestionTypes(topic, questionsForTopic) {
    document.getElementById('nav-back-grades').classList.add('hidden');
    document.getElementById('nav-back-topics').classList.remove('hidden');
    currentTopic = topic;
    currentPendingQuestions = questionsForTopic;
    document.getElementById('selected-topic-title').innerText = topic;
    const typeView = document.getElementById('type-view'); [cite: 209, 210]
    const oldBox = document.getElementById('worksheet-box');
    if (oldBox) oldBox.remove();
    const cleanTopic = topic.replace(/[:]/g, '') [cite: 210, 211]
                            .replace(/\s+/g, '-')
                            .replace(/-+/g, '-')
                            .trim();
    const safeFileName = `G${currentGrade}-${cleanTopic}`; [cite: 212]

    const worksheetDiv = document.createElement('div');
    worksheetDiv.id = 'worksheet-box';
    worksheetDiv.className = "mt-8 p-4 bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-xl flex items-center justify-between"; [cite: 213]
    worksheetDiv.innerHTML = `
        <div class="text-left">
            <h4 class="font-bold text-yellow-800 text-lg">Grade ${currentGrade} Worksheet</h4>
            <p class="text-yellow-700 text-sm">Download questions for ${topic}</p>
        </div>
        <a href="worksheets/${safeFileName}.pdf" download class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
            <i class="fas fa-file-pdf"></i> Download
        </a>
    `; [cite: 214, 215]
    typeView.appendChild(worksheetDiv);
    showView('type');
}

function startPracticeFilter(selectedType) {
    let filteredQuestions = currentPendingQuestions;
    if (selectedType !== 'ALL') { [cite: 215, 216]
        filteredQuestions = currentPendingQuestions.filter(q => {
            const qTypeRaw = q.Question_Type || q.question_type || q['Question Type'] || 'MCQ';
            const qType = String(qTypeRaw).toUpperCase().trim();
            return qType === selectedType || (selectedType === 'TF' && qType === 'T/F');
        });
    } [cite: 217]
    if (filteredQuestions.length === 0) {
        alert(`No ${selectedType} questions found for this chapter.`);
        return; [cite: 217, 218]
    }
    startPractice(filteredQuestions);
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0'); [cite: 218, 219]
    return `${m}:${s}`;
}

function updateTimerDisplay() {
    secondsElapsed++;
    document.getElementById('timer-display').innerText = `⏱️ ${formatTime(secondsElapsed)}`;
} [cite: 219, 220]

function startPractice(questions) {
    currentTopicQuestions = questions;
    currentQuestionIndex = 0;
    score = 0;
    clearInterval(timerInterval);
    secondsElapsed = 0;
    document.getElementById('timer-display').innerText = "⏱️ 00:00"; [cite: 220, 221]
    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateScoreDisplay();
    loadQuestion();
    showView('practice');
    const skipBtn = document.getElementById('skip-btn');
    if (skipBtn) skipBtn.onclick = nextQuestion;
    const prevBtn = document.getElementById('prev-btn'); [cite: 221, 222]
    if (prevBtn) {
        prevBtn.removeAttribute('onclick');
        prevBtn.onclick = function() { [cite: 222, 223]
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                loadQuestion(); [cite: 223, 224]
            } else {
                alert("You are already on the first question!");
            } [cite: 224, 225]
        };
    }
}

function quitPractice() {
    clearInterval(timerInterval);
    showQuestionTypes(currentTopic, currentPendingQuestions);
} [cite: 225, 226]

function loadQuestion() {
    const prevBtn = document.getElementById('prev-btn');
    if (prevBtn) { [cite: 226, 227]
        prevBtn.onclick = function() {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                loadQuestion(); [cite: 227, 228]
            } else {
                alert("You are already on the first question!");
            } [cite: 228, 229]
        };
    }    
    const q = currentTopicQuestions[currentQuestionIndex];
    
    // --- RESET VIEW STATE FOR IN-PLACE SWAP ---
    document.getElementById('feedback-container').classList.add('hidden'); [cite: 229, 230]
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('mascot-container').classList.remove('hidden'); // Show Mascot [cite: 230, 231]
    
    document.getElementById('progress-text').innerText = `Question ${currentQuestionIndex + 1} of ${currentTopicQuestions.length}`;
    document.getElementById('question-text').innerText = q.Question_Text; [cite: 231, 232]

    const imgElement = document.getElementById('question-image');
    if (q.Image_URL && q.Image_URL.trim() !== '') {
        imgElement.src = q.Image_URL.trim();
        imgElement.classList.remove('hidden'); [cite: 232, 233]
    } else {
        imgElement.classList.add('hidden'); 
    }

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = ''; [cite: 233, 234]
    const qTypeRaw = q.Question_Type || q.question_type || q['Question Type'] || 'MCQ';
    const qType = String(qTypeRaw).toUpperCase().trim();
    if (qType === 'MCQ') { [cite: 234, 235]
        optionsContainer.className = "grid grid-cols-1 sm:grid-cols-2 gap-4 w-full";
        [q.Option_A, q.Option_B, q.Option_C, q.Option_D].forEach(opt => { [cite: 235, 236]
            if (!opt) return; 
            const btn = document.createElement('button');
            btn.className = 'option-btn text-left bg-slate-50 border-4 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-2xl font-bold py-5 px-6 rounded-xl w-full';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(btn, opt, q.Correct_Answer, q.Explanation, 'MCQ');
            optionsContainer.appendChild(btn); [cite: 236, 237]
        });
    } else if (qType === 'TF' || qType === 'T/F') { [cite: 237, 238]
        optionsContainer.className = "grid grid-cols-1 sm:grid-cols-2 gap-4 w-full";
        ['True', 'False'].forEach(opt => { [cite: 238, 239]
            const btn = document.createElement('button');
            btn.className = 'option-btn text-center bg-slate-50 border-4 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-2xl font-bold py-5 px-6 rounded-xl w-full';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(btn, opt, q.Correct_Answer, q.Explanation, 'TF');
            optionsContainer.appendChild(btn);
        });
    } else if (qType === 'FIB') { [cite: 239, 240]
        optionsContainer.className = "block w-full";
        optionsContainer.innerHTML = `
            <input type="text" id="fib-input" placeholder="Type answer here..." class="w-full text-2xl font-bold py-5 px-6 rounded-xl border-4 border-slate-300 focus:border-blue-500 mb-4 text-center">
            <button id="fib-submit" class="w-full md:w-1/2 mx-auto block bg-blue-600 text-white font-bold py-4 rounded-xl text-xl">Submit</button>
        `; [cite: 240, 241]
        const input = document.getElementById('fib-input');
        const sub = document.getElementById('fib-submit');
        sub.onclick = () => checkAnswer(null, input.value, q.Correct_Answer, q.Explanation, 'FIB'); [cite: 242]
        input.addEventListener('keypress', (e) => { if(e.key === 'Enter') sub.click(); }); [cite: 243]
        setTimeout(() => input.focus(), 100);
    } [cite: 244]
}

function checkAnswer(selectedBtn, selectedText, correctText, explanation, qType) {
    const sel = String(selectedText).trim().toLowerCase();
    const cor = String(correctText).trim().toLowerCase();
    const isCorrect = sel === cor; [cite: 244, 245]

    if (qType === 'MCQ' || qType === 'TF') {
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = null;
            btn.classList.add('opacity-70');
            if (btn.innerText.trim().toLowerCase() === cor) {
                btn.classList.add('bg-green-100', 'border-green-500');
            }
        }); [cite: 245, 246]
    }

    // --- SWAP RUNTIME: HIDE MASCOT IMAGE INSTANTLY ---
    document.getElementById('mascot-container').classList.add('hidden');
    const fb = document.getElementById('feedback-container'); [cite: 246, 247]
    fb.classList.remove('hidden', 'bg-green-100', 'bg-red-100');
    
    if (isCorrect) {
        score++;
        updateScoreDisplay();
        playSound('correct');
        fb.classList.add('bg-green-100'); [cite: 247, 248]
        document.getElementById('feedback-message').innerText = '✅ Correct!';
    } else {
        playSound('incorrect');
        fb.classList.add('bg-red-100');
        document.getElementById('feedback-message').innerText = qType === 'FIB' ? `❌ Incorrect. Answer: ${correctText}` : '❌ Incorrect'; [cite: 248, 249]
    } [cite: 250]
    
    // Write out the content directly to your explanation node inside the swap zone
    document.getElementById('explanation-text').innerText = explanation ? `Explanation: ${explanation}` : ''; [cite: 250, 251]
    
    // Unhide the card elements in place
    fb.classList.remove('hidden');
    document.getElementById('next-btn').classList.remove('hidden');
} [cite: 251, 252]

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentTopicQuestions.length) loadQuestion();
    else showFinalScore(); [cite: 252, 253]
}

function updateScoreDisplay() {
    document.getElementById('current-score').innerText = `Score: ${score}`;
} [cite: 253]

function showFinalScore() {
    clearInterval(timerInterval);
    document.getElementById('final-score').innerText = score;
    document.getElementById('total-questions').innerText = currentTopicQuestions.length; [cite: 253, 254]
    document.getElementById('final-time').innerText = formatTime(secondsElapsed);
    showView('score');
    if (score === currentTopicQuestions.length && score > 0) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    } [cite: 254, 255]
}

function handleBackNavigation() {
    const v = getViews();
    if (!v.practice.classList.contains('hidden')) quitPractice();
    else if (!v.type.classList.contains('hidden')) showTopics(currentGrade); [cite: 255, 256]
    else if (!v.topic.classList.contains('hidden')) showGrades();
    else if (!v.score.classList.contains('hidden')) showTopics(currentGrade);
    else window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', init);
window.previousQuestion = function() { [cite: 256, 257]
    if (typeof currentQuestionIndex !== 'undefined' && currentQuestionIndex > 0) {
        currentQuestionIndex--;
        if (typeof loadQuestion === 'function') { [cite: 257, 258]
            loadQuestion();
        } [cite: 259]
    } else {
        alert("You are already on the first question!");
    } [cite: 259, 260]
};
