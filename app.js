// ==========================================================================
// GymLog - Aplicación de Registro de Métricas de Gimnasio
// ==========================================================================

// 1. Constantes de Almacenamiento Local
const STORAGE_KEY = 'gymlog_routines';
const HISTORY_KEY = 'gymlog_history';
const NOTES_KEY = 'gymlog_notes';

// Estado global en memoria
let routines = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
let notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};

// Normalización y saneamiento inicial de datos
function cleanAndRepairData() {
  let modified = false;

  // Limpiar rutinas
  routines.forEach(routine => {
    if (routine.exercises && Array.isArray(routine.exercises)) {
      const cleaned = routine.exercises
        .map(ex => typeof ex === 'string' ? ex.trim() : '')
        .filter(ex => ex.length > 0);
      // Deduplicar dentro de la misma rutina
      const dedup = Array.from(new Set(cleaned));
      if (JSON.stringify(routine.exercises) !== JSON.stringify(dedup)) {
        routine.exercises = dedup;
        modified = true;
      }
    }
  });

  // Limpiar historial
  history.forEach(session => {
    if (session.exercises && Array.isArray(session.exercises)) {
      session.exercises.forEach(ex => {
        if (typeof ex.name === 'string') {
          const trimmed = ex.name.trim();
          if (trimmed !== ex.name) {
            ex.name = trimmed;
            modified = true;
          }
        }
        if (ex.sets && Array.isArray(ex.sets)) {
          ex.sets.forEach(set => {
            const raw = parseFloat(set.weightRaw) || 0;
            const reps = parseInt(set.reps) || 0;
            const unit = set.unit === 'lb' ? 'lb' : 'kg';
            const weightKg = unit === 'lb' ? raw * 0.453592 : raw;
            if (set.weightKg === undefined || isNaN(set.weightKg)) {
              set.weightKg = weightKg;
              modified = true;
            }
            set.reps = reps;
            set.weightRaw = raw;
            set.unit = unit;
          });
        }
      });
    }
  });

  if (modified) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}
cleanAndRepairData();

// 2. Referencias a Elementos del DOM
const tabRoutinesBtn = document.getElementById('tab-routines-btn');
const tabCreateBtn = document.getElementById('tab-create-btn');
const tabMetricsBtn = document.getElementById('tab-metrics-btn');
const tabWorkoutBtn = document.getElementById('tab-workout-btn');
const activeWorkoutPill = document.getElementById('active-workout-pill');

const viewRoutines = document.getElementById('view-routines');
const viewCreate = document.getElementById('view-create');
const viewMetrics = document.getElementById('view-metrics');
const viewWorkout = document.getElementById('view-workout');

const routinesList = document.getElementById('routines-list');
const routineForm = document.getElementById('routine-form');
const routineNameInput = document.getElementById('routine-name');
const formViewTitle = document.getElementById('form-view-title');
const tabCreateLabel = document.getElementById('tab-create-label');
const cancelEditRoutineBtn = document.getElementById('cancel-edit-routine-btn');
const addExerciseBtn = document.getElementById('add-exercise-btn');
const exerciseInputsContainer = document.getElementById('exercise-inputs-container');
const quickCreateRoutineBtn = document.getElementById('quick-create-routine-btn');

// Vista Entrenamiento
const activeExercisesContainer = document.getElementById('active-exercises-container');
const workoutTimerDisplay = document.getElementById('workout-timer');
const activeRoutineName = document.getElementById('active-routine-name');
const finishBtn = document.getElementById('finish-workout-btn');
const cancelBtn = document.getElementById('cancel-workout-btn');

// Métricas y Reorganización
const kpiTotalWorkouts = document.getElementById('kpi-total-workouts');
const kpiTotalVolume = document.getElementById('kpi-total-volume');
const kpiTotalPrs = document.getElementById('kpi-total-prs');
const historyContainer = document.getElementById('history-container');
const historySearchInput = document.getElementById('history-search-input');
const prsContainer = document.getElementById('prs-container');
const chartSectionWrapper = document.getElementById('chart-section-wrapper');

// Modal de Edición de Sesión
const modalEditSession = document.getElementById('modal-edit-session');
const modalEditTitle = document.getElementById('modal-edit-title');
const editSessionCloseBtn = document.getElementById('edit-session-close-btn');
const editSessionCancelBtn = document.getElementById('edit-session-cancel-btn');
const editSessionSaveBtn = document.getElementById('edit-session-save-btn');
const editSessionDateInput = document.getElementById('edit-session-date');
const editSessionDurationInput = document.getElementById('edit-session-duration');
const editSessionExercisesContainer = document.getElementById('edit-session-exercises-container');
const editSessionAddExerciseBtn = document.getElementById('edit-session-add-exercise-btn');

// Modal de Unificar Ejercicios
const modalUnify = document.getElementById('modal-unify');
const unifyBtn = document.getElementById('unify-btn');
const unifyCloseBtn = document.getElementById('unify-close-btn');
const unifyCancelBtn = document.getElementById('unify-cancel-btn');
const unifyConfirmBtn = document.getElementById('unify-confirm-btn');
const unifySourceSelect = document.getElementById('unify-source-select');
const unifyTargetSelect = document.getElementById('unify-target-select');
const unifyCustomGroup = document.getElementById('unify-custom-group');
const unifyCustomName = document.getElementById('unify-custom-name');
const unifyPreviewBox = document.getElementById('unify-preview-box');

// Herramientas de Import / Export
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const importFileInput = document.getElementById('import-file-input');

// Notificaciones Toast
const toastContainer = document.getElementById('toast-container');

// Variables de Estado de Ejecución
let timerInterval = null;
let startTime = 0;
let workoutSeconds = 0;
let editingRoutineId = null;
let activeRoutineId = null;
let editingSessionId = null;
let currentMetricsSubview = 'history';

