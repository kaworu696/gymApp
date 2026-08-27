// 1. Configuración de Almacenamiento Local
const STORAGE_KEY = 'gymlog_routines';
let routines = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// 2. Referencias a Elementos del DOM
const tabRoutinesBtn = document.getElementById('tab-routines-btn');
const tabCreateBtn = document.getElementById('tab-create-btn');
const tabMetricsBtn = document.getElementById('tab-metrics-btn');

const viewRoutines = document.getElementById('view-routines');
const viewCreate = document.getElementById('view-create');
const viewMetrics = document.getElementById('view-metrics');
const viewWorkout = document.getElementById('view-workout');

const routinesList = document.getElementById('routines-list');
const routineForm = document.getElementById('routine-form');
const addExerciseBtn = document.getElementById('add-exercise-btn');
const exerciseInputsContainer = document.getElementById('exercise-inputs-container');

const activeExercisesContainer = document.getElementById('active-exercises-container');
const workoutTimerDisplay = document.getElementById('workout-timer');
const activeRoutineName = document.getElementById('active-routine-name');

const historyContainer = document.getElementById('history-container');
const prsContainer = document.getElementById('prs-container');



// Variables de estado
let timerInterval;
let startTime = 0;
let workoutSeconds = 0;
let activeRoutineId = null;

let editingRoutineId = null; // Nueva variable para controlar la edición
let activeRoutineId = null;

// 3. Navegación por pestañas
const tabWorkoutBtn = document.getElementById('tab-workout-btn');
if (tabWorkoutBtn) tabWorkoutBtn.addEventListener('click', () => switchTab('workout'));

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));

  if (tab === 'routines') {
    if (tabRoutinesBtn) tabRoutinesBtn.classList.add('active');
    if (viewRoutines) viewRoutines.classList.add('active');
    renderRoutines();
  } else if (tab === 'create') {
    if (tabCreateBtn) tabCreateBtn.classList.add('active');
    if (viewCreate) viewCreate.classList.add('active');
  } else if (tab === 'metrics') {
    if (tabMetricsBtn) tabMetricsBtn.classList.add('active');
    if (viewMetrics) viewMetrics.classList.add('active');
    renderMetrics();
  } else if (tab === 'workout') {
    if (tabWorkoutBtn) tabWorkoutBtn.classList.add('active');
    if (viewWorkout) viewWorkout.classList.add('active');
  }
}

if (tabRoutinesBtn) tabRoutinesBtn.addEventListener('click', () => switchTab('routines'));
if (tabCreateBtn) tabCreateBtn.addEventListener('click', () => switchTab('create'));
if (tabMetricsBtn) tabMetricsBtn.addEventListener('click', () => switchTab('metrics'));

// 4. Gestión Dinámica de Entradas de Ejercicios
function createExerciseInput() {
  if (!exerciseInputsContainer) return;
  const row = document.createElement('div');
  row.className = 'exercise-input-row';
  row.innerHTML = `
    <input type="text" class="exercise-name-input" placeholder="Ej. Press de Banca" required>
    <button type="button" class="btn-icon remove-exercise-btn">&times;</button>
  `;
  
  row.querySelector('.remove-exercise-btn').addEventListener('click', () => {
    row.remove();
  });
  
  exerciseInputsContainer.appendChild(row);
}

if (addExerciseBtn) {
  addExerciseBtn.addEventListener('click', createExerciseInput);
}

// Asignación segura del evento de eliminación inicial
const initialRemoveBtn = document.querySelector('.remove-exercise-btn');
if (initialRemoveBtn) {
  initialRemoveBtn.addEventListener('click', function(e) {
    e.target.parentElement.remove();
  });
}

// 5. Lógica para Guardar una Rutina
// 5. Lógica para Guardar/Editar una Rutina
if (routineForm) {
  routineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const routineNameInput = document.getElementById('routine-name');
    const routineName = routineNameInput ? routineNameInput.value.trim() : '';
    const exerciseInputs = document.querySelectorAll('.exercise-name-input');
    
    const exercises = Array.from(exerciseInputs)
                           .map(input => input.value.trim())
                           .filter(val => val !== '');
    
    if (exercises.length === 0) {
      alert('Debes agregar al menos un ejercicio válido.');
      return;
    }

    if (editingRoutineId) {
      // Editar rutina existente
      const index = routines.findIndex(r => r.id === editingRoutineId);
      if (index !== -1) {
        routines[index].name = routineName;
        routines[index].exercises = exercises;
      }
      editingRoutineId = null;
    } else {
      // Crear nueva rutina
      const newRoutine = {
        id: 'r_' + Date.now(),
        name: routineName,
        exercises: exercises
      };
      routines.push(newRoutine);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
    
    routineForm.reset();
    exerciseInputsContainer.innerHTML = '';
    createExerciseInput();
    
    switchTab('routines');
  });
}

