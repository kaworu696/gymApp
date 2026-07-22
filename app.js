// 1. Configuración de Almacenamiento Local
const STORAGE_KEY = 'gymlog_routines';
let routines = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// 2. Referencias a Elementos del DOM
const tabRoutinesBtn = document.getElementById('tab-routines-btn');
const tabCreateBtn = document.getElementById('tab-create-btn');
const viewRoutines = document.getElementById('view-routines');
const viewCreate = document.getElementById('view-create');
const routinesList = document.getElementById('routines-list');
const routineForm = document.getElementById('routine-form');
const addExerciseBtn = document.getElementById('add-exercise-btn');
const exerciseInputsContainer = document.getElementById('exercise-inputs-container');

const viewWorkout = document.getElementById('view-workout');
const activeExercisesContainer = document.getElementById('active-exercises-container');
const workoutTimerDisplay = document.getElementById('workout-timer');
const activeRoutineName = document.getElementById('active-routine-name');

let timerInterval;
let workoutSeconds = 0;
let activeRoutineId = null;

const tabMetricsBtn = document.getElementById('tab-metrics-btn');
const viewMetrics = document.getElementById('view-metrics');
const historyContainer = document.getElementById('history-container');
const prsContainer = document.getElementById('prs-container');

function switchTab(tab) {
  // Ocultar todo
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  if (tab === 'routines') {
    tabRoutinesBtn.classList.add('active');
    viewRoutines.classList.add('active');
    renderRoutines();
  } else if (tab === 'create') {
    tabCreateBtn.classList.add('active');
    viewCreate.classList.add('active');
  } else if (tab === 'metrics') {
    tabMetricsBtn.classList.add('active');
    viewMetrics.classList.add('active');
    renderMetrics(); // Llamada al cálculo de datos
  }
}

tabMetricsBtn.addEventListener('click', () => switchTab('metrics'));

tabRoutinesBtn.addEventListener('click', () => switchTab('routines'));
tabCreateBtn.addEventListener('click', () => switchTab('create'));

// 4. Gestión Dinámica de Entradas de Ejercicios
function createExerciseInput() {
  const row = document.createElement('div');
  row.className = 'exercise-input-row';
  row.innerHTML = `
    <input type="text" class="exercise-name-input" placeholder="Ej. Press de Banca" required>
    <button type="button" class="btn-icon remove-exercise-btn">&times;</button>
  `;
  
  // Añadir evento al botón de eliminar de esta fila
  row.querySelector('.remove-exercise-btn').addEventListener('click', () => {
    row.remove();
  });
  
  exerciseInputsContainer.appendChild(row);
}

addExerciseBtn.addEventListener('click', createExerciseInput);

// Asignar evento al botón de eliminar inicial definido en el HTML
document.querySelector('.remove-exercise-btn').addEventListener('click', function(e) {
  e.target.parentElement.remove();
});

// 5. Lógica para Guardar una Rutina
routineForm.addEventListener('submit', (e) => {
  e.preventDefault(); // Evita que la página se recargue
  
  const routineName = document.getElementById('routine-name').value.trim();
  const exerciseInputs = document.querySelectorAll('.exercise-name-input');
  
  // Extraer valores de los inputs, limpiarlos y filtrar vacíos
  const exercises = Array.from(exerciseInputs)
                         .map(input => input.value.trim())
                         .filter(val => val !== '');
  
  if (exercises.length === 0) {
    alert('Debes agregar al menos un ejercicio válido.');
    return;
  }

  // Crear objeto de rutina
  const newRoutine = {
    id: 'r_' + Date.now(), // Generación de ID único basado en tiempo
    name: routineName,
    exercises: exercises
  };

  // Actualizar memoria y LocalStorage
  routines.push(newRoutine);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
  
  // Limpiar formulario y reiniciar campos de ejercicio
  routineForm.reset();
  exerciseInputsContainer.innerHTML = '';
  createExerciseInput(); // Deja un campo vacío por defecto
  
  // Volver a la vista de rutinas
  switchTab('routines');
});

