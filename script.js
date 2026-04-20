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
    document.getElementById('grade-view').classList.add('hidden');

    Papa.parse(GOOGLE_SHEET_URL, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            allQuestions = results.data;
            
            if (allQuestions.length === 0) {
                document.getElementById('loading-screen').innerHTML = `<p class="text-red-600 font-bold text-2xl">Error: No questions found in the database.</p>`;
                return;
            }
            
            preloadImages(allQuestions);
            showGrades();
        },
        error: function(error) {
            console.error("Database Error:", error);
            document.getElementById('loading-screen').innerHTML = `<p class="text-red-600 font-bold text-xl mt-4">Error loading database. Please check your internet connection or refresh the page.</p>`;
        }
    });
}

function showGrades() {
    document.getElementById('nav-back-grades').classList.add('hidden');
    document.getElementById('nav-back-topics').classList.add('hidden');
    
    // THE FIX: The filter excluding 9 and 10 has been removed.
    // It will now show all grades dynamically from your sheet.
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
    
    const gradeQuestions = allQuestions.filter(q => q.Grade === selectedGrade);
    // Sort topics so Chapter 1 comes before Chapter 2
    const topics = [...new Set(gradeQuestions.map(q => q.Topic))].filter(Boolean).sort((a, b) => {
        return a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
    });   
    
    const container = document.getElementById('topic-buttons');
    container.innerHTML = '';

    // We use a cleaner grid for Chapters
    container.className = "grid grid-cols-1 md:grid-cols-2 gap-4 w-full";

    topics.forEach(topic => {
        const btn = document.createElement('button');
        // This styling matches your existing colors but adds a "Chapter Tab" feel
        btn.className = 'flex items-center text-left bg-white border-l-8 border-blue-600 border-t border-r border-b border-slate-200 hover:border-blue-500 hover:bg-blue-50 p-5 rounded-r-xl shadow-sm transition-all hover:scale-[1.02]';
        
        // Creating the inner HTML to show a "Book" icon and the Chapter Name
        btn.innerHTML = `
            <div class="bg-blue-100 text-blue-700 rounded-lg p-3 mr-4">
                <i class="fas fa-book-open text-xl"></i>
            </div>
            <span class="font-bold text-xl text-slate-800">${topic}</span>
        `;
        
        btn.onclick = () => showQuestionTypes(topic, gradeQuestions.filter(q => q.Topic === topic));
        container.appendChild(btn);
    });

    showView('topic');
}


function showQuestionTypes(topic, questionsForTopic) {
    document.getElementById('nav-back-grades').classList.add('hidden');
    document.getElementById('nav-back-topics').classList.remove('hidden');
    currentTopic = topic;
    currentPendingQuestions = questionsForTopic;
    
    // Update the title
    document.getElementById('selected-topic-title').innerText = topic;
    
    // Check if a worksheet area exists, if not, let's create a placeholder link
    // Note: You would need to name your PDFs exactly like your chapters
    const worksheetDiv = document.createElement('div');
    worksheetDiv.className = "mt-8 p-4 bg-yellow-50 border-2 border-dashed border-yellow-400 rounded-xl flex items-center justify-between";
    worksheetDiv.innerHTML = `
        <div class="text-left">
            <h4 class="font-bold text-yellow-800 text-lg">Chapter Worksheet</h4>
            <p class="text-yellow-700 text-sm">Download 20 practice questions for offline study.</p>
        </div>
        <a href="worksheets/${topic.replace(/\s+/g, '_')}.pdf" download class="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
            <i class="fas fa-file-pdf"></i> Download
        </a>
    `;

    // Add it to the view
    const typeView = document.getElementById('type-view');
    // Remove any old worksheet boxes before adding the new one
    const oldBox = typeView.querySelector('.bg-yellow-50');
    if (oldBox) oldBox.remove();
    
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
        alert(`You haven't added any ${selectedType} questions for this topic yet! Try a different mode.`);
        return;
    }

    startPractice(filteredQuestions);
}