// 6. Lógica para Renderizar Rutinas en Pantalla
function renderRoutines() {
  if (!routinesList) return;

  if (routines.length === 0) {
    routinesList.innerHTML = '<p class="empty-msg">No hay rutinas creadas.</p>';
    return;
  }

  routinesList.innerHTML = '';
  
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
    
    const startBtn = document.createElement('button');
    startBtn.textContent = 'Comenzar Entrenamiento';
    startBtn.className = 'btn btn-primary';
    startBtn.style.marginTop = '12px';
    startBtn.addEventListener('click', () => startWorkout(routine.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Eliminar Rutina';
    deleteBtn.className = 'btn btn-secondary';
    deleteBtn.style.borderColor = 'var(--danger-color)';
    deleteBtn.style.color = 'var(--danger-color)';
    deleteBtn.style.marginTop = '8px';
    
    deleteBtn.addEventListener('click', () => {
      if (confirm(`¿Eliminar la rutina "${routine.name}"?`)) {
        routines = routines.filter(r => r.id !== routine.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
        renderRoutines();
      }
    });

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar Rutina';
    editBtn.className = 'btn btn-secondary';
    editBtn.style.marginTop = '8px';
    
    editBtn.addEventListener('click', () => {
      editingRoutineId = routine.id;
      document.getElementById('routine-name').value = routine.name;
      
      exerciseInputsContainer.innerHTML = '';
      routine.exercises.forEach(ex => {
        const row = document.createElement('div');
        row.className = 'exercise-input-row';
        row.innerHTML = `
          <input type="text" class="exercise-name-input" value="${ex}" required>
          <button type="button" class="btn-icon remove-exercise-btn">&times;</button>
        `;
        row.querySelector('.remove-exercise-btn').addEventListener('click', () => row.remove());
        exerciseInputsContainer.appendChild(row);
      });
      
      switchTab('create');
    });

    card.appendChild(title);
    card.appendChild(list);
    card.appendChild(startBtn);
    card.appendChild(editBtn); // Nuevo botón agregado
    card.appendChild(deleteBtn);


    
    routinesList.appendChild(card);
  });
}

// 7. Lógica de Cronómetro
function formatTime(totalSeconds) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function startTimer() {
  startTime = Date.now();
  workoutSeconds = 0;
  if (workoutTimerDisplay) workoutTimerDisplay.textContent = formatTime(0);

  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const currentTime = Date.now();
    workoutSeconds = Math.floor((currentTime - startTime) / 1000);
    if (workoutTimerDisplay) workoutTimerDisplay.textContent = formatTime(workoutSeconds);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// 8. Lógica de Entrenamiento Activo
function startWorkout(id) {
  const routine = routines.find(r => r.id === id);
  if (!routine) return;

  activeRoutineId = routine.id;
  if (activeRoutineName) activeRoutineName.textContent = routine.name;
  if (activeExercisesContainer) activeExercisesContainer.innerHTML = '';

  // Cargar datos históricos para sugerencias y PRs
  const history = JSON.parse(localStorage.getItem('gymlog_history')) || [];
  const notesData = JSON.parse(localStorage.getItem('gymlog_notes')) || {};

  // Función interna para obtener PR de un ejercicio
  const getPR = (exName) => {
    let maxKg = 0; let bestReps = 0;
    history.forEach(s => s.exercises.forEach(e => {
      if (e.name === exName) {
        e.sets.forEach(set => {
          if (set.weightKg > maxKg) { maxKg = set.weightKg; bestReps = set.reps; }
        });
      }
    }));
    return maxKg > 0 ? `${maxKg.toFixed(2)}kg x ${bestReps}` : null;
  };

  // Función interna para obtener las series del último entrenamiento
  const getLastSets = (exName) => {
    for (let i = history.length - 1; i >= 0; i--) {
      const ex = history[i].exercises.find(e => e.name === exName);
      if (ex) return ex.sets;
    }
    return [];
  };

  routine.exercises.forEach(exName => {
    const exBlock = document.createElement('div');
    exBlock.className = 'active-exercise';
    exBlock.dataset.name = exName;
    
    const pr = getPR(exName);
    const savedNote = notesData[exName] || '';
    const lastSets = getLastSets(exName);
    
    exBlock.innerHTML = `
      <div class="exercise-header">
        <h3>${exName}</h3>
        ${pr ? `<span class="pr-badge">Max: ${pr}</span>` : ''}
      </div>
      <textarea class="exercise-note" data-ex="${exName}" placeholder="Notas (Ej. Controlar fase excéntrica, maximizar tensión mecánica en elongación, subir peso...)" rows="2">${savedNote}</textarea>
      <div class="sets-container"></div>
      <button class="btn btn-secondary add-set-btn" style="font-size: 0.85rem; padding: 8px; margin-top: 8px;">+ Añadir Serie</button>
    `;
    
    activeExercisesContainer.appendChild(exBlock);
    
    const setsContainer = exBlock.querySelector('.sets-container');
    
    // Autocompletar series basadas en el último entrenamiento
    if (lastSets.length > 0) {
      lastSets.forEach(set => addSetRow(setsContainer, set));
    } else {
      addSetRow(setsContainer);
    }

    exBlock.querySelector('.add-set-btn').addEventListener('click', () => {
      addSetRow(setsContainer);
    });

    // Evento para guardar notas automáticamente
    exBlock.querySelector('.exercise-note').addEventListener('change', (e) => {
      const currentNotes = JSON.parse(localStorage.getItem('gymlog_notes')) || {};
      currentNotes[e.target.dataset.ex] = e.target.value.trim();
      localStorage.setItem('gymlog_notes', JSON.stringify(currentNotes));
    });
  });

  if (tabWorkoutBtn) {
    tabWorkoutBtn.style.display = 'table-cell';
  }
  switchTab('workout');
  startTimer();
}

function addSetRow(container, prefillData = null) {
  const setNumber = container.children.length + 1;
  const row = document.createElement('div');
  row.className = 'set-row';
  
  const wVal = prefillData ? prefillData.weightRaw : '';
  const rVal = prefillData ? prefillData.reps : '';
  const uVal = prefillData ? prefillData.unit : 'kg';
  
  row.innerHTML = `
    <span class="set-number">${setNumber}</span>
    <input type="number" class="weight-input" placeholder="Peso" min="0" step="0.25" value="${wVal}">
    <select class="unit-input">
      <option value="kg" ${uVal === 'kg' ? 'selected' : ''}>kg</option>
      <option value="lb" ${uVal === 'lb' ? 'selected' : ''}>lb</option>
    </select>
    <input type="number" class="reps-input" placeholder="Reps" min="0" step="1" value="${rVal}">
    <input type="checkbox" class="set-checkbox">
    <button type="button" class="btn-icon delete-set-btn" style="font-size: 1.2rem;">&times;</button>
  `;

  const checkbox = row.querySelector('.set-checkbox');
  checkbox.addEventListener('change', (e) => {
    if (e.target.checked) row.classList.add('set-completed');
    else row.classList.remove('set-completed');
  });

  // Lógica para eliminar la serie
  const deleteBtn = row.querySelector('.delete-set-btn');
  deleteBtn.addEventListener('click', () => {
    row.remove();
    // Renumerar las series existentes
    const remainingRows = container.querySelectorAll('.set-row');
    remainingRows.forEach((r, index) => {
      r.querySelector('.set-number').textContent = index + 1;
    });
  });

  container.appendChild(row);
}

// Finalizar y Guardar Entrenamiento
const finishBtn = document.getElementById('finish-workout-btn');
if (finishBtn) {
  finishBtn.addEventListener('click', () => {
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

      rows.forEach(row => {
        const isChecked = row.querySelector('.set-checkbox').checked;
        if (isChecked) {
          const weightRaw = parseFloat(row.querySelector('.weight-input').value) || 0;
          const unit = row.querySelector('.unit-input').value;
          const reps = parseInt(row.querySelector('.reps-input').value) || 0;
          
          const weightKg = unit === 'lb' ? weightRaw * 0.453592 : weightRaw;
          
          completedSets.push({ 
            weightRaw: weightRaw, 
            unit: unit, 
            weightKg: weightKg, 
            reps: reps 
          });
        }
      });

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

    if (tabWorkoutBtn) tabWorkoutBtn.style.display = 'none';
    activeRoutineId = null;
    switchTab('routines');
  });
}

// Cancelar Entrenamiento
const cancelBtn = document.getElementById('cancel-workout-btn');
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    if (confirm('¿Seguro que deseas cancelar? Los datos de esta sesión se perderán.')) {
      if (tabWorkoutBtn) tabWorkoutBtn.style.display = 'none';
      activeRoutineId = null;
      switchTab('routines');
    }
  });
}

