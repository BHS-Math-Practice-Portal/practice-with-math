// ==========================================
// 🛑 YOUR GOOGLE SHEET CSV LINK
// ==========================================
const GOOGLE_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQi3wglj0KY9gukaN6oVdot2tKiUEWcfxXi_0ZSO3QUttnUz2UriGxceXnHk9Sm25I7L-7MwbPzK9Rt/pub?output=csv"; 

let allQuestions = [];
let currentPendingQuestions = [];
let currentTopicQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let currentGrade = ''; 
let currentTopic = '';

let timerInterval;
let secondsElapsed = 0;
let audioCtx;

// Helper to get column data regardless of exact header casing/naming
function getChapterName(q) {
    return q.Chapter_Number_Name || q.Topic || q.topic || "";
}

function getViews() {
    return {
        loading: document.getElementById('loading-screen'),
        grade: document.getElementById('grade-view'),
        topic: document.getElementById('topic-view'),
        type: document.getElementById('type-view'),
        practice: document.getElementById('practice-view'),
        score: document.getElementById('score-view')
    };
}

function showView(viewName) {
    const views = getViews();
    Object.values(views).forEach(v => {
        if (v) v.classList.add('hidden');
    });
    if (views[viewName]) {
        views[viewName].classList.remove('hidden');
    }
}

function playSound(type) {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'correct') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } else {
        oscillator.type = 'sine'; 
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    }
}

function preloadImages(questionsArray) {
    questionsArray.forEach(q => {
        if (q.Image_URL && q.Image_URL.trim() !== '') {
            const img = new Image();
            img.src = q.Image_URL.trim(); 
        }
    });
}

function init() {
    document.getElementById('loading-screen').classList.remove('hidden');
    Papa.parse(GOOGLE_SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            allQuestions = results.data;
            if (allQuestions.length === 0) {
                document.getElementById('loading-screen').innerHTML = `<p class="text-red-600 font-bold text-2xl">Error: No questions found.</p>`;
                return;
            }
            preloadImages(allQuestions);
            showGrades();
        },
        error: function(error) {
            console.error("Database Error:", error);
            document.getElementById('loading-screen').innerHTML = `<p class="text-red-600 font-bold text-xl mt-4">Error loading database.</p>`;
        }
    });
}

function showGrades() {
    document.getElementById('nav-back-grades').classList.add('hidden');
    document.getElementById('nav-back-topics').classList.add('hidden');
    
    const grades = [...new Set(allQuestions.map(q => q.Grade))]
        .filter(Boolean)
        .sort((a, b) => a - b);    
        
    const container = document.getElementById('grade-buttons');
    container.innerHTML = '';
    grades.forEach(grade => {
        const btn = document.createElement('button');
        btn.className = 'bg-white border-4 border-blue-500 text-blue-700 hover:bg-blue-50 font-extrabold text-3xl py-6 px-6 rounded-2xl shadow-md transition-transform hover:-translate-y-1';
        btn.innerText = `Grade ${grade}`;
        btn.onclick = () => showTopics(grade);
        container.appendChild(btn);
    });
    showView('grade');
}

function showTopics(selectedGrade) {
    document.getElementById('nav-back-grades').classList.remove('hidden');
    document.getElementById('nav-back-topics').classList.add('hidden');
    currentGrade = selectedGrade; 
    document.getElementById('selected-grade-title').innerText = `Grade ${selectedGrade} - Select Chapter`;
    
    const gradeQuestions = allQuestions.filter(q => q.Grade == selectedGrade);
    
    // Use the helper to find unique chapters
    const topics = [...new Set(gradeQuestions.map(q => getChapterName(q)))].filter(Boolean).sort((a, b) => {
        return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
    });   
    
    const container = document.getElementById('topic-buttons');
    container.innerHTML = '';
    container.className = "grid grid-cols-1 md:grid-cols-2 gap-4 w-full";

    topics.forEach(topic => {
        const btn = document.createElement('button');
        btn.className = 'flex items-center text-left bg-white border-l-8 border-blue-600 border-t border-r border-b border-slate-200 hover:border-blue-500 hover:bg-blue-50 p-5 rounded-r-xl shadow-sm transition-all hover:scale-[1.02]';
        btn.innerHTML = `
            <div class="bg-blue-100 text-blue-700 rounded-lg p-3 mr-4">
                <i class="fas fa-book-open text-xl"></i>
            </div>
            <span class="font-bold text-xl text-slate-800">${topic}</span>
        `;
        btn.onclick = () => showQuestionTypes(topic, gradeQuestions.filter(q => getChapterName(q) === topic));
        container.appendChild(btn);
    });
    showView('topic');
}

