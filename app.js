
// =========================
// GYMLOG - GRUNDINSTÄLLNINGAR
// =========================

const pageContent = document.getElementById("page-content");
const navItems = document.querySelectorAll(".nav-item");

let history = loadSavedData("gymlog_history", []);
let statisticsHistory = loadSavedData("gymlog_statistics_history", null);

if (statisticsHistory === null) {
  statisticsHistory = [...history];
  saveStatisticsHistory();
}
let trainingTimePeriod = "week";
let workoutExercises = [];
let openExerciseIndex = null;
let workoutName = "";
let workoutStartTime = null;
let schedule = loadSavedData("gymlog_schedule", {});
let programs = loadSavedData("gymlog_programs", []);
let editingProgramExercises = [];
let editingProgramName = "";
let workoutTimerInterval = null;
let workoutElapsedSeconds = 0;
let workoutRunningSince = null;

// =========================
// SPARA OCH HÄMTA DATA
// =========================

function loadSavedData(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    return fallback;
  }
}

function saveHistory() {
  localStorage.setItem("gymlog_history", JSON.stringify(history));
}
function saveStatisticsHistory() {
  localStorage.setItem(
    "gymlog_statistics_history",
    JSON.stringify(statisticsHistory)
  );
}
function saveSchedule() {
  localStorage.setItem("gymlog_schedule", JSON.stringify(schedule));
}

function savePrograms() {
  localStorage.setItem("gymlog_programs", JSON.stringify(programs));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return replacements[character];
  });
}

// =========================
// HEM
// =========================


function renderHome() {
  const days = [
    "Söndag",
    "Måndag",
    "Tisdag",
    "Onsdag",
    "Torsdag",
    "Fredag",
    "Lördag"
  ];

  const today = days[new Date().getDay()];
  const todaysWorkout = schedule[today] || "";

  const now = new Date();

  // Pass denna månad
  const workoutsThisMonth = statisticsHistory.filter(record => {
    const date = new Date(record.date);

    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  });

  // Pass detta år
  const workoutsThisYear = statisticsHistory.filter(record => {
    const date = new Date(record.date);

    return date.getFullYear() === now.getFullYear();
  });

  // Pass denna vecka (måndag till söndag)
  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);

  const dayOfWeek = (now.getDay() + 6) % 7;
  startOfWeek.setDate(now.getDate() - dayOfWeek);

  const workoutsThisWeekRecords = statisticsHistory.filter(record => {
    const date = new Date(record.date);

    return date >= startOfWeek && date <= now;
  });

  const workoutsThisWeek = workoutsThisWeekRecords.length;

  // Välj period för träningstid
  const timePeriods = {
    week: workoutsThisWeekRecords,
    month: workoutsThisMonth,
    year: workoutsThisYear
  };

  const selectedTimeRecords = timePeriods[trainingTimePeriod];

  // Räkna samman träningstiden
  const totalSeconds = selectedTimeRecords.reduce((total, record) => {
    return total + (Number(record.duration) || 0);
  }, 0);

  const trainingTimeLabels = {
    week: "Träningstid denna vecka",
    month: "Träningstid denna månad",
    year: "Total träningstid i år"
  };

  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const trainingTime = hours > 0
    ? `${hours} h ${minutes} min`
    : `${minutes} min`;

  pageContent.innerHTML = `
    <section class="home-hero">
      <p class="page-eyebrow">WELCOME TO GYMLOG</p>
      <h1>BUILD YOUR<br>STRENGTH<span>.</span></h1>
      <p class="hero-subtitle">Små framsteg. Stora resultat.</p>
      <p class="hero-description">
        Varje pass tar dig ett steg närmare dina mål.
      </p>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>Dagens träning</h2>
      </div>

      <div class="today-workout-card">
        <div class="latest-workout-icon">📅</div>
        <div class="latest-workout-info">
          <strong>
            ${todaysWorkout
              ? escapeHTML(todaysWorkout)
              : "Ingen träning planerad idag"}
          </strong>
          <span>${today}</span>
        </div>
      </div>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>Din statistik</h2>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-icon">🏋️</span>
          <strong>${workoutsThisWeek}</strong>
          <span>Antal pass denna vecka</span>
        </div>

        <div class="stat-card">
          <span class="stat-icon">📅</span>
          <strong>${workoutsThisMonth.length}</strong>
          <span>Antal pass denna månad</span>
        </div>

        <div class="stat-card">
          <span class="stat-icon">🏆</span>
          <strong>${workoutsThisYear.length}</strong>
          <span>Totalt antal pass i år</span>
        </div>

        <div class="stat-card training-time-stat" id="training-time-toggle">
          <span class="stat-icon">◷</span>
          <strong>${trainingTime}</strong>
          <span>${trainingTimeLabels[trainingTimePeriod]}</span>
        </div>
      </div>
    </section>

    <section class="motivation-banner">
      <div class="banner-content">
        <p>STAY FOCUSED</p>
        <h2>STRONGER<br>EVERY DAY.</h2>
        <span>Det börjar med ett pass.</span>
      </div>
    </section>
  `;

  document
    .getElementById("training-time-toggle")
    .addEventListener("click", () => {
      if (trainingTimePeriod === "week") {
        trainingTimePeriod = "month";
      } else if (trainingTimePeriod === "month") {
        trainingTimePeriod = "year";
      } else {
        trainingTimePeriod = "week";
      }

      renderHome();
    });
}