// 9. Lógica de Métricas
function renderMetrics() {
  const history = JSON.parse(localStorage.getItem('gymlog_history')) || [];
  
  if (!historyContainer || !prsContainer) return;

  // Limpieza inicial segura
  historyContainer.innerHTML = '';
  prsContainer.innerHTML = '';
  const existingChartSection = document.getElementById('chart-section-wrapper');
  if (existingChartSection) existingChartSection.remove();

  if (history.length === 0) {
    historyContainer.innerHTML = '<p class="empty-msg">No hay sesiones registradas.</p>';
    prsContainer.innerHTML = '<p class="empty-msg">No hay récords registrados.</p>';
    return;
  }

// Renderizado del Historial Expandible con Límite
  let isHistoryExpanded = false;
  const renderHistoryList = () => {
    historyContainer.innerHTML = '';
    const reversedHistory = history.slice().reverse();
    const displayList = isHistoryExpanded ? reversedHistory : reversedHistory.slice(0, 3);

    displayList.forEach(session => {
      const routine = routines.find(r => r.id === session.routineId);
      const routineName = routine ? routine.name : 'Rutina Eliminada';
      const dateStr = new Date(session.date).toLocaleDateString();
      
      let totalVolumeKg = 0;
      let detailsHtml = '<div class="session-details-content">';
      
      session.exercises.forEach(ex => {
        detailsHtml += `<div class="session-details-row"><strong>${ex.name}</strong><br>`;
        ex.sets.forEach((set, i) => {
          totalVolumeKg += (set.weightKg * set.reps);
          detailsHtml += `<span class="set-pill">S${i+1}: ${set.weightRaw}${set.unit} x ${set.reps}</span>`;
        });
        detailsHtml += `</div>`;
      });
      detailsHtml += '</div>';

      const sessionCard = document.createElement('div');
      sessionCard.className = 'metric-card';
      sessionCard.innerHTML = `
        <h3>${routineName} - ${dateStr}</h3>
        <div class="metric-value">Volumen Total: ${totalVolumeKg.toFixed(2)} kg</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">Duración: ${formatTime(session.durationSeconds)}</div>
        <details class="session-details">
          <summary>Desplegar ejercicios</summary>
          ${detailsHtml}
        </details>
      `;
      historyContainer.appendChild(sessionCard);
    });

    if (reversedHistory.length > 3) {
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'btn btn-secondary';
      toggleBtn.textContent = isHistoryExpanded ? 'Ver menos' : 'Ver todo el historial';
      toggleBtn.addEventListener('click', () => {
        isHistoryExpanded = !isHistoryExpanded;
        renderHistoryList();
      });
      historyContainer.appendChild(toggleBtn);
    }
  };
  renderHistoryList();

  // Renderizado de PRs Globales con Selector
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

  const prKeys = Object.keys(prMap).sort();
  if (prKeys.length === 0) {
    prsContainer.innerHTML = '<p class="empty-msg">No hay récords calculables.</p>';
  } else {
    const prSelectHtml = `<select id="pr-exercise-selector" class="chart-selector">
      ${prKeys.map(k => `<option value="${k}">${k}</option>`).join('')}
    </select>`;
    
    const prRenderArea = document.createElement('div');
    prsContainer.innerHTML = prSelectHtml;
    prsContainer.appendChild(prRenderArea);

    const renderSelectedPr = (exName) => {
      if (!prMap[exName]) return;
      prRenderArea.innerHTML = `
        <div class="metric-card">
          <h3>${exName}</h3>
          <div class="metric-value">Max: ${prMap[exName].weightKg.toFixed(2)} kg x ${prMap[exName].reps} reps</div>
        </div>
      `;
    };

    const prSelector = document.getElementById('pr-exercise-selector');
    renderSelectedPr(prSelector.value);

    prSelector.addEventListener('change', (e) => {
      renderSelectedPr(e.target.value);
    });
  }

  const prKeys = Object.keys(prMap);
  if (prKeys.length === 0) {
    prsContainer.innerHTML = '<p class="empty-msg">No hay récords calculables.</p>';
  } else {
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

  // Procesamiento y Renderizado de Gráficas Verticales Selectivas
  const volumeData = {};
  // Se itera en orden cronológico directo para que la gráfica crezca de izquierda a derecha
  history.forEach(session => {
    const dateStr = new Date(session.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    session.exercises.forEach(ex => {
      let dailyVolume = 0;
      ex.sets.forEach(set => dailyVolume += (set.weightKg * set.reps));
      
      if (dailyVolume > 0) {
        if (!volumeData[ex.name]) volumeData[ex.name] = [];
        volumeData[ex.name].push({ date: dateStr, volume: dailyVolume });
      }
    });
  });

  const chartKeys = Object.keys(volumeData).sort();
  
  if (chartKeys.length > 0) {
    const wrapper = document.createElement('div');
    wrapper.id = 'chart-section-wrapper';
    
    const chartsTitle = document.createElement('h2');
    chartsTitle.className = 'chart-section-title';
    chartsTitle.style.marginTop = '32px';
    chartsTitle.textContent = 'Progresión de Volumen';
    
    const chartCard = document.createElement('div');
    chartCard.className = 'metric-card';

    const selectHtml = `<select id="chart-exercise-selector" class="chart-selector">
      ${chartKeys.map(k => `<option value="${k}">${k}</option>`).join('')}
    </select>`;

    const chartRenderArea = document.createElement('div');
    chartRenderArea.id = 'chart-render-area';

    chartCard.innerHTML = selectHtml;
    chartCard.appendChild(chartRenderArea);
    
    wrapper.appendChild(chartsTitle);
    wrapper.appendChild(chartCard);
    viewMetrics.appendChild(wrapper);

    const selector = document.getElementById('chart-exercise-selector');

    const drawVerticalChart = (exName) => {
      const dataPoints = volumeData[exName];
      const maxVolume = Math.max(...dataPoints.map(d => d.volume));

      let barsHtml = '<div class="vertical-chart-container">';
      dataPoints.forEach(point => {
        const heightPercent = maxVolume > 0 ? (point.volume / maxVolume) * 100 : 0;
        barsHtml += `
          <div class="v-chart-bar-wrapper">
            <span class="v-chart-value">${Math.round(point.volume)}</span>
            <div class="v-chart-bar" style="height: ${heightPercent}%;"></div>
            <span class="v-chart-label">${point.date}</span>
          </div>
        `;
      });
      barsHtml += '</div>';
      chartRenderArea.innerHTML = barsHtml;
    };

    // Inicializar con el primer ejercicio disponible
    drawVerticalChart(chartKeys[0]);

    selector.addEventListener('change', (e) => {
      drawVerticalChart(e.target.value);
    });
  }
}

// 10. Inicialización al cargar la página
renderRoutines();

// 11. Registro del Service Worker
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



// 12. Exportar Datos
const exportBtn = document.getElementById('export-btn');
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const backupData = {
      routines: JSON.parse(localStorage.getItem('gymlog_routines')) || [],
      history: JSON.parse(localStorage.getItem('gymlog_history')) || [],
      notes: JSON.parse(localStorage.getItem('gymlog_notes')) || {}
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymlog_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// 13. Unificación de Datos (Ejecución en Móvil)
const unifyBtn = document.getElementById('unify-btn');
if (unifyBtn) {
  unifyBtn.addEventListener('click', () => {
    const nombreIncorrecto = prompt("Ingresa el nombre EXACTO a reemplazar:");
    if (!nombreIncorrecto) return;
    
    const nombreCorrecto = prompt("Ingresa el nombre EXACTO que se mantendrá:");
    if (!nombreCorrecto) return;

    let history = JSON.parse(localStorage.getItem('gymlog_history')) || [];
    history.forEach(session => {
      session.exercises.forEach(ex => {
        if (ex.name === nombreIncorrecto) ex.name = nombreCorrecto;
      });
    });
    localStorage.setItem('gymlog_history', JSON.stringify(history));

    let routines = JSON.parse(localStorage.getItem('gymlog_routines')) || [];
    routines.forEach(routine => {
      routine.exercises = routine.exercises.map(ex => ex === nombreIncorrecto ? nombreCorrecto : ex);
    });
    localStorage.setItem('gymlog_routines', JSON.stringify(routines));

    let notes = JSON.parse(localStorage.getItem('gymlog_notes')) || {};
    if (notes[nombreIncorrecto]) {
      notes[nombreCorrecto] = notes[nombreCorrecto] 
        ? notes[nombreCorrecto] + " | " + notes[nombreIncorrecto] 
        : notes[nombreIncorrecto];
      delete notes[nombreIncorrecto];
      localStorage.setItem('gymlog_notes', JSON.stringify(notes));
    }

    alert(`Se unificaron los datos de "${nombreIncorrecto}" a "${nombreCorrecto}".`);
    location.reload();
  });
}