// 3. Sistema de Notificaciones Toast
function showToast(message, type = 'success') {
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠️'}</span>
    <div>${message}</div>
  `;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    if (toast.parentElement) toast.remove();
  }, 3000);
}

// 4. Formateo de Tiempos y Números
function formatTime(totalSeconds) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatVolume(val) {
  return new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(val);
}

// 5. Navegación Principal por Pestañas
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
    if (!editingRoutineId) {
      resetRoutineForm();
    }
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
if (tabCreateBtn) tabCreateBtn.addEventListener('click', () => {
  editingRoutineId = null;
  resetRoutineForm();
  switchTab('create');
});
if (tabMetricsBtn) tabMetricsBtn.addEventListener('click', () => switchTab('metrics'));
if (tabWorkoutBtn) tabWorkoutBtn.addEventListener('click', () => switchTab('workout'));
if (quickCreateRoutineBtn) quickCreateRoutineBtn.addEventListener('click', () => {
  editingRoutineId = null;
  resetRoutineForm();
  switchTab('create');
});

// Subnavegación de Métricas
document.querySelectorAll('.metrics-subnav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const subview = btn.dataset.subview;
    switchMetricsSubview(subview);
  });
});

function switchMetricsSubview(subview) {
  currentMetricsSubview = subview;
  document.querySelectorAll('.metrics-subnav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.subview === subview);
  });
  document.querySelectorAll('.metrics-subview').forEach(view => {
    view.classList.toggle('active', view.id === `metrics-subview-${subview}`);
  });
}

// 6. Gestión de Rutinas y Reordenamiento (Objetivo 3)
function renderRoutines() {
  if (!routinesList) return;

  if (routines.length === 0) {
    routinesList.innerHTML = `
      <div class="empty-msg">
        <p>No tienes rutinas creadas todavía.</p>
        <button class="btn btn-primary btn-sm" style="margin-top: 12px;" onclick="switchTab('create')">Crear mi primera rutina</button>
      </div>
    `;
    return;
  }

  routinesList.innerHTML = '';

  routines.forEach((routine, index) => {
    const card = document.createElement('div');
    card.className = 'routine-card';
    card.draggable = true;
    card.dataset.index = index;

    // Chips de ejercicios
    const chipsHtml = routine.exercises && routine.exercises.length > 0
      ? routine.exercises.map(ex => `<span class="exercise-chip">${ex}</span>`).join('')
      : '<span class="routine-card-meta">Sin ejercicios configurados</span>';

    const isFirst = index === 0;
    const isLast = index === routines.length - 1;

    card.innerHTML = `
      <div class="routine-card-header">
        <div class="routine-card-title-group">
          <h3 class="routine-card-title">${routine.name}</h3>
          <div class="routine-card-meta">${routine.exercises ? routine.exercises.length : 0} ejercicios</div>
        </div>
        <div class="routine-actions-group">
          <button type="button" class="btn-icon-sm move-up-btn" title="Mover arriba" ${isFirst ? 'disabled' : ''}>▲</button>
          <button type="button" class="btn-icon-sm move-down-btn" title="Mover abajo" ${isLast ? 'disabled' : ''}>▼</button>
          <button type="button" class="btn-icon-sm edit-btn" title="Editar rutina">✏️</button>
          <button type="button" class="btn-icon-sm delete delete-btn" title="Eliminar rutina">🗑️</button>
        </div>
      </div>
      <div class="routine-exercises-chips">
        ${chipsHtml}
      </div>
      <div class="routine-card-footer">
        <button class="btn btn-primary btn-block start-workout-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Comenzar Entrenamiento
        </button>
      </div>
    `;

    // Eventos de botones
    card.querySelector('.move-up-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      moveRoutine(index, -1);
    });

    card.querySelector('.move-down-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      moveRoutine(index, 1);
    });

    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      startEditingRoutine(routine.id);
    });

    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar la rutina "${routine.name}"? Los datos históricos no se perderán.`)) {
        routines = routines.filter(r => r.id !== routine.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
        showToast('Rutina eliminada');
        renderRoutines();
      }
    });

    card.querySelector('.start-workout-btn').addEventListener('click', () => {
      startWorkout(routine.id);
    });

    // Soporte para Drag & Drop (reordenar arrastrando)
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', index);
      card.style.opacity = '0.5';
    });

    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      card.style.borderColor = 'var(--accent-color)';
    });

    card.addEventListener('dragleave', () => {
      card.style.borderColor = 'var(--card-border)';
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.style.borderColor = 'var(--card-border)';
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIndex = index;
      if (!isNaN(fromIndex) && fromIndex !== toIndex) {
        const [moved] = routines.splice(fromIndex, 1);
        routines.splice(toIndex, 0, moved);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
        renderRoutines();
        showToast('Orden de rutinas actualizado');
      }
    });

    routinesList.appendChild(card);
  });
}

function moveRoutine(index, delta) {
  const newIndex = index + delta;
  if (newIndex < 0 || newIndex >= routines.length) return;
  const [item] = routines.splice(index, 1);
  routines.splice(newIndex, 0, item);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
  renderRoutines();
  showToast('Orden actualizado');
}

// 7. Formulario de Creación / Edición de Rutinas
function resetRoutineForm() {
  editingRoutineId = null;
  if (routineForm) routineForm.reset();
  if (formViewTitle) formViewTitle.textContent = 'Crear Rutina';
  if (tabCreateLabel) tabCreateLabel.textContent = 'Nueva Rutina';
  if (cancelEditRoutineBtn) cancelEditRoutineBtn.style.display = 'none';
  if (exerciseInputsContainer) {
    exerciseInputsContainer.innerHTML = '';
    createExerciseInputRow();
  }
}

function startEditingRoutine(id) {
  const routine = routines.find(r => r.id === id);
  if (!routine) return;

  editingRoutineId = routine.id;
  if (formViewTitle) formViewTitle.textContent = 'Editar Rutina';
  if (tabCreateLabel) tabCreateLabel.textContent = 'Editando';
  if (cancelEditRoutineBtn) cancelEditRoutineBtn.style.display = 'inline-flex';
  if (routineNameInput) routineNameInput.value = routine.name;

  if (exerciseInputsContainer) {
    exerciseInputsContainer.innerHTML = '';
    if (routine.exercises && routine.exercises.length > 0) {
      routine.exercises.forEach(ex => createExerciseInputRow(ex));
    } else {
      createExerciseInputRow();
    }
  }

  switchTab('create');
}