// =========================
// TRÄNING
// =========================

function renderTraining() {
  pageContent.innerHTML = `
    <section class="training-hero">
      <p class="page-eyebrow">YOUR WORKOUT</p>
      <h1>Träningslogg<span>.</span></h1>
      <p class="hero-description">
        Registrera din träning och följ din utveckling.
      </p>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>Kom igång</h2>
      </div>

      <button class="training-option" id="start-free-workout">
        <span class="training-option-icon">🏋️</span>
        <span class="training-option-info">
          <strong>Starta ett träningspass</strong>
          <small>Logga resultaten medan du tränar.</small>
        </span>
        <span class="training-option-arrow">›</span>
      </button>

      <button class="training-option" id="create-schedule">
        <span class="training-option-icon">📅</span>
        <span class="training-option-info">
          <strong>Skapa ett träningsschema</strong>
          <small>Planera vad du ska träna varje veckodag.</small>
        </span>
        <span class="training-option-arrow">›</span>
      </button>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>Senaste träningen</h2>
      </div>

      <div class="latest-workout-card">
        <div class="latest-workout-icon">📊</div>
        <div class="latest-workout-info">
          <strong>
            ${history.length
      ? escapeHTML(history[0].name || "Träningspass")
      : "Inga pass registrerade ännu"}
          </strong>
          <span>
            ${history.length
      ? new Date(history[0].date).toLocaleDateString("sv-SE")
      : "Dina träningsresultat visas här."}
          </span>
        </div>
      </div>
    </section>
  `;

  document
    .getElementById("start-free-workout")
    .addEventListener("click", renderStartWorkout);

  document
    .getElementById("create-schedule")
    .addEventListener("click", renderSchedule);
}

function renderSchedule() {
  const days = [
    "Måndag",
    "Tisdag",
    "Onsdag",
    "Torsdag",
    "Fredag",
    "Lördag",
    "Söndag"
  ];

  pageContent.innerHTML = `
    <section class="training-hero">
      <p class="page-eyebrow">WEEKLY PLANNER</p>
      <h1>Träningsschema<span>.</span></h1>
      <p class="hero-description">
        Planera din träning för hela veckan.
      </p>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>Min träningsvecka</h2>
      </div>

      ${days.map(day => `
        <div class="schedule-day-card">
          <label for="schedule-${day}">
            ${day}
          </label>

          <input
            type="text"
            id="schedule-${day}"
            class="exercise-search"
            data-schedule-day="${day}"
            value="${escapeHTML(schedule[day] || "")}"
          >
        </div>
      `).join("")}

      <button class="workout-action-button" id="save-schedule">
        <span class="action-button-icon">✓</span>
        <span>Spara träningsschema</span>
      </button>
    </section>

    <button class="back-button" id="back-to-training">
      ← Tillbaka
    </button>
  `;

  document
    .getElementById("save-schedule")
    .addEventListener("click", () => {
      document.querySelectorAll("[data-schedule-day]").forEach(input => {
        schedule[input.dataset.scheduleDay] = input.value.trim();
      });

      saveSchedule();
      alert("Ditt träningsschema har sparats!");
      navigateTo("home");
    });

  document
    .getElementById("back-to-training")
    .addEventListener("click", renderTraining);
}

// =========================
// STARTA PASS
// =========================