// 6. Lógica para Renderizar Rutinas en Pantalla
function renderRoutines() {
  if (routines.length === 0) {
    routinesList.innerHTML = '<p class="empty-msg">No hay rutinas creadas.</p>';
    return;
  }

  routinesList.innerHTML = ''; // Limpiar lista actual
  
  routines.forEach(routine => {
    const card = document.createElement('div');
    card.className = 'routine-card';
    
    const title = document.createElement('h3');
    title.textContent = routine.name;
    
    const list = document.createElement('ul');
    routine.exercises.forEach(ex => {
      const li = document.createElement('li');
      li.textContent = '• ' + ex;
      list.appendChild(li);
    });
    
    // Botón para iniciar entrenamiento
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Comenzar Entrenamiento';
    startBtn.className = 'btn btn-primary';
    startBtn.style.marginTop = '12px';
    startBtn.addEventListener('click', () => startWorkout(routine.id));

    // Botón de eliminación
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Eliminar Rutina';
    deleteBtn.className = 'btn btn-secondary';
    deleteBtn.style.borderColor = 'var(--danger-color)';
    deleteBtn.style.color = 'var(--danger-color)';
    // ... (mantén el EventListener del deleteBtn que ya tenías)
    
    card.appendChild(title);
    card.appendChild(list);
    card.appendChild(startBtn); // Añadido
    card.appendChild(deleteBtn);
    
    deleteBtn.addEventListener('click', () => {
      if(confirm(`¿Eliminar la rutina "${routine.name}"?`)) {
        routines = routines.filter(r => r.id !== routine.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
        renderRoutines();
      }
    });

    card.appendChild(title);
    card.appendChild(list);
    card.appendChild(deleteBtn);
    
    routinesList.appendChild(card);
  });
}

// 7. Inicialización al cargar la página
renderRoutines();

// 8. Registro del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(registration => {
        console.log('ServiceWorker registrado:', registration.scope);
      })
      .catch(error => {
        console.error('Error al registrar ServiceWorker:', error);
      });
  });
}


// --- LÓGICA DE ENTRENAMIENTO ---