function showQuestionTypes(topic, questionsForTopic) {
    document.getElementById('nav-back-grades').classList.add('hidden');
    document.getElementById('nav-back-topics').classList.remove('hidden');
    currentTopic = topic;
    currentPendingQuestions = questionsForTopic;
    document.getElementById('selected-topic-title').innerText = topic;

    // Handle Worksheet Box
    const typeView = document.getElementById('type-view');
    const oldBox = document.getElementById('worksheet-box');
    if (oldBox) oldBox.remove();

    const safeFileName = topic.replace(/\s+/g, '_').replace(/:/g, ''); 
    const worksheetDiv = document.createElement('div');
    worksheetDiv.id = 'worksheet-box';
    worksheetDiv.className = "mt-8 p-4 bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-xl flex items-center justify-between";
    worksheetDiv.innerHTML = `
        <div class="text-left">
            <h4 class="font-bold text-yellow-800 text-lg">Chapter Worksheet</h4>
            <p class="text-yellow-700 text-sm">Download questions for offline study.</p>
        </div>
        <a href="worksheets/${safeFileName}.pdf" download class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
            <i class="fas fa-file-pdf"></i> Download
        </a>
    `;
    typeView.appendChild(worksheetDiv);
    showView('type');
}

function startPracticeFilter(selectedType) {
    let filteredQuestions = currentPendingQuestions;
    if (selectedType !== 'ALL') {
        filteredQuestions = currentPendingQuestions.filter(q => {
            const qTypeRaw = q.Question_Type || q.question_type || q['Question Type'] || 'MCQ';
            const qType = String(qTypeRaw).toUpperCase().trim();
            return qType === selectedType || (selectedType === 'TF' && qType === 'T/F');
        });
    }
    if (filteredQuestions.length === 0) {
        alert(`No ${selectedType} questions found for this chapter.`);
        return;
    }
    startPractice(filteredQuestions);
}

function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateTimerDisplay() {
    secondsElapsed++;
    document.getElementById('timer-display').innerText = `⏱️ ${formatTime(secondsElapsed)}`;
}

function startPractice(questions) {
    currentTopicQuestions = questions;
    currentQuestionIndex = 0;
    score = 0;
    clearInterval(timerInterval);
    secondsElapsed = 0;
    document.getElementById('timer-display').innerText = "⏱️ 00:00";
    timerInterval = setInterval(updateTimerDisplay, 1000);
    updateScoreDisplay();
    loadQuestion();
    showView('practice');
}

function quitPractice() {
    clearInterval(timerInterval);
    showQuestionTypes(currentTopic, currentPendingQuestions);
}