function renderStartWorkout() {
  pageContent.innerHTML = `
    <section class="training-hero">
      <p class="page-eyebrow">LET'S GET STARTED</p>
      <h1>Dags att träna<span>.</span></h1>
      <p class="hero-description">
        Hur vill du lägga upp dagens träningspass?
      </p>
    </section>

    <section class="content-section">
      <button class="training-option" id="free-workout">
        <span class="training-option-icon">🏋️</span>
        <span class="training-option-info">
          <strong>Fritt träningspass</strong>
          <small>Lägg in övningar och logga dina resultat.</small>
        </span>
        <span class="training-option-arrow">›</span>
      </button>

      <button class="training-option" id="saved-program">
        <span class="training-option-icon">📋</span>
        <span class="training-option-info">
          <strong>Välj ett sparat program</strong>
          <small>Starta ett träningspass från något av dina sparade program.</small>
        </span>
        <span class="training-option-arrow">›</span>
      </button>
    </section>

    <button class="back-button" id="back-to-training">
      ← Tillbaka
    </button>
  `;

  document
    .getElementById("back-to-training")
    .addEventListener("click", renderTraining);

  document
    .getElementById("free-workout")
    .addEventListener("click", () => {
      workoutExercises = [];
      workoutName = "";
      workoutStartTime = null;
      workoutElapsedSeconds = 0;
      workoutRunningSince = null;
      openExerciseIndex = null;
      renderActiveWorkout();
    });

  document
    .getElementById("saved-program")
    .addEventListener("click", renderProgramPicker);
}

// =========================
// AKTIVT TRÄNINGSPASS
// =========================

function renderActiveWorkout() {
  pageContent.innerHTML = `
    <section class="training-hero">
      <p class="page-eyebrow">ACTIVE WORKOUT</p>
      <h1>Mitt träningspass<span>.</span></h1>
      </p>
    </section>

    <div class="workout-timer-card">
      <span class="workout-timer-label">TRÄNINGSTID</span>
      <strong id="workout-timer">00:00:00</strong>
      <button id="workout-timer-button" class="timer-control-button">
        ▶ Starta tidtagning
      </button>
    </div>

    <section class="content-section">

      <label class="workout-name-label" for="workout-name">
        NAMN PÅ TRÄNINGSPASSET
      </label>

      

      <input
        type="text"
        id="workout-name"
        class="exercise-search workout-name-input"
        value="${escapeHTML(workoutName)}"
      >

      <div class="section-heading">
        <h2>Dina övningar</h2>
      </div>

      <div id="workout-exercises"></div>

      <button class="workout-action-button" id="add-exercise">
        <span class="action-button-icon">＋</span>
        <span>Lägg till övning</span>
      </button>

      <div id="exercise-picker-container" style="display: none;">
        <div class="exercise-picker-panel">
          <input
            type="text"
            id="exercise-name-input"
            class="exercise-search"
            placeholder="Skriv namnet på övningen..."
            autocomplete="off"
          >

          <button
            class="workout-action-button"
            id="confirm-add-exercise"
          >
            <span class="action-button-icon">＋</span>
            <span>Lägg till</span>
          </button>
        </div>
      </div>

      <button
        class="workout-action-button finish-workout-button"
        id="finish-workout"
      >
        <span class="action-button-icon">✓</span>
        <span>Avsluta träningspass</span>
      </button>

    </section>

    <button class="back-button" id="back-to-start">
      ← Tillbaka
    </button>
  `;

  document
    .getElementById("workout-name")
    .addEventListener("input", event => {
      workoutName = event.target.value;
    });

  document
    .getElementById("back-to-start")
    .addEventListener("click", () => {
      if (
        workoutExercises.length > 0 &&
        !confirm("Vill du lämna passet? Dina registreringar i det pågående passet försvinner.")
      ) {
        return;
      }

      workoutExercises = [];
      workoutName = "";
      openExerciseIndex = null;
      clearInterval(workoutTimerInterval);
      workoutTimerInterval = null;
      workoutStartTime = null;
      renderStartWorkout();
    });

  document
    .getElementById("add-exercise")
    .addEventListener("click", toggleExerciseInput);

  document
    .getElementById("confirm-add-exercise")
    .addEventListener("click", addExerciseToWorkout);

  document
    .getElementById("finish-workout")
    .addEventListener("click", finishWorkout);

  document
    .getElementById("exercise-name-input")
    .addEventListener("keydown", event => {
      if (event.key === "Enter") {
        addExerciseToWorkout();
      }
    });

  renderWorkoutExercises();
  startWorkoutTimer();
}