if (cancelEditRoutineBtn) {
  cancelEditRoutineBtn.addEventListener('click', () => {
    resetRoutineForm();
    switchTab('routines');
  });
}

function createExerciseInputRow(initialValue = '') {
  if (!exerciseInputsContainer) return;
  const row = document.createElement('div');
  row.className = 'exercise-input-row';
  row.innerHTML = `
    <input type="text" class="exercise-name-input" placeholder="Ej. Press de Banca Plano" value="${initialValue}" required>
    <button type="button" class="btn-icon remove-exercise-btn" title="Quitar ejercicio">&times;</button>
  `;

  row.querySelector('.remove-exercise-btn').addEventListener('click', () => {
    const totalRows = exerciseInputsContainer.querySelectorAll('.exercise-input-row').length;
    if (totalRows > 1) {
      row.remove();
    } else {
      row.querySelector('.exercise-name-input').value = '';
    }
  });

  exerciseInputsContainer.appendChild(row);
}

if (addExerciseBtn) {
  addExerciseBtn.addEventListener('click', () => createExerciseInputRow());
}

if (routineForm) {
  routineForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = routineNameInput ? routineNameInput.value.trim() : '';
    const inputs = exerciseInputsContainer.querySelectorAll('.exercise-name-input');
    const exercises = Array.from(inputs)
      .map(i => i.value.trim())
      .filter(val => val.length > 0);

    if (exercises.length === 0) {
      alert('Debes agregar al menos un ejercicio válido a la rutina.');
      return;
    }

    if (editingRoutineId) {
      const idx = routines.findIndex(r => r.id === editingRoutineId);
      if (idx !== -1) {
        routines[idx].name = name;
        routines[idx].exercises = Array.from(new Set(exercises));
        showToast('Rutina actualizada con éxito');
      }
    } else {
      const newRoutine = {
        id: 'r_' + Date.now(),
        name: name,
        exercises: Array.from(new Set(exercises))
      };
      routines.push(newRoutine);
      showToast('Nueva rutina creada con éxito');
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));
    resetRoutineForm();
    switchTab('routines');
  });
}