function loadQuestion() {
    const q = currentTopicQuestions[currentQuestionIndex];
    document.getElementById('feedback-container').classList.add('hidden');
    document.getElementById('next-btn').classList.add('hidden');
    document.getElementById('progress-text').innerText = `Question ${currentQuestionIndex + 1} of ${currentTopicQuestions.length}`;
    document.getElementById('question-text').innerText = q.Question_Text;

    const imgElement = document.getElementById('question-image');
    if (q.Image_URL && q.Image_URL.trim() !== '') {
        imgElement.src = q.Image_URL.trim(); 
        imgElement.classList.remove('hidden'); 
    } else {
        imgElement.classList.add('hidden'); 
    }

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    const qTypeRaw = q.Question_Type || q.question_type || q['Question Type'] || 'MCQ';
    const qType = String(qTypeRaw).toUpperCase().trim();

    if (qType === 'MCQ') {
        [q.Option_A, q.Option_B, q.Option_C, q.Option_D].forEach(opt => {
            if (!opt) return; 
            const btn = document.createElement('button');
            btn.className = 'option-btn text-left bg-slate-50 border-4 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-2xl font-bold py-5 px-6 rounded-xl w-full';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(btn, opt, q.Correct_Answer, q.Explanation, 'MCQ');
            optionsContainer.appendChild(btn);
        });
    } else if (qType === 'TF' || qType === 'T/F') {
        ['True', 'False'].forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn text-center bg-slate-50 border-4 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-2xl font-bold py-5 px-6 rounded-xl w-full';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(btn, opt, q.Correct_Answer, q.Explanation, 'TF');
            optionsContainer.appendChild(btn);
        });
    } else if (qType === 'FIB') {
        optionsContainer.innerHTML = `
            <input type="text" id="fib-input" placeholder="Type answer here..." class="w-full text-2xl font-bold py-5 px-6 rounded-xl border-4 border-slate-300 focus:border-blue-500 mb-4 text-center">
            <button id="fib-submit" class="w-full md:w-1/2 mx-auto block bg-blue-600 text-white font-bold py-4 rounded-xl text-xl">Submit</button>
        `;
        const input = document.getElementById('fib-input');
        const sub = document.getElementById('fib-submit');
        sub.onclick = () => checkAnswer(null, input.value, q.Correct_Answer, q.Explanation, 'FIB');
        input.addEventListener('keypress', (e) => { if(e.key === 'Enter') sub.click(); });
        setTimeout(() => input.focus(), 100);
    }
}

function checkAnswer(selectedBtn, selectedText, correctText, explanation, qType) {
    const sel = String(selectedText).trim().toLowerCase();
    const cor = String(correctText).trim().toLowerCase();
    const isCorrect = sel === cor;

    if (qType === 'MCQ' || qType === 'TF') {
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.onclick = null;
            btn.classList.add('opacity-70');
            if (btn.innerText.trim().toLowerCase() === cor) {
                btn.classList.add('bg-green-100', 'border-green-500');
            }
        });
    }

    const fb = document.getElementById('feedback-container');
    fb.classList.remove('hidden', 'bg-green-100', 'bg-red-100');
    if (isCorrect) {
        score++;
        updateScoreDisplay();
        playSound('correct');
        fb.classList.add('bg-green-100', 'border-green-500');
        document.getElementById('feedback-message').innerText = '✅ Correct!';
    } else {
        playSound('incorrect');
        fb.classList.add('bg-red-100', 'border-red-500');
        document.getElementById('feedback-message').innerText = qType === 'FIB' ? `❌ Incorrect. Answer: ${correctText}` : '❌ Incorrect';
    }
    document.getElementById('explanation-text').innerText = explanation ? `Explanation: ${explanation}` : '';
    document.getElementById('next-btn').classList.remove('hidden');
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentTopicQuestions.length) loadQuestion();
    else showFinalScore();
}

function updateScoreDisplay() {
    document.getElementById('current-score').innerText = `Score: ${score}`;
}

function showFinalScore() {
    clearInterval(timerInterval);
    document.getElementById('final-score').innerText = score;
    document.getElementById('total-questions').innerText = currentTopicQuestions.length;
    document.getElementById('final-time').innerText = formatTime(secondsElapsed);
    showView('score');
    if (score === currentTopicQuestions.length && score > 0) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
}

function handleBackNavigation() {
    const v = getViews();
    if (!v.practice.classList.contains('hidden')) quitPractice();
    else if (!v.type.classList.contains('hidden')) showTopics(currentGrade);
    else if (!v.topic.classList.contains('hidden')) showGrades();
    else if (!v.score.classList.contains('hidden')) showTopics(currentGrade);
    else window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', init);