function startWorkoutTimer() {
  if (workoutTimerInterval) {
    clearInterval(workoutTimerInterval);
    workoutTimerInterval = null;
  }

  const timerElement = document.getElementById("workout-timer");
  const timerButton = document.getElementById("workout-timer-button");

  function updateTimer() {
    const currentSession = workoutRunningSince
      ? Math.floor((Date.now() - workoutRunningSince) / 1000)
      : 0;

    const elapsed = workoutElapsedSeconds + currentSession;

    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;

    timerElement.textContent =
      [hours, minutes, seconds]
        .map(value => String(value).padStart(2, "0"))
        .join(":");
  }

  updateTimer();

  timerButton.addEventListener("click", () => {
    if (workoutRunningSince) {
      workoutElapsedSeconds += Math.floor(
        (Date.now() - workoutRunningSince) / 1000
      );

      workoutRunningSince = null;

      clearInterval(workoutTimerInterval);
      workoutTimerInterval = null;

      timerButton.textContent = "▶ Fortsätt tidtagning";
    } else {
      workoutRunningSince = Date.now();

      timerButton.textContent = "Ⅱ Pausa tidtagning";

      workoutTimerInterval = setInterval(updateTimer, 1000);
    }

    updateTimer();
  });
}


// =========================
// VISA / DÖLJ TEXTRUTAN
// =========================

function toggleExerciseInput() {
  const container = document.getElementById("exercise-picker-container");
  const input = document.getElementById("exercise-name-input");

  if (!container) return;

  const isOpen = container.style.display !== "none";

  if (isOpen) {
    container.style.display = "none";
  } else {
    container.style.display = "block";
    input.focus();
  }
}

// =========================
// LÄGG TILL ÖVNING
// =========================

function addExerciseToWorkout() {
  const input = document.getElementById("exercise-name-input");
  const name = input.value.trim();

  if (!name) {
    alert("Skriv namnet på övningen först.");
    input.focus();
    return;
  }

  const alreadyAdded = workoutExercises.some(exercise =>
    exercise.name.toLowerCase() === name.toLowerCase()
  );

  if (alreadyAdded) {
    alert("Den här övningen finns redan i passet.");
    input.focus();
    return;
  }

  workoutExercises.push({
    name: name,
    sets: [
      { weight: "", reps: "" },
      { weight: "", reps: "" },
      { weight: "", reps: "" }
    ]
  });

  openExerciseIndex = workoutExercises.length - 1;

  input.value = "";

  document.getElementById("exercise-picker-container").style.display = "none";

  renderWorkoutExercises();
}

// =========================
// VISA ÖVNINGARNA
// =========================