// 8. Cronómetro y Sesión de Entrenamiento Activo
function startTimer() {
  startTime = Date.now();
  workoutSeconds = 0;
  if (workoutTimerDisplay) workoutTimerDisplay.textContent = formatTime(0);
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    workoutSeconds = Math.floor((Date.now() - startTime) / 1000);
    if (workoutTimerDisplay) workoutTimerDisplay.textContent = formatTime(workoutSeconds);
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

function startWorkout(routineId) {
  const routine = routines.find(r => r.id === routineId);
  if (!routine) return;

  activeRoutineId = routine.id;
  if (activeRoutineName) activeRoutineName.textContent = routine.name;
  if (activeExercisesContainer) activeExercisesContainer.innerHTML = '';

  const notesData = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};

  // Función para obtener PR histórico del ejercicio
  const getPR = (exName) => {
    const norm = exName.trim().toLowerCase();
    let maxKg = 0;
    let bestReps = 0;
    history.forEach(session => {
      if (session.exercises) {
        session.exercises.forEach(e => {
          if (e.name && e.name.trim().toLowerCase() === norm && e.sets) {
            e.sets.forEach(set => {
              const kg = set.weightKg || (set.unit === 'lb' ? set.weightRaw * 0.453592 : set.weightRaw) || 0;
              if (kg > maxKg) {
                maxKg = kg;
                bestReps = set.reps;
              }
            });
          }
        });
      }
    });
    return maxKg > 0 ? `${maxKg.toFixed(1)}kg × ${bestReps}` : null;
  };

  // Función para obtener las series del último entrenamiento de este ejercicio
  const getLastSets = (exName) => {
    const norm = exName.trim().toLowerCase();
    for (let i = history.length - 1; i >= 0; i--) {
      const sess = history[i];
      if (sess.exercises) {
        const found = sess.exercises.find(e => e.name && e.name.trim().toLowerCase() === norm);
        if (found && found.sets && found.sets.length > 0) {
          return found.sets;
        }
      }
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
        ${pr ? `<span class="pr-badge">PR: ${pr}</span>` : ''}
      </div>
      <textarea class="exercise-note" data-ex="${exName}" placeholder="Anotaciones técnicas, postura, tempo o sensaciones..." rows="1">${savedNote}</textarea>
      
      <div class="sets-header">
        <span>#</span>
        <span>Peso</span>
        <span>Ud.</span>
        <span>Reps</span>
        <span>Listo</span>
        <span></span>
      </div>

      <div class="sets-container"></div>
      
      <button type="button" class="btn btn-secondary btn-sm add-set-btn" style="margin-top: 10px;">
        + Añadir Serie
      </button>
    `;

    activeExercisesContainer.appendChild(exBlock);

    const setsContainer = exBlock.querySelector('.sets-container');

    if (lastSets.length > 0) {
      lastSets.forEach(s => addActiveSetRow(setsContainer, s));
    } else {
      addActiveSetRow(setsContainer);
    }

    exBlock.querySelector('.add-set-btn').addEventListener('click', () => {
      addActiveSetRow(setsContainer);
    });

    exBlock.querySelector('.exercise-note').addEventListener('input', (e) => {
      const currentNotes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
      currentNotes[e.target.dataset.ex] = e.target.value.trim();
      localStorage.setItem(NOTES_KEY, JSON.stringify(currentNotes));
    });
  });

  if (tabWorkoutBtn) tabWorkoutBtn.style.display = 'inline-flex';
  if (activeWorkoutPill) activeWorkoutPill.style.display = 'inline-flex';

  switchTab('workout');
  startTimer();
}

function addActiveSetRow(container, prefill = null) {
  const setNumber = container.children.length + 1;
  const row = document.createElement('div');
  row.className = 'set-row';

  const wVal = prefill ? prefill.weightRaw : '';
  const rVal = prefill ? prefill.reps : '';
  const uVal = prefill ? prefill.unit : 'kg';

  row.innerHTML = `
    <span class="set-number">${setNumber}</span>
    <input type="number" class="weight-input" placeholder="0" min="0" step="0.25" value="${wVal}">
    <select class="unit-input">
      <option value="kg" ${uVal === 'kg' ? 'selected' : ''}>kg</option>
      <option value="lb" ${uVal === 'lb' ? 'selected' : ''}>lb</option>
    </select>
    <input type="number" class="reps-input" placeholder="0" min="0" step="1" value="${rVal}">
    <label class="set-checkbox-label">
      <input type="checkbox" class="set-checkbox">
    </label>
    <button type="button" class="btn-icon delete-set-btn">&times;</button>
  `;

  const checkbox = row.querySelector('.set-checkbox');
  checkbox.addEventListener('change', (e) => {
    row.classList.toggle('set-completed', e.target.checked);
  });

  row.querySelector('.delete-set-btn').addEventListener('click', () => {
    row.remove();
    container.querySelectorAll('.set-row').forEach((r, idx) => {
      r.querySelector('.set-number').textContent = idx + 1;
    });
  });

  container.appendChild(row);
}

// Finalizar Entrenamiento
if (finishBtn) {
  finishBtn.addEventListener('click', () => {
    if (!confirm('¿Deseas finalizar y guardar esta sesión de entrenamiento?')) return;

    stopTimer();

    const workoutData = {
      id: 'w_' + Date.now(),
      date: new Date().toISOString(),
      routineId: activeRoutineId,
      durationSeconds: workoutSeconds,
      exercises: []
    };

    const exerciseBlocks = activeExercisesContainer.querySelectorAll('.active-exercise');

    exerciseBlocks.forEach(block => {
      const exName = block.dataset.name.trim();
      const rows = block.querySelectorAll('.set-row');
      const completedSets = [];

      rows.forEach(row => {
        const isChecked = row.querySelector('.set-checkbox').checked;
        if (isChecked) {
          const raw = parseFloat(row.querySelector('.weight-input').value) || 0;
          const unit = row.querySelector('.unit-input').value;
          const reps = parseInt(row.querySelector('.reps-input').value) || 0;
          const weightKg = unit === 'lb' ? raw * 0.453592 : raw;

          completedSets.push({
            weightRaw: raw,
            unit: unit,
            weightKg: weightKg,
            reps: reps
          });
        }
      });

      if (completedSets.length > 0) {
        workoutData.exercises.push({
          name: exName,
          sets: completedSets
        });
      }
    });

    if (workoutData.exercises.length > 0) {
      history.push(workoutData);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
      showToast('¡Entrenamiento registrado con éxito!');
    } else {
      alert('Entrenamiento finalizado sin series completadas.');
    }

    if (tabWorkoutBtn) tabWorkoutBtn.style.display = 'none';
    if (activeWorkoutPill) activeWorkoutPill.style.display = 'none';
    activeRoutineId = null;
    switchTab('metrics');
  });
}

// Cancelar Entrenamiento
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    if (confirm('¿Seguro que deseas cancelar el entrenamiento en curso? Se perderán las series no guardadas.')) {
      stopTimer();
      if (tabWorkoutBtn) tabWorkoutBtn.style.display = 'none';
      if (activeWorkoutPill) activeWorkoutPill.style.display = 'none';
      activeRoutineId = null;
      switchTab('routines');
      showToast('Entrenamiento cancelado', 'error');
    }
  });
}

// 9. Métricas y KPIs Reorganizados (Objetivo 4)
function renderMetrics() {
  history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  routines = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

  // Calcular KPIs Generales
  const totalWorkouts = history.length;
  let totalVolumeKg = 0;
  const prMap = {};

  history.forEach(session => {
    if (session.exercises) {
      session.exercises.forEach(ex => {
        const exName = (ex.name || '').trim();
        if (!exName) return;

        if (ex.sets) {
          ex.sets.forEach(set => {
            const kg = set.weightKg || (set.unit === 'lb' ? set.weightRaw * 0.453592 : set.weightRaw) || 0;
            const reps = set.reps || 0;
            totalVolumeKg += (kg * reps);

            if (!prMap[exName] || kg > prMap[exName].weightKg) {
              prMap[exName] = {
                weightKg: kg,
                reps: reps,
                date: session.date
              };
            }
          });
        }
      });
    }
  });

  const uniquePrCount = Object.keys(prMap).length;

  if (kpiTotalWorkouts) kpiTotalWorkouts.textContent = totalWorkouts;
  if (kpiTotalVolume) kpiTotalVolume.textContent = `${formatVolume(totalVolumeKg)} kg`;
  if (kpiTotalPrs) kpiTotalPrs.textContent = uniquePrCount;

  // Renderizar cada sub-vista
  renderHistorySection();
  renderPRsSection(prMap);
  renderProgressionSection();
}

// Sub-vista 1: Historial de Sesiones (Objetivo 1 y 4)
function renderHistorySection() {
  if (!historyContainer) return;
  historyContainer.innerHTML = '';

  if (history.length === 0) {
    historyContainer.innerHTML = '<p class="empty-msg">No hay sesiones de entrenamiento guardadas.</p>';
    return;
  }

  const query = historySearchInput ? historySearchInput.value.toLowerCase().trim() : '';

  const reversed = history.slice().reverse();
  const filtered = reversed.filter(session => {
    if (!query) return true;
    const routine = routines.find(r => r.id === session.routineId);
    const routineName = routine ? routine.name.toLowerCase() : 'rutina';
    const dateStr = new Date(session.date).toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    }).toLowerCase();
    
    // Buscar también en nombres de ejercicios
    const hasExercise = session.exercises && session.exercises.some(e => e.name && e.name.toLowerCase().includes(query));
    return routineName.includes(query) || dateStr.includes(query) || hasExercise;
  });

  if (filtered.length === 0) {
    historyContainer.innerHTML = '<p class="empty-msg">No se encontraron sesiones que coincidan con la búsqueda.</p>';
    return;
  }

  filtered.forEach(session => {
    const routine = routines.find(r => r.id === session.routineId);
    const routineTitle = routine ? routine.name : 'Entrenamiento Libre';
    const dateObj = new Date(session.date);
    const dateFormatted = dateObj.toLocaleDateString('es-MX', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    let sessionVolume = 0;
    let exerciseDetailsHtml = '<div class="session-details-content">';

    if (session.exercises) {
      session.exercises.forEach(ex => {
        exerciseDetailsHtml += `<div class="session-details-row"><strong>${ex.name}</strong>`;
        if (ex.sets) {
          ex.sets.forEach((set, i) => {
            const kg = set.weightKg || (set.unit === 'lb' ? set.weightRaw * 0.453592 : set.weightRaw) || 0;
            sessionVolume += (kg * (set.reps || 0));
            exerciseDetailsHtml += `<span class="set-pill">S${i + 1}: ${set.weightRaw} ${set.unit} × ${set.reps}</span>`;
          });
        }
        exerciseDetailsHtml += `</div>`;
      });
    }
    exerciseDetailsHtml += '</div>';

    const card = document.createElement('div');
    card.className = 'session-card';
    card.innerHTML = `
      <div class="session-card-header">
        <div>
          <h4 class="session-routine-title">${routineTitle}</h4>
          <div class="session-date">${dateFormatted}</div>
        </div>
        <div class="session-actions-bar">
          <button type="button" class="btn-icon-sm edit-session-btn" title="Editar datos de la sesión">✏️</button>
          <button type="button" class="btn-icon-sm delete delete-session-btn" title="Eliminar sesión">🗑️</button>
        </div>
      </div>

      <div class="session-stats-bar">
        <div class="session-stat-item">Volumen: <strong>${formatVolume(sessionVolume)} kg</strong></div>
        <div class="session-stat-item">Duración: <strong>${formatTime(session.durationSeconds || 0)}</strong></div>
      </div>

      <details class="session-details">
        <summary>Ver desglose de ejercicios (${session.exercises ? session.exercises.length : 0})</summary>
        ${exerciseDetailsHtml}
      </details>
    `;

    // Evento para editar sesión
    card.querySelector('.edit-session-btn').addEventListener('click', () => {
      openEditSessionModal(session.id);
    });

    // Evento para eliminar sesión
    card.querySelector('.delete-session-btn').addEventListener('click', () => {
      if (confirm(`¿Eliminar la sesión del ${dateFormatted}? Esta acción no se puede deshacer.`)) {
        history = history.filter(s => s.id !== session.id);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        showToast('Sesión eliminada');
        renderMetrics();
      }
    });

    historyContainer.appendChild(card);
  });
}

if (historySearchInput) {
  historySearchInput.addEventListener('input', () => {
    renderHistorySection();
  });
}

// 10. Modal de Edición de Sesión (Objetivo 1)
function openEditSessionModal(sessionId) {
  const session = history.find(s => s.id === sessionId);
  if (!session) return;

  editingSessionId = session.id;

  // Formato para input datetime-local: YYYY-MM-DDTHH:MM
  const d = new Date(session.date);
  const pad = (n) => String(n).padStart(2, '0');
  const formattedLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (editSessionDateInput) editSessionDateInput.value = formattedLocal;
  if (editSessionDurationInput) editSessionDurationInput.value = Math.max(1, Math.round((session.durationSeconds || 0) / 60));

  renderEditSessionExercises(session.exercises || []);

  if (modalEditSession) modalEditSession.style.display = 'flex';
}

function closeEditSessionModal() {
  if (modalEditSession) modalEditSession.style.display = 'none';
  editingSessionId = null;
}

if (editSessionCloseBtn) editSessionCloseBtn.addEventListener('click', closeEditSessionModal);
if (editSessionCancelBtn) editSessionCancelBtn.addEventListener('click', closeEditSessionModal);

function renderEditSessionExercises(exercisesList) {
  if (!editSessionExercisesContainer) return;
  editSessionExercisesContainer.innerHTML = '';

  exercisesList.forEach(ex => {
    addEditExerciseBlock(ex.name, ex.sets || []);
  });
}

function addEditExerciseBlock(name = '', sets = []) {
  if (!editSessionExercisesContainer) return;

  const block = document.createElement('div');
  block.className = 'edit-exercise-block';

  block.innerHTML = `
    <div class="edit-exercise-header">
      <input type="text" class="edit-ex-name-input" placeholder="Nombre del ejercicio" value="${name}" required>
      <button type="button" class="btn-icon delete-edit-ex-btn" title="Eliminar este ejercicio">&times;</button>
    </div>
    
    <div class="sets-header" style="font-size: 0.65rem;">
      <span>#</span>
      <span>Peso</span>
      <span>Ud.</span>
      <span>Reps</span>
      <span></span>
    </div>

    <div class="edit-sets-container"></div>

    <button type="button" class="btn btn-secondary btn-sm add-edit-set-btn" style="margin-top: 8px;">
      + Añadir Serie
    </button>
  `;

  const setsContainer = block.querySelector('.edit-sets-container');

  if (sets.length > 0) {
    sets.forEach(set => addEditSetRow(setsContainer, set));
  } else {
    addEditSetRow(setsContainer);
  }

  block.querySelector('.add-edit-set-btn').addEventListener('click', () => {
    addEditSetRow(setsContainer);
  });

  block.querySelector('.delete-edit-ex-btn').addEventListener('click', () => {
    block.remove();
  });

  editSessionExercisesContainer.appendChild(block);
}

function addEditSetRow(container, prefill = null) {
  const setNumber = container.children.length + 1;
  const row = document.createElement('div');
  row.className = 'set-row';
  row.style.gridTemplateColumns = '30px 1.8fr 1fr 1.4fr 30px';

  const raw = prefill ? prefill.weightRaw : '';
  const reps = prefill ? prefill.reps : '';
  const unit = prefill ? prefill.unit : 'kg';

  row.innerHTML = `
    <span class="set-number">${setNumber}</span>
    <input type="number" class="weight-input" placeholder="0" min="0" step="0.25" value="${raw}" required>
    <select class="unit-input">
      <option value="kg" ${unit === 'kg' ? 'selected' : ''}>kg</option>
      <option value="lb" ${unit === 'lb' ? 'selected' : ''}>lb</option>
    </select>
    <input type="number" class="reps-input" placeholder="0" min="0" step="1" value="${reps}" required>
    <button type="button" class="btn-icon delete-set-btn">&times;</button>
  `;

  row.querySelector('.delete-set-btn').addEventListener('click', () => {
    row.remove();
    container.querySelectorAll('.set-row').forEach((r, i) => {
      r.querySelector('.set-number').textContent = i + 1;
    });
  });

  container.appendChild(row);
}

if (editSessionAddExerciseBtn) {
  editSessionAddExerciseBtn.addEventListener('click', () => {
    addEditExerciseBlock();
  });
}

// Guardar Sesión Editada
if (editSessionSaveBtn) {
  editSessionSaveBtn.addEventListener('click', () => {
    const sessionIndex = history.findIndex(s => s.id === editingSessionId);
    if (sessionIndex === -1) return;

    const newDateVal = editSessionDateInput.value;
    if (!newDateVal) {
      alert('Por favor especifica una fecha válida.');
      return;
    }

    const durationMins = parseInt(editSessionDurationInput.value, 10) || 0;
    const durationSeconds = durationMins * 60;

    const exerciseBlocks = editSessionExercisesContainer.querySelectorAll('.edit-exercise-block');
    const updatedExercises = [];

    for (const block of exerciseBlocks) {
      const name = block.querySelector('.edit-ex-name-input').value.trim();
      if (!name) continue;

      const setRows = block.querySelectorAll('.set-row');
      const sets = [];

      for (const row of setRows) {
        const raw = parseFloat(row.querySelector('.weight-input').value) || 0;
        const unit = row.querySelector('.unit-input').value;
        const reps = parseInt(row.querySelector('.reps-input').value, 10) || 0;
        const weightKg = unit === 'lb' ? raw * 0.453592 : raw;

        sets.push({
          weightRaw: raw,
          unit: unit,
          weightKg: weightKg,
          reps: reps
        });
      }

      if (sets.length > 0) {
        updatedExercises.push({
          name: name,
          sets: sets
        });
      }
    }

    if (updatedExercises.length === 0) {
      alert('La sesión debe contener al menos un ejercicio con series válidas.');
      return;
    }

    // Actualizar sesión
    history[sessionIndex].date = new Date(newDateVal).toISOString();
    history[sessionIndex].durationSeconds = durationSeconds;
    history[sessionIndex].exercises = updatedExercises;

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    closeEditSessionModal();
    renderMetrics();
    showToast('Sesión corregida y guardada exitosamente');
  });
}

// Sub-vista 2: Récords Personales (PRs)
function renderPRsSection(prMap) {
  if (!prsContainer) return;
  prsContainer.innerHTML = '';

  const exerciseNames = Object.keys(prMap).sort((a, b) => a.localeCompare(b));

  if (exerciseNames.length === 0) {
    prsContainer.innerHTML = '<p class="empty-msg">No hay récords registrados todavía.</p>';
    return;
  }

  // Selector de ejercicio para PR destacado
  const select = document.createElement('select');
  select.className = 'chart-selector';
  select.id = 'pr-selector';
  select.innerHTML = exerciseNames.map(name => `<option value="${name}">${name}</option>`).join('');

  const highlightContainer = document.createElement('div');
  highlightContainer.id = 'pr-highlight-container';

  // Tabla completa de todos los PRs
  const allPrsWrapper = document.createElement('div');
  allPrsWrapper.className = 'all-prs-table-wrapper';
  allPrsWrapper.innerHTML = `
    <div class="all-prs-table-title">Todos tus Récords Personales (${exerciseNames.length})</div>
    <div class="all-prs-list">
      ${exerciseNames.map(name => {
        const item = prMap[name];
        return `
          <div class="pr-item-row">
            <span class="pr-item-name">${name}</span>
            <span class="pr-item-score">${item.weightKg.toFixed(1)} kg × ${item.reps} reps</span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  prsContainer.appendChild(select);
  prsContainer.appendChild(highlightContainer);
  prsContainer.appendChild(allPrsWrapper);

  const updatePrHighlight = (name) => {
    const data = prMap[name];
    if (!data) return;

    // Estimación 1RM usando fórmula de Epley: Peso * (1 + Reps / 30)
    const epley1RM = data.reps > 1 ? data.weightKg * (1 + data.reps / 30) : data.weightKg;
    const dateStr = data.date ? new Date(data.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Fecha no disp.';

    highlightContainer.innerHTML = `
      <div class="pr-card-highlight">
        <div class="pr-highlight-header">
          <h4>${name}</h4>
          <span class="pr-badge">Récord Actual</span>
        </div>
        <div class="pr-grid-stats">
          <div class="pr-stat-box">
            <div class="pr-stat-box-title">Carga Máxima</div>
            <div class="pr-stat-box-value">${data.weightKg.toFixed(1)} <small style="font-size:0.8rem;">kg</small></div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">${data.reps} repeticiones logradas</div>
          </div>
          <div class="pr-stat-box">
            <div class="pr-stat-box-title">1RM Estimado</div>
            <div class="pr-stat-box-value">${epley1RM.toFixed(1)} <small style="font-size:0.8rem;">kg</small></div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">Logrado: ${dateStr}</div>
          </div>
        </div>
      </div>
    `;
  };

  updatePrHighlight(exerciseNames[0]);
  select.addEventListener('change', (e) => updatePrHighlight(e.target.value));
}

// Sub-vista 3: Progresión de Volumen (Objetivo 4)
function renderProgressionSection() {
  if (!chartSectionWrapper) return;
  chartSectionWrapper.innerHTML = '';

  // Agrupar volumen por ejercicio y fecha
  const volumeMap = {};

  history.forEach(session => {
    const dateFormatted = new Date(session.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    
    // Sumar el volumen de cada ejercicio en la sesión (consolidando repeticiones del mismo nombre)
    const sessionExerciseVolume = {};

    if (session.exercises) {
      session.exercises.forEach(ex => {
        const exName = (ex.name || '').trim();
        if (!exName) return;

        let exVol = 0;
        if (ex.sets) {
          ex.sets.forEach(set => {
            const kg = set.weightKg || (set.unit === 'lb' ? set.weightRaw * 0.453592 : set.weightRaw) || 0;
            exVol += (kg * (set.reps || 0));
          });
        }
        sessionExerciseVolume[exName] = (sessionExerciseVolume[exName] || 0) + exVol;
      });
    }

    for (const [name, vol] of Object.entries(sessionExerciseVolume)) {
      if (vol > 0) {
        if (!volumeMap[name]) volumeMap[name] = [];
        volumeMap[name].push({
          date: dateFormatted,
          volume: vol,
          rawDate: session.date
        });
      }
    }
  });

  const exerciseKeys = Object.keys(volumeMap).sort((a, b) => a.localeCompare(b));

  if (exerciseKeys.length === 0) {
    chartSectionWrapper.innerHTML = '<p class="empty-msg">No hay datos suficientes para generar gráficos de volumen.</p>';
    return;
  }

  const select = document.createElement('select');
  select.className = 'chart-selector';
  select.id = 'chart-exercise-selector';
  select.innerHTML = exerciseKeys.map(k => `<option value="${k}">${k}</option>`).join('');

  const chartStatsBanner = document.createElement('div');
  chartStatsBanner.className = 'chart-stats-banner';

  const chartContainer = document.createElement('div');
  chartContainer.className = 'vertical-chart-container';

  chartSectionWrapper.appendChild(select);
  chartSectionWrapper.appendChild(chartStatsBanner);
  chartSectionWrapper.appendChild(chartContainer);

  const drawChart = (exName) => {
    const dataPoints = volumeMap[exName] || [];
    if (dataPoints.length === 0) return;

    // Calcular estadísticas
    const totalSessions = dataPoints.length;
    const maxVol = Math.max(...dataPoints.map(d => d.volume));
    const avgVol = dataPoints.reduce((acc, curr) => acc + curr.volume, 0) / totalSessions;

    chartStatsBanner.innerHTML = `
      <div class="chart-stat-item">
        <div class="chart-stat-num">${totalSessions}</div>
        <div class="chart-stat-label">Sesiones</div>
      </div>
      <div class="chart-stat-item">
        <div class="chart-stat-num">${Math.round(avgVol)} kg</div>
        <div class="chart-stat-label">Vol. Promedio</div>
      </div>
      <div class="chart-stat-item">
        <div class="chart-stat-num">${Math.round(maxVol)} kg</div>
        <div class="chart-stat-label">Mejor Volumen</div>
      </div>
    `;

    let barsHtml = '';
    dataPoints.forEach(pt => {
      const heightPercent = maxVol > 0 ? (pt.volume / maxVol) * 100 : 0;
      barsHtml += `
        <div class="v-chart-bar-wrapper">
          <span class="v-chart-value">${Math.round(pt.volume)}</span>
          <div class="v-chart-bar" style="height: ${Math.max(6, heightPercent)}%;"></div>
          <span class="v-chart-label">${pt.date}</span>
        </div>
      `;
    });

    chartContainer.innerHTML = barsHtml;
  };

  drawChart(exerciseKeys[0]);
  select.addEventListener('change', (e) => drawChart(e.target.value));
}

// 11. Unificador Inteligente de Ejercicios (Objetivo 5)
function openUnifyModal() {
  if (!modalUnify) return;

  history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  routines = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  notes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};

  // Recopilar todos los ejercicios únicos y contar apariciones
  const exerciseCounts = {};

  history.forEach(session => {
    if (session.exercises) {
      session.exercises.forEach(ex => {
        const name = (ex.name || '').trim();
        if (name) {
          exerciseCounts[name] = (exerciseCounts[name] || 0) + (ex.sets ? ex.sets.length : 1);
        }
      });
    }
  });

  routines.forEach(routine => {
    if (routine.exercises) {
      routine.exercises.forEach(ex => {
        const name = (ex || '').trim();
        if (name && exerciseCounts[name] === undefined) {
          exerciseCounts[name] = 0;
        }
      });
    }
  });

  const names = Object.keys(exerciseCounts).sort((a, b) => a.localeCompare(b));

  if (names.length < 2) {
    alert('Necesitas tener al menos 2 ejercicios registrados para poder unificar.');
    return;
  }

  // Poblar selectores
  unifySourceSelect.innerHTML = '<option value="">Selecciona el ejercicio a reemplazar...</option>' +
    names.map(n => `<option value="${n}">${n} (${exerciseCounts[n]} series en historial)</option>`).join('');

  unifyTargetSelect.innerHTML = '<option value="">Selecciona el ejercicio definitivo...</option>' +
    names.map(n => `<option value="${n}">${n}</option>`).join('') +
    '<option value="__custom__">+ Escribir otro nombre nuevo...</option>';

  if (unifyCustomGroup) unifyCustomGroup.style.display = 'none';
  if (unifyCustomName) unifyCustomName.value = '';
  if (unifyPreviewBox) unifyPreviewBox.style.display = 'none';
  if (unifyConfirmBtn) unifyConfirmBtn.disabled = true;

  modalUnify.style.display = 'flex';
}

function closeUnifyModal() {
  if (modalUnify) modalUnify.style.display = 'none';
}

if (unifyBtn) unifyBtn.addEventListener('click', openUnifyModal);
if (unifyCloseBtn) unifyCloseBtn.addEventListener('click', closeUnifyModal);
if (unifyCancelBtn) unifyCancelBtn.addEventListener('click', closeUnifyModal);

function checkUnifyInputs() {
  const source = unifySourceSelect.value.trim();
  let target = unifyTargetSelect.value.trim();

  if (target === '__custom__') {
    if (unifyCustomGroup) unifyCustomGroup.style.display = 'block';
    target = unifyCustomName.value.trim();
  } else {
    if (unifyCustomGroup) unifyCustomGroup.style.display = 'none';
  }

  const isValid = source && target && (source.toLowerCase() !== target.toLowerCase());

  if (isValid) {
    // Calcular vista previa de cambios
    let matchedSessions = 0;
    let matchedSeries = 0;
    let matchedRoutines = 0;

    history.forEach(s => {
      if (s.exercises) {
        const found = s.exercises.filter(e => e.name && e.name.trim().toLowerCase() === source.toLowerCase());
        if (found.length > 0) {
          matchedSessions++;
          found.forEach(e => matchedSeries += (e.sets ? e.sets.length : 0));
        }
      }
    });

    routines.forEach(r => {
      if (r.exercises && r.exercises.some(e => e.trim().toLowerCase() === source.toLowerCase())) {
        matchedRoutines++;
      }
    });

    if (unifyPreviewBox) {
      unifyPreviewBox.style.display = 'block';
      unifyPreviewBox.innerHTML = `
        <strong>Resumen de fusión:</strong><br>
        • Se unificarán <strong>${matchedSessions}</strong> sesiones de historial.<br>
        • Se fusionarán <strong>${matchedSeries}</strong> series bajo el nombre "<strong>${target}</strong>".<br>
        • Se actualizará en <strong>${matchedRoutines}</strong> rutina(s).<br>
        <em>Si ambos ejercicios estuvieron presentes en una misma sesión, sus series se unirán en un solo registro limpio.</em>
      `;
    }
    if (unifyConfirmBtn) unifyConfirmBtn.disabled = false;
  } else {
    if (unifyPreviewBox) unifyPreviewBox.style.display = 'none';
    if (unifyConfirmBtn) unifyConfirmBtn.disabled = true;
  }
}

if (unifySourceSelect) unifySourceSelect.addEventListener('change', checkUnifyInputs);
if (unifyTargetSelect) unifyTargetSelect.addEventListener('change', checkUnifyInputs);
if (unifyCustomName) unifyCustomName.addEventListener('input', checkUnifyInputs);

if (unifyConfirmBtn) {
  unifyConfirmBtn.addEventListener('click', () => {
    const sourceName = unifySourceSelect.value.trim();
    let targetName = unifyTargetSelect.value.trim();

    if (targetName === '__custom__') {
      targetName = unifyCustomName.value.trim();
    }

    if (!sourceName || !targetName || sourceName.toLowerCase() === targetName.toLowerCase()) {
      alert('Selecciona dos nombres distintos para unificar.');
      return;
    }

    const srcNorm = sourceName.toLowerCase();
    const destNorm = targetName.toLowerCase();

    // 1. Unificar en Historial (fusionando series de la misma sesión si ambos estaban presentes)
    history.forEach(session => {
      if (!session.exercises) return;

      // Buscar si el ejercicio destino ya existe en esta sesión
      let targetEx = session.exercises.find(e => e.name && e.name.trim().toLowerCase() === destNorm);

      const toDelete = [];

      session.exercises.forEach(ex => {
        if (!ex.name) return;
        const currentNorm = ex.name.trim().toLowerCase();

        if (currentNorm === srcNorm) {
          if (!targetEx) {
            // Renombrar este ejercicio al nombre definitivo
            ex.name = targetName;
            targetEx = ex;
          } else if (ex !== targetEx) {
            // Ya existía el destino en la misma sesión: ¡fusionar las series en el destino!
            if (ex.sets && Array.isArray(ex.sets)) {
              if (!targetEx.sets) targetEx.sets = [];
              targetEx.sets = targetEx.sets.concat(ex.sets);
            }
            toDelete.push(ex);
          }
        }
      });

      // Eliminar duplicados fusionados
      session.exercises = session.exercises.filter(e => !toDelete.includes(e));
    });

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

    // 2. Unificar en Rutinas
    routines.forEach(routine => {
      if (routine.exercises) {
        routine.exercises = routine.exercises.map(ex => {
          if (typeof ex === 'string' && ex.trim().toLowerCase() === srcNorm) {
            return targetName;
          }
          return ex.trim();
        });
        // Deduplicar dentro de la misma rutina
        routine.exercises = Array.from(new Set(routine.exercises));
      }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(routines));

    // 3. Unificar Notas
    const currentNotes = JSON.parse(localStorage.getItem(NOTES_KEY)) || {};
    const srcKey = Object.keys(currentNotes).find(k => k.trim().toLowerCase() === srcNorm);
    const destKey = Object.keys(currentNotes).find(k => k.trim().toLowerCase() === destNorm) || targetName;

    if (srcKey) {
      if (currentNotes[destKey] && currentNotes[destKey] !== currentNotes[srcKey]) {
        currentNotes[destKey] = `${currentNotes[destKey]} | ${currentNotes[srcKey]}`;
      } else if (!currentNotes[destKey]) {
        currentNotes[destKey] = currentNotes[srcKey];
      }
      if (srcKey !== destKey) {
        delete currentNotes[srcKey];
      }
      localStorage.setItem(NOTES_KEY, JSON.stringify(currentNotes));
    }

    closeUnifyModal();
    renderRoutines();
    renderMetrics();
    showToast(`Se unificó "${sourceName}" en "${targetName}" correctamente`);
  });
}

// 12. Herramientas: Exportar e Importar Copia de Seguridad JSON
if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const backupData = {
      app: 'GymLog',
      version: 2,
      exportedAt: new Date().toISOString(),
      routines: JSON.parse(localStorage.getItem(STORAGE_KEY)) || [],
      history: JSON.parse(localStorage.getItem(HISTORY_KEY)) || [],
      notes: JSON.parse(localStorage.getItem(NOTES_KEY)) || {}
    };

    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `gymlog_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad descargada');
  });
}

if (importBtn && importFileInput) {
  importBtn.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);

        if (!imported || (!imported.routines && !imported.history)) {
          alert('El archivo seleccionado no tiene el formato válido de GymLog.');
          return;
        }

        if (!confirm('¿Deseas restaurar esta copia de seguridad? Se integrarán tus rutinas e historial.')) {
          importFileInput.value = '';
          return;
        }

        if (Array.isArray(imported.routines)) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(imported.routines));
          routines = imported.routines;
        }

        if (Array.isArray(imported.history)) {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(imported.history));
          history = imported.history;
        }

        if (imported.notes && typeof imported.notes === 'object') {
          localStorage.setItem(NOTES_KEY, JSON.stringify(imported.notes));
          notes = imported.notes;
        }

        cleanAndRepairData();
        renderRoutines();
        renderMetrics();
        showToast('Datos restaurados con éxito');
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      } finally {
        importFileInput.value = '';
      }
    };
    reader.readAsText(file);
  });
}

// 13. Inicialización General al Cargar la Página
document.addEventListener('DOMContentLoaded', () => {
  renderRoutines();
});

// 14. Registro del Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('GymLog ServiceWorker registrado:', reg.scope);
      })
      .catch(err => {
        console.error('Error al registrar ServiceWorker:', err);
      });
  });
}