function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
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
        imgElement.src = ''; 
        imgElement.classList.add('hidden'); 
    }

    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    const qTypeRaw = q.Question_Type || q.question_type || q['Question Type'] || 'MCQ';
    const qType = String(qTypeRaw).toUpperCase().trim();

    if (qType === 'MCQ') {
        const options = [q.Option_A, q.Option_B, q.Option_C, q.Option_D];
        options.forEach(opt => {
            if (!opt) return; 
            const btn = document.createElement('button');
            btn.className = 'option-btn text-left bg-slate-50 border-4 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-2xl font-bold py-5 px-6 rounded-xl w-full shadow-sm';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(btn, opt, q.Correct_Answer, q.Explanation, 'MCQ');
            optionsContainer.appendChild(btn);
        });

    } else if (qType === 'TF' || qType === 'T/F') {
        const options = ['True', 'False'];
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn text-center bg-slate-50 border-4 border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-2xl font-bold py-5 px-6 rounded-xl w-full shadow-sm';
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(btn, opt, q.Correct_Answer, q.Explanation, 'TF');
            optionsContainer.appendChild(btn);
        });

    } else if (qType === 'FIB') {
        optionsContainer.classList.remove('md:grid-cols-2');
        optionsContainer.classList.add('grid-cols-1');

        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.id = 'fib-input';
        inputField.placeholder = 'Type your answer here...';
        inputField.className = 'w-full text-2xl font-bold py-5 px-6 rounded-xl border-4 border-slate-300 focus:border-blue-500 focus:outline-none mb-4 bg-white text-slate-800 text-center';

        const submitBtn = document.createElement('button');
        submitBtn.className = 'w-full md:w-1/2 mx-auto block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-10 rounded-xl text-xl shadow-lg transition-transform hover:-translate-y-1';
        submitBtn.innerText = 'Submit Answer';
        
        submitBtn.onclick = () => {
            const userAns = inputField.value;
            if(!userAns.trim()) return; 
            inputField.disabled = true;
            submitBtn.disabled = true;
            submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
            checkAnswer(null, userAns, q.Correct_Answer, q.Explanation, 'FIB');
        };

        inputField.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') submitBtn.click();
        });

        optionsContainer.appendChild(inputField);
        optionsContainer.appendChild(submitBtn);
        
        setTimeout(() => inputField.focus(), 100);
    }
}

function checkAnswer(selectedBtn, selectedText, correctText, explanation, qType) {
    const formattedSelected = String(selectedText).trim().toLowerCase();
    const formattedCorrect = String(correctText).trim().toLowerCase();
    const isCorrect = formattedSelected === formattedCorrect;

    if (qType === 'MCQ' || qType === 'TF') {
        const buttons = document.querySelectorAll('.option-btn');
        buttons.forEach(btn => {
            btn.onclick = null;
            btn.classList.add('opacity-70', 'cursor-not-allowed');
            if (btn.innerText.trim().toLowerCase() === formattedCorrect) {
                btn.classList.remove('bg-slate-50', 'border-slate-200', 'opacity-70');
                btn.classList.add('bg-green-100', 'border-green-500', 'text-green-900');
            }
        });
    }

    const feedbackContainer = document.getElementById('feedback-container');
    const feedbackMsg = document.getElementById('feedback-message');
    const explanationText = document.getElementById('explanation-text');

    feedbackContainer.classList.remove('hidden', 'bg-green-100', 'bg-red-100', 'text-green-900', 'text-red-900', 'border-green-500', 'border-red-500');

    if (isCorrect) {
        score++;
        updateScoreDisplay();
        playSound('correct');
        feedbackContainer.classList.add('bg-green-100', 'text-green-900', 'border-green-500');
        feedbackMsg.innerText = '✅ Correct!';
        
        if ((qType === 'MCQ' || qType === 'TF') && selectedBtn) {
            selectedBtn.classList.remove('bg-slate-50', 'border-slate-200');
            selectedBtn.classList.add('bg-green-100', 'border-green-500', 'text-green-900');
        } else if (qType === 'FIB') {
            document.getElementById('fib-input').classList.add('bg-green-50', 'border-green-500', 'text-green-900');
        }
    } else {
        playSound('incorrect');
        feedbackContainer.classList.add('bg-red-100', 'text-red-900', 'border-red-500');
        
        if (qType === 'FIB') {
            feedbackMsg.innerText = `❌ Incorrect. The correct answer is: ${correctText}`;
            document.getElementById('fib-input').classList.add('bg-red-50', 'border-red-500', 'text-red-900');
        } else {
            feedbackMsg.innerText = '❌ Incorrect';
            if (selectedBtn) {
                selectedBtn.classList.remove('bg-slate-50', 'border-slate-200');
                selectedBtn.classList.add('bg-red-100', 'border-red-500', 'text-red-900');
            }
        }
    }

    explanationText.innerText = explanation ? `Explanation: ${explanation}` : '';
    document.getElementById('next-btn').classList.remove('hidden');
    
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.classList.remove('grid-cols-1');
    optionsContainer.classList.add('md:grid-cols-2');
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentTopicQuestions.length) {
        loadQuestion();
    } else {
        showFinalScore();
    }
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

    if (score === currentTopicQuestions.length && currentTopicQuestions.length > 0) {
        confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#0e5096', '#66aadd', '#ffffff', '#ffcc00']
        });
    }
}

function handleBackNavigation() {
    const views = getViews();
    if (!views.practice.classList.contains('hidden')) {
        quitPractice(); 
    } 
    else if (!views.type.classList.contains('hidden')) {
        showTopics(currentGrade); 
    }
    else if (!views.topic.classList.contains('hidden')) {
        showGrades(); 
    } 
    else if (!views.score.classList.contains('hidden')) {
        showTopics(currentGrade);
    }
    else {
        window.location.href = 'index.html'; 
    }
}

document.addEventListener('DOMContentLoaded', init);