function renderWorkoutExercises() {
  const workoutList = document.getElementById("workout-exercises");

  if (!workoutList) return;

  if (workoutExercises.length === 0) {
    workoutList.innerHTML = `
      <div class="placeholder-card">
        <span>🏋️</span>
        <h2>Inga övningar ännu</h2>
        <p>Lägg till din första övning för att komma igång.</p>
      </div>
    `;

    return;
  }

  workoutList.innerHTML = workoutExercises.map((exercise, index) => {
    const isOpen = openExerciseIndex === index;

    const completedSets = exercise.sets.filter(set =>
      set.weight !== "" || set.reps !== ""
    ).length;

    return `
      <div class="workout-exercise-card ${isOpen ? "open" : ""}">

        <button
          class="workout-exercise-toggle"
          type="button"
          data-toggle-exercise="${index}"
        >
          <span class="workout-exercise-name">
            <strong>${escapeHTML(exercise.name)}</strong>
            <small>${completedSets} registrerade set</small>
          </span>

          <span class="workout-exercise-chevron">
            ${isOpen ? "⌃" : "⌄"}
          </span>
        </button>

        ${isOpen ? `
          <div class="workout-exercise-content">

            ${exercise.sets.map((set, setIndex) => `
              <div class="workout-set">

                <span class="workout-set-label">
                  SET ${setIndex + 1}
                </span>

                <label class="workout-input-group">
                  <span>Vikt (kg)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    inputmode="decimal"
                    placeholder="0"
                    value="${escapeHTML(set.weight)}"
                    data-exercise="${index}"
                    data-set="${setIndex}"
                    data-field="weight"
                  >
                </label>

                <label class="workout-input-group">
                  <span>Reps</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                    placeholder="0"
                    value="${escapeHTML(set.reps)}"
                    data-exercise="${index}"
                    data-set="${setIndex}"
                    data-field="reps"
                  >
                </label>

                <button
                  class="workout-remove-set"
                  type="button"
                  data-remove-set="${index}"
                  data-set="${setIndex}"
                  aria-label="Ta bort set"
                >×</button>

              </div>
            `).join("")}

            <button
              class="workout-add-set"
              type="button"
              data-add-set="${index}"
            >
              ＋ Lägg till set
            </button>

            <button
              class="workout-remove-exercise"
              type="button"
              data-remove-exercise="${index}"
            >
              Ta bort övning
            </button>

          </div>
        ` : ""}

      </div>
    `;
  }).join("");

  // Öppna eller stäng övning
  workoutList.querySelectorAll("[data-toggle-exercise]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.toggleExercise);

      openExerciseIndex =
        openExerciseIndex === index ? null : index;

      renderWorkoutExercises();
    });
  });

  // Spara vikt och reps
  workoutList.querySelectorAll("[data-field]").forEach(input => {
    input.addEventListener("input", () => {
      const exerciseIndex = Number(input.dataset.exercise);
      const setIndex = Number(input.dataset.set);
      const field = input.dataset.field;

      workoutExercises[exerciseIndex].sets[setIndex][field] = input.value;

      updateExerciseSummary(exerciseIndex);
    });
  });

  // Lägg till set
  workoutList.querySelectorAll("[data-add-set]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.addSet);

      workoutExercises[index].sets.push({
        weight: "",
        reps: ""
      });

      openExerciseIndex = index;
      renderWorkoutExercises();
    });
  });

  // Ta bort set
  workoutList.querySelectorAll("[data-remove-set]").forEach(button => {
    button.addEventListener("click", () => {
      const exerciseIndex = Number(button.dataset.removeSet);
      const setIndex = Number(button.dataset.set);

      const sets = workoutExercises[exerciseIndex].sets;

      if (sets.length > 1) {
        sets.splice(setIndex, 1);
      } else {
        sets[0] = { weight: "", reps: "" };
      }

      openExerciseIndex = exerciseIndex;
      renderWorkoutExercises();
    });
  });

  // Ta bort övning
  workoutList.querySelectorAll("[data-remove-exercise]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeExercise);

      workoutExercises.splice(index, 1);
      openExerciseIndex = null;

      renderWorkoutExercises();
    });
  });
}

// =========================
// UPPDATERA ÖVNINGSSAMMANFATTNING
// =========================

function updateExerciseSummary(index) {
  const cards = document.querySelectorAll(".workout-exercise-card");
  const card = cards[index];

  if (!card) return;

  const completedSets = workoutExercises[index].sets.filter(set =>
    set.weight !== "" || set.reps !== ""
  ).length;

  const summary = card.querySelector(".workout-exercise-name small");

  if (summary) {
    summary.textContent = `${completedSets} registrerade set`;
  }
}

// =========================
// AVSLUTA TRÄNINGSPASS
// =========================


function finishWorkout() {
  if (workoutExercises.length === 0) {
    alert("Du behöver lägga till minst en övning först.");
    return;
  }

  const hasResults = workoutExercises.some(exercise =>
    exercise.sets.some(set =>
      set.weight !== "" || set.reps !== ""
    )
  );

  if (!hasResults) {
    alert("Registrera vikt eller reps på minst ett set innan du avslutar passet.");
    return;
  }

  const finalName = workoutName.trim() || "Träningspass";

  const durationSeconds = workoutElapsedSeconds +
    (workoutRunningSince
      ? Math.floor((Date.now() - workoutRunningSince) / 1000)
      : 0);

  const record = {
    name: finalName,
    date: new Date().toISOString(),
    duration: durationSeconds,
    exercises: JSON.parse(JSON.stringify(workoutExercises))
  };

  history.unshift(record);
  statisticsHistory.unshift(record);

  saveHistory();
  saveStatisticsHistory();

  workoutExercises = [];
  workoutName = "";
  openExerciseIndex = null;
  clearInterval(workoutTimerInterval);
  workoutTimerInterval = null;
  workoutStartTime = null;

  alert("Ditt träningspass har sparats!");

  navigateTo("history");
}

// =========================
// KÖR ETT TIDIGARE PASS IGEN
// =========================

function repeatWorkout(recordIndex) {
  const record = history[recordIndex];

  if (!record) return;

  workoutName = record.name || "Träningspass";

  // Kopiera övningarna och antalet set,
  // men nollställ vikt och reps inför det nya passet.
  workoutExercises = record.exercises.map(exercise => ({
    name: exercise.name,
    sets: exercise.sets.map(() => ({
      weight: "",
      reps: ""
    }))
  }));

  openExerciseIndex = null;

  navigateTo("training");
  renderActiveWorkout();
}