function formatTime(totalSeconds) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function startTimer() {
  workoutSeconds = 0;
  workoutTimerDisplay.textContent = formatTime(workoutSeconds);
  timerInterval = setInterval(() => {
    workoutSeconds++;
    workoutTimerDisplay.textContent = formatTime(workoutSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

function startWorkout(id) {
  const routine = routines.find(r => r.id === id);
  if (!routine) return;

  activeRoutineId = routine.id;
  activeRoutineName.textContent = routine.name;
  activeExercisesContainer.innerHTML = '';

  routine.exercises.forEach(exName => {
    const exBlock = document.createElement('div');
    exBlock.className = 'active-exercise';
    exBlock.dataset.name = exName;
    
    exBlock.innerHTML = `
      <h3>${exName}</h3>
      <div class="sets-container"></div>
      <button class="btn btn-secondary add-set-btn" style="font-size: 0.85rem; padding: 8px;">+ Añadir Serie</button>
    `;
    
    activeExercisesContainer.appendChild(exBlock);
    
    const setsContainer = exBlock.querySelector('.sets-container');
    addSetRow(setsContainer); // Primera serie por defecto

    exBlock.querySelector('.add-set-btn').addEventListener('click', () => {
      addSetRow(setsContainer);
    });
  });

  // Cambiar vista
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  viewWorkout.classList.add('active');
  
  startTimer();
}

function addSetRow(container) {
  const setNumber = container.children.length + 1;
  const row = document.createElement('div');
  row.className = 'set-row';
  
  row.innerHTML = `
    <span>${setNumber}</span>
    <input type="number" class="weight-input" placeholder="Peso" min="0" step="0.25">
    <select class="unit-input">
      <option value="kg">kg</option>
      <option value="lb">lb</option>
    </select>
    <input type="number" class="reps-input" placeholder="Reps" min="0" step="1">
    <input type="checkbox" class="set-checkbox">
  `;

  const checkbox = row.querySelector('.set-checkbox');
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) row.classList.add('set-completed');
    else row.classList.remove('set-completed');
  });

  container.appendChild(row);
}



// Finalizar y Guardar
// Finalizar y Guardar
document.getElementById('finish-workout-btn').addEventListener('click', () => {
  if (!confirm('¿Finalizar y guardar el entrenamiento?')) return;
  
  stopTimer();
  
  const history = JSON.parse(localStorage.getItem('gymlog_history')) || [];
  const workoutData = {
    id: 'w_' + Date.now(),
    date: new Date().toISOString(),
    routineId: activeRoutineId,
    durationSeconds: workoutSeconds,
    exercises: []
  };

  const exerciseBlocks = activeExercisesContainer.querySelectorAll('.active-exercise');
  
  exerciseBlocks.forEach(block => {
    const exName = block.dataset.name;
    const rows = block.querySelectorAll('.set-row');
    const completedSets = [];

    // --- AQUÍ INICIA EL BLOQUE REEMPLAZADO ---
    rows.forEach(row => {
      const isChecked = row.querySelector('.set-checkbox').checked;
      if (isChecked) {
        const weightRaw = parseFloat(row.querySelector('.weight-input').value) || 0;
        const unit = row.querySelector('.unit-input').value;
        const reps = parseInt(row.querySelector('.reps-input').value) || 0;
        
        // Conversión objetiva a Kg
        const weightKg = unit === 'lb' ? weightRaw * 0.453592 : weightRaw;
        
        completedSets.push({ 
          weightRaw: weightRaw, 
          unit: unit, 
          weightKg: weightKg, 
          reps: reps 
        });
      }
    });
    // --- AQUÍ TERMINA EL BLOQUE REEMPLAZADO ---

    if (completedSets.length > 0) {
      workoutData.exercises.push({ name: exName, sets: completedSets });
    }
  });

  if (workoutData.exercises.length > 0) {
    history.push(workoutData);
    localStorage.setItem('gymlog_history', JSON.stringify(history));
    alert('Entrenamiento guardado en el historial.');
  } else {
    alert('Entrenamiento cancelado: No se registraron series.');
  }

  switchTab('routines');
});

// Cancelar entrenamiento
document.getElementById('cancel-workout-btn').addEventListener('click', () => {
  if (confirm('¿Seguro que deseas cancelar? Los datos de esta sesión se perderán.')) {
    stopTimer();
    switchTab('routines');
  }
});

function renderMetrics() {
  const history = JSON.parse(localStorage.getItem('gymlog_history')) || [];
  
  historyContainer.innerHTML = '';
  prsContainer.innerHTML = '';

  if (history.length === 0) {
    historyContainer.innerHTML = '<p class="empty-msg">No hay sesiones registradas.</p>';
    prsContainer.innerHTML = '<p class="empty-msg">No hay récords registrados.</p>';
    return;
  }

  // 1. Procesar Historial de Sesiones (Volumen por sesión)
  history.slice().reverse().forEach(session => {
    const routine = routines.find(r => r.id === session.routineId);
    const routineName = routine ? routine.name : 'Rutina Eliminada';
    const dateStr = new Date(session.date).toLocaleDateString();
    
    let totalVolumeKg = 0;
    session.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        totalVolumeKg += (set.weightKg * set.reps);
      });
    });

    const sessionCard = document.createElement('div');
    sessionCard.className = 'metric-card';
    sessionCard.innerHTML = `
      <h3>${routineName} - ${dateStr}</h3>
      <div class="metric-value">Volumen Total: ${totalVolumeKg.toFixed(2)} kg</div>
      <div style="font-size: 0.8rem; color: var(--text-secondary);">Duración: ${formatTime(session.durationSeconds)}</div>
    `;
    historyContainer.appendChild(sessionCard);
  });

  // 2. Procesar Récords Personales (PR por ejercicio)
  const prMap = {};

  history.forEach(session => {
    session.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (!prMap[ex.name] || set.weightKg > prMap[ex.name].weightKg) {
          prMap[ex.name] = { weightKg: set.weightKg, reps: set.reps };
        }
      });
    });
  });

  const prKeys = Object.keys(prMap);
  if (prKeys.length === 0) {
    prsContainer.innerHTML = '<p class="empty-msg">No hay récords calculables.</p>';
    return;
  }

  prKeys.sort().forEach(exName => {
    const prCard = document.createElement('div');
    prCard.className = 'metric-card';
    prCard.innerHTML = `
      <h3>${exName}</h3>
      <div class="metric-value">Max: ${prMap[exName].weightKg.toFixed(2)} kg x ${prMap[exName].reps} reps</div>
    `;
    prsContainer.appendChild(prCard);
  });
}