// =========================
// HISTORIK
// =========================

function renderHistory() {
  pageContent.innerHTML = `
    <h1 class="page-title">Historik</h1>
    <p class="page-description">
      Följ dina tidigare träningspass och din utveckling.
    </p>

    ${history.length === 0
      ? `
          <div class="placeholder-card">
            <span>📊</span>
            <h2>Din träningshistorik</h2>
            <p>Här samlas alla dina registrerade pass.</p>
          </div>
        `
      : history.map((record, index) => `
          <div class="history-workout-card">

            <button
              class="history-toggle"
              data-toggle-history="${index}"
              aria-expanded="false"
            >
              <span class="history-heading">
                <strong>${escapeHTML(record.name || `Träningspass ${history.length - index}`)}</strong>
                <small>${new Date(record.date).toLocaleDateString("sv-SE")}</small>
              </span>
              <span class="history-arrow">⌄</span>
            </button>

            <div class="history-details" hidden>
              ${record.exercises.map(exercise => `
                <div class="history-exercise">
                  <strong>${escapeHTML(exercise.name)}</strong>

                  ${exercise.sets.map((set, setIndex) => `
                    <p>
                      Set ${setIndex + 1}:
                      ${set.weight ? escapeHTML(set.weight) + " kg" : "—"}
                      ×
                      ${set.reps ? escapeHTML(set.reps) + " reps" : "—"}
                    </p>
                  `).join("")}
                </div>
              `).join("")}

              <button
                class="workout-action-button repeat-workout-button"
                data-repeat-workout="${index}"
              >
                <span class="action-button-icon">↻</span>
                <span>Kör detta pass igen</span>
              </button>

              <button
                class="delete-history-button"
                data-delete-history="${index}"
              >
                Ta bort från historiken
              </button>
            </div>

          </div>
        `).join("")
    }

    <button class="clear-history-button" id="clear-history">
      Nollställ all historik och statistik
    </button>
  `;

  document.querySelectorAll("[data-toggle-history]").forEach(button => {
    button.addEventListener("click", () => {
      const details = button.nextElementSibling;
      const isOpen = !details.hidden;

      details.hidden = isOpen;
      button.setAttribute("aria-expanded", String(!isOpen));
      button.querySelector(".history-arrow").textContent = isOpen ? "⌄" : "⌃";
    });
  });

  document.querySelectorAll("[data-repeat-workout]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.repeatWorkout);
      repeatWorkout(index);
    });
  });

  document.querySelectorAll("[data-delete-history]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.deleteHistory);

      if (!confirm("Vill du ta bort detta pass från historiken? Det kommer fortfarande att räknas med i statistiken.")) {
        return;
      }

      history.splice(index, 1);
      saveHistory();
      renderHistory();
    });
  });

  document.getElementById("clear-history").addEventListener("click", () => {
    if (!confirm("Är du säker på att du vill radera all historik och nollställa statistiken? Detta går inte att ångra.")) {
      return;
    }

    history = [];
    statisticsHistory = [];

    saveHistory();
    saveStatisticsHistory();

    renderHistory();
  });
}

// =========================
// PROGRAM
// =========================


function renderPrograms() {
  pageContent.innerHTML = `
    <section class="training-hero">
      <p class="page-eyebrow">YOUR PROGRAMS</p>
      <h1>Mina program<span>.</span></h1>
      <p class="hero-description">
        Skapa och spara träningsupplägg som du kan använda igen.
      </p>
    </section>

    <section class="content-section">
      <button class="training-option" id="create-program">
        <span class="training-option-icon">＋</span>
        <span class="training-option-info">
          <strong>Skapa ett träningsprogram</strong>
          <small>Välj övningar och antal set.</small>
        </span>
        <span class="training-option-arrow">›</span>
      </button>
    </section>

    <section class="content-section">
      <div class="section-heading">
        <h2>Sparade program</h2>
      </div>

      ${programs.length === 0
      ? `
            <div class="placeholder-card">
              <span>📋</span>
              <h2>Inga program ännu</h2>
              <p>Dina sparade träningsprogram visas här.</p>
            </div>
          `
      : programs.map((program, index) => `
            <div class="history-workout-card program-card">

              <button
                class="history-toggle"
                data-toggle-program="${index}"
                aria-expanded="false"
              >
                <span class="history-heading">
                  <strong>${escapeHTML(program.name)}</strong>
                  <small>${program.exercises.length} övningar</small>
                </span>

                <span class="history-arrow">⌄</span>
              </button>

              <div class="program-details" hidden>
                <div class="program-exercise-summary">
                  ${program.exercises.map(exercise => `
                    <p>
                      ${escapeHTML(exercise.name)}
                      <span>${exercise.sets} set × ${exercise.reps} reps</span>
                    </p>
                  `).join("")}
                </div>

                <button
                  class="workout-action-button"
                  data-start-program="${index}"
                >
                  <span class="action-button-icon">🏋️</span>
                  <span>Starta programmet</span>
                </button>

                <button
                  class="workout-remove-exercise"
                  data-delete-program="${index}"
                >
                  Ta bort program
                </button>
              </div>

            </div>
          `).join("")
    }
    </section>
  `;

  document
    .getElementById("create-program")
    .addEventListener("click", () => {
      editingProgramName = "";
      editingProgramExercises = [];
      renderProgramEditor();
    });

  // Öppna och stäng program
  document.querySelectorAll("[data-toggle-program]").forEach(button => {
    button.addEventListener("click", () => {
      const details = button.nextElementSibling;
      const isOpen = !details.hidden;

      details.hidden = isOpen;
      button.setAttribute("aria-expanded", String(!isOpen));
      button.querySelector(".history-arrow").textContent =
        isOpen ? "⌄" : "⌃";
    });
  });

  // Starta program
  document.querySelectorAll("[data-start-program]").forEach(button => {
    button.addEventListener("click", () => {
      startSavedProgram(Number(button.dataset.startProgram));
    });
  });

  // Ta bort program
  document.querySelectorAll("[data-delete-program]").forEach(button => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.deleteProgram);

      if (confirm(`Vill du ta bort programmet "${programs[index].name}"?`)) {
        programs.splice(index, 1);
        savePrograms();
        renderPrograms();
      }
    });
  });
}


function renderProgramEditor() {
  pageContent.innerHTML = `
    <section class="training-hero">
      <p class="page-eyebrow">CREATE PROGRAM</p>
      <h1>Nytt program<span>.</span></h1>
      <p class="hero-description">
        Bygg ditt eget träningsupplägg.
      </p>
    </section>

    <section class="content-section">
      <label class="workout-name-label" for="program-name">
        NAMN PÅ PROGRAMMET
      </label>

      <input
        type="text"
        id="program-name"
        class="exercise-search workout-name-input"
        placeholder="Exempelvis Bröst och triceps"
        value="${escapeHTML(editingProgramName)}"
      >

      <div class="section-heading">
        <h2>Övningar</h2>
      </div>

      <div id="program-exercise-list">
        ${editingProgramExercises.length === 0
      ? `<div class="placeholder-card">
                 <p>Lägg till övningar i ditt program.</p>
               </div>`
      : editingProgramExercises.map((exercise, index) => `
                <div class="schedule-day-card">
                  <strong>${escapeHTML(exercise.name)}</strong>
                  <span>${exercise.sets} set × ${exercise.reps} reps</span>
                  <button
                    class="workout-remove-set"
                    data-remove-program-exercise="${index}"
                    aria-label="Ta bort övning"
                  >×</button>
                </div>
              `).join("")
    }
      </div>

      <div class="exercise-picker-panel">
        <input
          type="text"
          id="program-exercise-name"
          class="exercise-search"
          placeholder="Namn på övningen..."
        >

        <label class="workout-name-label" for="program-exercise-sets">
          ANTAL SET
        </label>

        <input
          type="number"
          id="program-exercise-sets"
          class="exercise-search"
          min="1"
          max="20"
          value="3"
        >

        <label class="workout-name-label" for="program-exercise-reps">
          ANTAL REPS
        </label>

        <input
          type="number"
          id="program-exercise-reps"
          class="exercise-search"
          min="1"
          max="100"
          value="10"
        >

        <button class="workout-action-button" id="add-program-exercise">
          <span class="action-button-icon">＋</span>
          <span>Lägg till övning</span>
        </button>
      </div>

      <button class="workout-action-button finish-workout-button" id="save-program">
        <span class="action-button-icon">✓</span>
        <span>Spara träningsprogram</span>
      </button>
    </section>

    <button class="back-button" id="back-to-programs">
      ← Tillbaka
    </button>
  `;

  document.getElementById("program-name").addEventListener("input", event => {
    editingProgramName = event.target.value;
  });

  document.getElementById("add-program-exercise").addEventListener("click", () => {
    const nameInput = document.getElementById("program-exercise-name");
    const setsInput = document.getElementById("program-exercise-sets");
    const repsInput = document.getElementById("program-exercise-reps");

    const name = nameInput.value.trim();
    const sets = Number(setsInput.value);
    const reps = Number(repsInput.value);

    if (!name) {
      alert("Skriv namnet på övningen.");
      return;
    }

    if (!Number.isInteger(sets) || sets < 1 || sets > 20) {
      alert("Ange mellan 1 och 20 set.");
      return;
    }

    if (!Number.isInteger(reps) || reps < 1 || reps > 100) {
      alert("Ange mellan 1 och 100 reps.");
      return;
    }

    editingProgramExercises.push({ name, sets, reps });
    renderProgramEditor();
  });

  document.querySelectorAll("[data-remove-program-exercise]").forEach(button => {
    button.addEventListener("click", () => {
      editingProgramExercises.splice(
        Number(button.dataset.removeProgramExercise),
        1
      );
      renderProgramEditor();
    });
  });

  document.getElementById("save-program").addEventListener("click", saveWorkoutProgram);

  document.getElementById("back-to-programs").addEventListener("click", renderPrograms);
}


function saveWorkoutProgram() {
  const name = editingProgramName.trim();

  if (!name) {
    alert("Ge programmet ett namn först.");
    return;
  }

  if (editingProgramExercises.length === 0) {
    alert("Lägg till minst en övning.");
    return;
  }

  programs.push({
    name,
    exercises: editingProgramExercises.map(exercise => ({
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps
    }))
  });

  savePrograms();

  editingProgramName = "";
  editingProgramExercises = [];

  alert("Träningsprogrammet har sparats!");
  renderPrograms();
}


function startSavedProgram(index) {
  const program = programs[index];

  if (!program) return;

  workoutName = program.name;
  workoutStartTime = null;
  workoutElapsedSeconds = 0;
  workoutRunningSince = null;

  workoutExercises = program.exercises.map(exercise => ({
    name: exercise.name,
    sets: Array.from({ length: exercise.sets || 3 }, () => ({
      weight: "",
      reps: exercise.reps || ""
    }))
  }));

  openExerciseIndex = null;

  navigateTo("training");
  renderActiveWorkout();
}

function renderProgramPicker() {
  pageContent.innerHTML = `
    <section class="training-hero">
      <p class="page-eyebrow">SAVED PROGRAMS</p>
      <h1>Välj program<span>.</span></h1>
      <p class="hero-description">
        Välj ett program att starta ditt träningspass med.
      </p>
    </section>

    <section class="content-section">
      ${programs.length === 0
      ? `
            <div class="placeholder-card">
              <span>📋</span>
              <h2>Inga sparade program</h2>
              <p>Skapa ett program under fliken Program först.</p>
            </div>
          `
      : programs.map((program, index) => `
              <button
                class="training-option"
                data-pick-program="${index}"
              >
                <span class="training-option-icon">🏋️</span>
                <span class="training-option-info">
                  <strong>${escapeHTML(program.name)}</strong>
                  <small>${program.exercises.length} övningar</small>
                </span>
                <span class="training-option-arrow">›</span>
              </button>
            `).join("")
    }
    </section>

    <button class="back-button" id="back-to-start">
      ← Tillbaka
    </button>
  `;

  document.querySelectorAll("[data-pick-program]").forEach(button => {
    button.addEventListener("click", () => {
      startSavedProgram(Number(button.dataset.pickProgram));
    });
  });

  document
    .getElementById("back-to-start")
    .addEventListener("click", renderStartWorkout);
}

// =========================
// VÄXLA MELLAN SIDOR
// =========================

function navigateTo(page) {
  navItems.forEach(item => {
    item.classList.toggle("active", item.dataset.page === page);
  });

  if (page === "home") {
    renderHome();
  } else if (page === "training") {
    renderTraining();
  } else if (page === "history") {
    renderHistory();
  } else if (page === "programs") {
    renderPrograms();
  }
}

// =========================
// KOPPLA NAVIGERINGEN
// =========================

navItems.forEach(item => {
  item.addEventListener("click", () => {
    navigateTo(item.dataset.page);
  });
});

// =========================
// STARTA APPEN
// =========================

renderHome();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => console.error("Service Worker:", error));
  });
}