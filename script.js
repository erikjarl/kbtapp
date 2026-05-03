document.addEventListener('DOMContentLoaded', () => {
  const today = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const tp = document.getElementById('therapist-date');
  const cp = document.getElementById('client-date');
  if (tp) tp.textContent = today;
  if (cp) cp.textContent = today;

  const loginView = document.getElementById('login-view');
  const therapistView = document.getElementById('therapist-view');
  const clientView = document.getElementById('client-view');

  function openRole(role) {
    loginView.classList.remove('active');
    therapistView.classList.remove('active');
    clientView.classList.remove('active');
    if (role === 'therapist') therapistView.classList.add('active');
    else clientView.classList.add('active');
  }

  document.querySelectorAll('.login-role').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openRole(btn.dataset.role);
    });
  });

  document.querySelectorAll('.logout').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      therapistView.classList.remove('active');
      clientView.classList.remove('active');
      loginView.classList.add('active');
    });
  });

  function setupNav(viewElement) {
    const sideNav = viewElement.querySelector('.side-nav');
    const bottomNav = viewElement.querySelector('.bottom-nav');
    const main = viewElement.querySelector('.app-main');

    function switchPage(pageId) {
      sideNav.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
      });
      if (bottomNav) {
        bottomNav.querySelectorAll('.bottom-item').forEach(item => {
          item.classList.toggle('active', item.dataset.page === pageId);
        });
      }
      main.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.dataset.page === pageId);
      });
    }

    sideNav.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        switchPage(item.dataset.page);
      });
    });

    if (bottomNav) {
      bottomNav.querySelectorAll('.bottom-item[data-page]').forEach(item => {
        item.addEventListener('click', e => {
          e.preventDefault();
          switchPage(item.dataset.page);
        });
      });
    }
  }

  setupNav(therapistView);
  setupNav(clientView);

  document.querySelectorAll('.workspace-tabs').forEach(tabBar => {
    tabBar.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  });

  initMaterialBuilder();
});

function initMaterialBuilder() {
  const STORAGE_KEYS = {
    templates: 'kbtapp_templates',
    library: 'kbtapp_material_library'
  };

  const patients = [
    { id: 'pt_1024', name: 'Maja Svensson' },
    { id: 'pt_1048', name: 'Erik Johansson' },
    { id: 'pt_1091', name: 'Linda Berg' },
    { id: 'pt_1122', name: 'Katarina Nilsson' },
    { id: 'pt_1156', name: 'Johan Andersson' }
  ];

  const emojiScale = [
    { emoji: '😡', label: 'Mycket svårt', color: '#ca5a46' },
    { emoji: '😟', label: 'Ansträngt', color: '#d27c52' },
    { emoji: '😕', label: 'Lite spänt', color: '#d9a15a' },
    { emoji: '😐', label: 'Neutralt', color: '#c9b86c' },
    { emoji: '🙂', label: 'Ganska bra', color: '#8da95f' },
    { emoji: '😊', label: 'Lugnt', color: '#5f9c68' }
  ];

  const builder = document.getElementById('material-builder');
  if (!builder) return;

  const state = {
    blocks: [],
    selectedBlockId: null,
    dragData: null,
    assignedPatientId: patients[0].id
  };

  const els = {
    library: document.getElementById('block-library'),
    dropzone: document.getElementById('workspace-dropzone'),
    stack: document.getElementById('canvas-stack'),
    empty: document.getElementById('empty-dropzone'),
    count: document.getElementById('canvas-count'),
    settingsPanel: document.getElementById('settings-panel'),
    settingsContent: document.getElementById('settings-content'),
    settingsEmpty: document.getElementById('settings-empty'),
    previewModal: document.getElementById('preview-modal'),
    previewShell: document.getElementById('preview-shell'),
    assignModal: document.getElementById('assign-modal'),
    patientSelect: document.getElementById('patient-select'),
    libraryGrid: document.getElementById('library-grid'),
    templateGrid: document.getElementById('template-grid'),
    toastArea: document.getElementById('toast-area')
  };

  const materialSeed = [
    { title: 'Sömnregistrering', description: 'Typ: Hemuppgift · status: aktiv mall' },
    { title: 'Beteendeaktivering – vecka 1', description: 'Typ: Hemuppgift · status: sparad version' },
    { title: 'Psykoedukation om oro', description: 'Typ: Material · status: publicerbar' }
  ];
  const templateSeed = [
    { title: 'Tankefälla – registrering', description: 'Importera till arbetsytan och skapa patientversion.' },
    { title: 'Exponering – planeringsblad', description: 'Bas för gradvis exponering med anpassningsbara steg.' },
    { title: 'Värderad riktning', description: 'Mall för ACT-inspirerad reflektionsövning.' }
  ];

  bindPanelLibrary();
  bindCanvasDnD();
  bindToolbar();
  bindModals();
  renderSavedCollections();
  render();

  function bindPanelLibrary() {
    els.library.querySelectorAll('.library-block').forEach(item => {
      item.addEventListener('dragstart', event => {
        const type = item.dataset.blockType;
        state.dragData = { origin: 'library', type };
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('text/plain', JSON.stringify(state.dragData));
      });
      item.addEventListener('click', () => addBlock(item.dataset.blockType));
    });
  }

  function bindCanvasDnD() {
    els.dropzone.addEventListener('dragover', event => {
      event.preventDefault();
      els.dropzone.classList.add('drag-over');
    });
    els.dropzone.addEventListener('dragleave', event => {
      if (!els.dropzone.contains(event.relatedTarget)) {
        els.dropzone.classList.remove('drag-over');
      }
    });
    els.dropzone.addEventListener('drop', event => {
      event.preventDefault();
      els.dropzone.classList.remove('drag-over');
      let payload = state.dragData;
      try {
        payload = JSON.parse(event.dataTransfer.getData('text/plain')) || payload;
      } catch (_) {}
      const beforeId = getDropBeforeId(event.clientY);
      if (!payload) return;
      if (payload.origin === 'library') {
        addBlock(payload.type, beforeId);
      }
      if (payload.origin === 'canvas') {
        moveBlock(payload.id, beforeId);
      }
      state.dragData = null;
    });
  }

  function bindToolbar() {
    document.getElementById('preview-material').addEventListener('click', openPreview);
    document.getElementById('save-template').addEventListener('click', () => saveCollection('templates'));
    document.getElementById('save-library').addEventListener('click', () => saveCollection('library'));
    document.getElementById('assign-patient').addEventListener('click', () => openModal(els.assignModal));
    document.getElementById('confirm-assign').addEventListener('click', assignPatient);

    const openSettings = document.getElementById('open-settings');
    const closeSettings = document.getElementById('close-settings');
    if (openSettings) openSettings.addEventListener('click', () => els.settingsPanel.classList.add('open'));
    if (closeSettings) closeSettings.addEventListener('click', () => els.settingsPanel.classList.remove('open'));
  }

  function bindModals() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.closeModal;
        if (type === 'preview') closeModal(els.previewModal);
        if (type === 'assign') closeModal(els.assignModal);
      });
    });
  }

  function addBlock(type, beforeId = null) {
    const block = createBlock(type);
    if (beforeId) {
      const index = state.blocks.findIndex(item => item.id === beforeId);
      if (index >= 0) state.blocks.splice(index, 0, block);
      else state.blocks.push(block);
    } else {
      state.blocks.push(block);
    }
    state.selectedBlockId = block.id;
    render();
    showToast('Block tillagt', `${labelForType(type)} ligger nu i arbetsytan.`);
  }

  function moveBlock(id, beforeId) {
    const currentIndex = state.blocks.findIndex(block => block.id === id);
    if (currentIndex === -1) return;
    const [block] = state.blocks.splice(currentIndex, 1);
    if (!beforeId || beforeId === id) {
      state.blocks.push(block);
    } else {
      const nextIndex = state.blocks.findIndex(item => item.id === beforeId);
      if (nextIndex === -1) state.blocks.push(block);
      else state.blocks.splice(nextIndex, 0, block);
    }
    render();
  }

  function removeBlock(id) {
    state.blocks = state.blocks.filter(block => block.id !== id);
    if (state.selectedBlockId === id) {
      state.selectedBlockId = state.blocks[0]?.id || null;
    }
    render();
  }

  function updateBlock(id, updater) {
    const block = state.blocks.find(item => item.id === id);
    if (!block) return;
    updater(block);
    render();
  }

  function createBlock(type) {
    const id = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    switch (type) {
      case 'info':
        return { id, type, title: 'Informationstext', settings: { title: 'Informationstext', content: 'Skriv instruktioner, sammanhang eller psykoedukation här.' } };
      case 'textfield':
        return { id, type, title: 'Textfält', settings: { label: 'Beskriv vad du lade märke till', maxChars: 2000 } };
      case 'rating':
        return { id, type, title: 'Skattningsbox', settings: { label: 'Ångestnivå', scale: '0-10', customMin: 0, customMax: 10, ratingType: 'clickable' } };
      case 'table':
        return { id, type, title: 'Tabell', settings: { rows: 3, cols: 3, headerRow: true, cells: createTableCells(3, 3) } };
      case 'emoji':
        return { id, type, title: 'Emoji-skala', settings: { label: 'Hur känns det just nu?', defaultValue: 4 } };
      default:
        return null;
    }
  }

  function render() {
    renderCanvas();
    renderSettings();
  }

  function renderCanvas() {
    els.stack.innerHTML = '';
    els.empty.style.display = state.blocks.length ? 'none' : 'flex';
    els.count.textContent = `${state.blocks.length} block`;

    state.blocks.forEach(block => {
      const card = document.createElement('article');
      card.className = `canvas-block ${state.selectedBlockId === block.id ? 'selected' : ''}`;
      card.draggable = true;
      card.dataset.blockId = block.id;
      card.innerHTML = `
        <div class="block-top">
          <div class="block-meta">
            <span class="block-chip">${labelForType(block.type)}</span>
            <div>
              <div class="block-title">${escapeHtml(getBlockTitle(block))}</div>
              <small>${getBlockSummary(block)}</small>
            </div>
          </div>
          <div class="block-actions">
            <button class="block-handle" type="button" aria-label="Dra block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 6h.01"/><path d="M10 12h.01"/><path d="M10 18h.01"/><path d="M14 6h.01"/><path d="M14 12h.01"/><path d="M14 18h.01"/></svg>
            </button>
            <button class="block-remove" type="button" aria-label="Ta bort block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="block-body"></div>
      `;

      card.addEventListener('click', event => {
        if (event.target.closest('.block-remove')) return;
        state.selectedBlockId = block.id;
        renderSettings();
        renderCanvas();
        if (window.innerWidth <= 860) els.settingsPanel.classList.add('open');
      });

      card.addEventListener('dragstart', event => {
        state.dragData = { origin: 'canvas', id: block.id };
        card.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify(state.dragData));
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));

      card.querySelector('.block-remove').addEventListener('click', event => {
        event.stopPropagation();
        removeBlock(block.id);
      });

      card.querySelector('.block-body').appendChild(renderBlockPreview(block, false));
      els.stack.appendChild(card);
    });
  }

  function renderSettings() {
    const block = state.blocks.find(item => item.id === state.selectedBlockId);
    els.settingsContent.innerHTML = '';
    els.settingsEmpty.style.display = block ? 'none' : 'grid';
    if (!block) return;

    const container = document.createElement('div');
    container.className = 'settings-section';
    if (block.type === 'info') renderInfoSettings(container, block);
    if (block.type === 'textfield') renderTextFieldSettings(container, block);
    if (block.type === 'rating') renderRatingSettings(container, block);
    if (block.type === 'table') renderTableSettings(container, block);
    if (block.type === 'emoji') renderEmojiSettings(container, block);
    els.settingsContent.appendChild(container);
  }

  function renderInfoSettings(container, block) {
    container.append(
      createTextInput('Rubrik', block.settings.title, value => updateBlock(block.id, item => { item.settings.title = value; item.title = value || 'Informationstext'; })),
      createTextarea('Innehåll', block.settings.content, value => updateBlock(block.id, item => { item.settings.content = value; }))
    );
  }

  function renderTextFieldSettings(container, block) {
    container.append(
      createTextInput('Ledtext', block.settings.label, value => updateBlock(block.id, item => { item.settings.label = value; })),
      createNumberInput('Max tecken', block.settings.maxChars, 50, 2000, value => updateBlock(block.id, item => { item.settings.maxChars = value; }))
    );
  }

  function renderRatingSettings(container, block) {
    container.append(
      createTextInput('Etikett', block.settings.label, value => updateBlock(block.id, item => { item.settings.label = value; })),
      createSelect('Skala', block.settings.scale, ['0-10', '1-5', '1-7', 'SUDS 0-100', 'custom'], value => updateBlock(block.id, item => { item.settings.scale = value; }))
    );
    if (block.settings.scale === 'custom') {
      const row = document.createElement('div');
      row.className = 'field-row';
      row.append(
        createNumberInput('Minvärde', block.settings.customMin, -100, 100, value => updateBlock(block.id, item => { item.settings.customMin = value; })),
        createNumberInput('Maxvärde', block.settings.customMax, -100, 100, value => updateBlock(block.id, item => { item.settings.customMax = value; }))
      );
      container.appendChild(row);
    }

    const radioGroup = document.createElement('div');
    radioGroup.className = 'field-group';
    radioGroup.innerHTML = '<label class="field-label">Typ</label>';
    const radioRow = document.createElement('div');
    radioRow.className = 'radio-row';
    [['clickable', 'Klickbara skalsteg'], ['slider', 'Dragbar vertikal mätare']].forEach(([value, label]) => {
      const option = document.createElement('label');
      option.className = 'radio-option';
      option.innerHTML = `<input type="radio" name="rating-type" value="${value}" ${block.settings.ratingType === value ? 'checked' : ''}/> <span>${label}</span>`;
      option.querySelector('input').addEventListener('change', () => updateBlock(block.id, item => { item.settings.ratingType = value; }));
      radioRow.appendChild(option);
    });
    radioGroup.appendChild(radioRow);
    container.appendChild(radioGroup);
  }

  function renderTableSettings(container, block) {
    const configGrid = document.createElement('div');
    configGrid.className = 'table-config-grid';
    configGrid.append(
      createNumberInput('Rader', block.settings.rows, 1, 8, value => updateBlock(block.id, item => resizeTable(item, value, item.settings.cols))),
      createNumberInput('Kolumner', block.settings.cols, 1, 4, value => updateBlock(block.id, item => resizeTable(item, item.settings.rows, value)))
    );
    container.appendChild(configGrid);

    const toggle = document.createElement('div');
    toggle.className = 'toggle-row';
    toggle.innerHTML = `
      <div>
        <div class="field-label" style="margin-bottom:4px">Rubrikrad</div>
        <div class="inline-help">Första raden blir rubrikrad i förhandsvisningen.</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" ${block.settings.headerRow ? 'checked' : ''}/>
        <span class="toggle-slider"></span>
      </label>
    `;
    toggle.querySelector('input').addEventListener('change', event => updateBlock(block.id, item => { item.settings.headerRow = event.target.checked; }));
    container.appendChild(toggle);

    const helper = document.createElement('div');
    helper.className = 'inline-help';
    helper.textContent = 'Dubbelklicka på en cell i tabellen nedan för snabb redigering. Varje cell kan växlas mellan statisk text och patientfält.';
    container.appendChild(helper);

    const preview = renderBlockPreview(block, false);
    container.appendChild(preview);

    const cellGrid = document.createElement('div');
    cellGrid.className = 'cell-grid';
    block.settings.cells.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const editor = document.createElement('div');
        editor.className = `cell-editor-card ${block.settings.headerRow && rowIndex === 0 ? 'is-header' : ''}`;
        editor.innerHTML = `<strong>Cell ${rowIndex + 1}.${colIndex + 1}</strong>`;
        editor.append(
          createTextInput('Text', cell.text, value => updateBlock(block.id, item => { item.settings.cells[rowIndex][colIndex].text = value; }), true),
          createToggle(cell.type === 'patient', checked => updateBlock(block.id, item => { item.settings.cells[rowIndex][colIndex].type = checked ? 'patient' : 'static'; }), 'Patientfält', 'Låt patienten fylla i denna cell')
        );
        cellGrid.appendChild(editor);
      });
    });
    container.appendChild(cellGrid);
  }

  function renderEmojiSettings(container, block) {
    container.append(
      createTextInput('Etikett', block.settings.label, value => updateBlock(block.id, item => { item.settings.label = value; })),
      createNumberInput('Förvalt värde', block.settings.defaultValue, 1, 6, value => updateBlock(block.id, item => { item.settings.defaultValue = value; }))
    );
  }

  function renderBlockPreview(block, isReadOnly) {
    const wrap = document.createElement('div');
    switch (block.type) {
      case 'info': {
        const title = document.createElement(isReadOnly ? 'h4' : 'div');
        title.className = isReadOnly ? '' : 'block-title';
        title.textContent = block.settings.title || 'Informationstext';
        const body = document.createElement('div');
        body.className = isReadOnly ? 'preview-text' : 'info-content';
        body.textContent = block.settings.content || 'Ingen text ännu.';
        wrap.append(title, body);
        break;
      }
      case 'textfield': {
        const label = document.createElement('div');
        label.className = 'block-title';
        label.textContent = block.settings.label || 'Textfält';
        const field = document.createElement('div');
        field.className = 'patient-field-preview';
        field.textContent = `Patientens svar skrivs här · max ${block.settings.maxChars} tecken`;
        wrap.append(label, field);
        break;
      }
      case 'rating': {
        const label = document.createElement('div');
        label.className = 'block-title';
        label.textContent = block.settings.label || 'Skattningsbox';
        wrap.appendChild(label);
        const { min, max } = getScaleRange(block.settings);
        if (block.settings.ratingType === 'slider') {
          const slider = document.createElement('div');
          slider.className = 'slider-preview';
          const rail = document.createElement('div');
          rail.className = 'slider-rail';
          const thumb = document.createElement('div');
          thumb.className = 'slider-thumb';
          const percent = 50;
          thumb.style.top = `calc(${100 - percent}% - 16px)`;
          rail.appendChild(thumb);
          const scale = document.createElement('div');
          scale.className = 'slider-scale';
          scale.innerHTML = `<strong>${max}</strong><span>Dragbar nivå</span><span>${min}</span>`;
          slider.append(rail, scale);
          wrap.appendChild(slider);
        } else {
          const row = document.createElement('div');
          row.className = 'rating-row';
          const values = getScaleValues(min, max);
          values.forEach((value, index) => {
            const step = document.createElement('div');
            step.className = `rating-step ${index === Math.floor(values.length / 2) ? 'active' : ''}`;
            step.textContent = value;
            row.appendChild(step);
          });
          wrap.appendChild(row);
        }
        break;
      }
      case 'table': {
        const box = document.createElement('div');
        box.className = 'table-wrapper';
        const table = document.createElement('table');
        table.className = 'material-table';
        const tbody = document.createElement('tbody');
        block.settings.cells.forEach((row, rowIndex) => {
          const tr = document.createElement('tr');
          row.forEach((cell, colIndex) => {
            const isHeader = block.settings.headerRow && rowIndex === 0;
            const td = document.createElement(isHeader ? 'th' : 'td');
            const cellInner = document.createElement('div');
            cellInner.className = cell.type === 'patient' ? 'table-cell-patient' : 'table-cell-static';
            cellInner.textContent = cell.text || (cell.type === 'patient' ? 'Patienten fyller i här' : 'Tom statisk cell');
            if (!isReadOnly) {
              td.addEventListener('dblclick', () => {
                const updated = window.prompt(`Redigera cell ${rowIndex + 1}.${colIndex + 1}`, cell.text || '');
                if (updated !== null) {
                  updateBlock(block.id, item => { item.settings.cells[rowIndex][colIndex].text = updated; });
                }
              });
              td.style.cursor = 'pointer';
            }
            td.appendChild(cellInner);
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        box.appendChild(table);
        wrap.appendChild(box);
        if (!isReadOnly) {
          const hint = document.createElement('div');
          hint.className = 'doubleclick-hint';
          hint.textContent = 'Dubbelklicka på en cell för att redigera texten snabbt.';
          wrap.appendChild(hint);
        }
        break;
      }
      case 'emoji': {
        const label = document.createElement('div');
        label.className = 'block-title';
        label.textContent = block.settings.label || 'Emoji-skala';
        wrap.appendChild(label);
        const row = document.createElement('div');
        row.className = 'emoji-row';
        emojiScale.forEach((item, index) => {
          const pill = document.createElement('div');
          pill.className = `emoji-pill ${block.settings.defaultValue === index + 1 ? 'active' : ''}`;
          pill.innerHTML = `<span class="emoji-char">${item.emoji}</span><span class="emoji-tone">${item.label}</span>`;
          pill.style.background = `linear-gradient(180deg, ${item.color}18, #fbfaf8)`;
          row.appendChild(pill);
        });
        wrap.appendChild(row);
        break;
      }
    }
    return wrap;
  }

  function openPreview() {
    els.previewShell.innerHTML = '';
    if (!state.blocks.length) {
      els.previewShell.innerHTML = '<div class="preview-block"><h4>Tom arbetsyta</h4><p>Lägg till minst ett block för att kunna förhandsvisa materialet.</p></div>';
    } else {
      state.blocks.forEach(block => {
        const previewBlock = document.createElement('section');
        previewBlock.className = 'preview-block';
        previewBlock.appendChild(renderBlockPreview(block, true));
        els.previewShell.appendChild(previewBlock);
      });
    }
    openModal(els.previewModal);
  }

  function assignPatient() {
    state.assignedPatientId = els.patientSelect.value;
    const patient = patients.find(item => item.id === state.assignedPatientId);
    showToast('Material tilldelat', `${patient.name} (${patient.id}) är vald som mottagare.`);
    closeModal(els.assignModal);
  }

  function saveCollection(kind) {
    if (!state.blocks.length) {
      showToast('Inget att spara', 'Arbetsytan är tom. Lägg till block först.');
      return;
    }
    const patient = patients.find(item => item.id === state.assignedPatientId);
    const title = getMaterialTitle();
    const entry = {
      id: `${kind}_${Date.now()}`,
      title,
      patient: patient ? `${patient.name} (${patient.id})` : 'Ej tilldelad',
      createdAt: new Date().toLocaleString('sv-SE'),
      blocks: structuredClone(state.blocks)
    };
    const key = STORAGE_KEYS[kind];
    const current = JSON.parse(localStorage.getItem(key) || '[]');
    current.unshift(entry);
    localStorage.setItem(key, JSON.stringify(current));
    renderSavedCollections();
    showToast(kind === 'templates' ? 'Mall sparad' : 'Material sparat', title);
  }

  function renderSavedCollections() {
    renderCollectionGrid(els.libraryGrid, materialSeed, JSON.parse(localStorage.getItem(STORAGE_KEYS.library) || '[]'));
    renderCollectionGrid(els.templateGrid, templateSeed, JSON.parse(localStorage.getItem(STORAGE_KEYS.templates) || '[]'));
  }

  function renderCollectionGrid(target, seed, savedItems) {
    target.innerHTML = '';
    seed.forEach(item => target.appendChild(createLibraryCard(item.title, item.description)));
    savedItems.forEach(item => {
      target.appendChild(createLibraryCard(item.title, `${item.patient} · ${item.blocks.length} block · sparad ${item.createdAt}`));
    });
  }

  function createLibraryCard(title, description) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(description)}</p>`;
    return card;
  }

  function createTextInput(label, value, onChange, compact = false) {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `<label class="field-label">${label}</label><input type="text" class="form-control" value="${escapeAttribute(value || '')}"/>`;
    group.querySelector('input').addEventListener('input', event => onChange(event.target.value));
    if (compact) group.style.marginBottom = '6px';
    return group;
  }

  function createTextarea(label, value, onChange) {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `<label class="field-label">${label}</label><textarea>${escapeHtml(value || '')}</textarea>`;
    group.querySelector('textarea').addEventListener('input', event => onChange(event.target.value));
    return group;
  }

  function createNumberInput(label, value, min, max, onChange) {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `<label class="field-label">${label}</label><input type="number" class="form-control" min="${min}" max="${max}" value="${value}"/>`;
    group.querySelector('input').addEventListener('input', event => {
      const next = clamp(Number(event.target.value || min), min, max);
      onChange(next);
    });
    return group;
  }

  function createSelect(label, value, options, onChange) {
    const group = document.createElement('div');
    group.className = 'field-group';
    const select = document.createElement('select');
    select.className = 'form-control';
    options.forEach(optionValue => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = optionValue;
      option.selected = value === optionValue;
      select.appendChild(option);
    });
    select.addEventListener('change', event => onChange(event.target.value));
    const labelNode = document.createElement('label');
    labelNode.className = 'field-label';
    labelNode.textContent = label;
    group.append(labelNode, select);
    return group;
  }

  function createToggle(checked, onChange, label, help) {
    const toggle = document.createElement('div');
    toggle.className = 'toggle-row';
    toggle.innerHTML = `
      <div>
        <div class="field-label" style="margin-bottom:4px">${label}</div>
        <div class="inline-help">${help}</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" ${checked ? 'checked' : ''}/>
        <span class="toggle-slider"></span>
      </label>
    `;
    toggle.querySelector('input').addEventListener('change', event => onChange(event.target.checked));
    return toggle;
  }

  function getDropBeforeId(y) {
    const cards = [...els.stack.querySelectorAll('.canvas-block:not(.dragging)')];
    let closest = { offset: Number.NEGATIVE_INFINITY, id: null };
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const offset = y - rect.top - rect.height / 2;
      if (offset < 0 && offset > closest.offset) {
        closest = { offset, id: card.dataset.blockId };
      }
    });
    return closest.id;
  }

  function getScaleRange(settings) {
    if (settings.scale === '0-10') return { min: 0, max: 10 };
    if (settings.scale === '1-5') return { min: 1, max: 5 };
    if (settings.scale === '1-7') return { min: 1, max: 7 };
    if (settings.scale === 'SUDS 0-100') return { min: 0, max: 100 };
    return { min: Number(settings.customMin), max: Number(settings.customMax) };
  }

  function getScaleValues(min, max) {
    const spread = max - min;
    if (spread <= 12) return Array.from({ length: spread + 1 }, (_, index) => min + index);
    return [min, min + Math.round(spread * 0.25), min + Math.round(spread * 0.5), min + Math.round(spread * 0.75), max];
  }

  function createTableCells(rows, cols, existing = []) {
    return Array.from({ length: rows }, (_, rowIndex) => Array.from({ length: cols }, (_, colIndex) => {
      const fromExisting = existing[rowIndex]?.[colIndex];
      if (fromExisting) return { ...fromExisting };
      return { type: rowIndex === 0 ? 'static' : 'patient', text: rowIndex === 0 ? `Rubrik ${colIndex + 1}` : '' };
    }));
  }

  function resizeTable(block, rows, cols) {
    block.settings.rows = clamp(rows, 1, 8);
    block.settings.cols = clamp(cols, 1, 4);
    block.settings.cells = createTableCells(block.settings.rows, block.settings.cols, block.settings.cells);
  }

  function getBlockTitle(block) {
    if (block.type === 'info') return block.settings.title || 'Informationstext';
    if (block.type === 'textfield') return block.settings.label || 'Textfält';
    if (block.type === 'rating') return block.settings.label || 'Skattningsbox';
    if (block.type === 'table') return `${block.settings.rows} × ${block.settings.cols} tabell`;
    if (block.type === 'emoji') return block.settings.label || 'Emoji-skala';
    return block.title;
  }

  function getBlockSummary(block) {
    if (block.type === 'info') return 'Statisk text och instruktioner';
    if (block.type === 'textfield') return `Max ${block.settings.maxChars} tecken`;
    if (block.type === 'rating') return `${block.settings.scale} · ${block.settings.ratingType === 'slider' ? 'dragbar mätare' : 'klickbar skala'}`;
    if (block.type === 'table') return `${block.settings.rows} rader · ${block.settings.cols} kolumner`;
    if (block.type === 'emoji') return `Förvalt läge: ${block.settings.defaultValue}/6`;
    return '';
  }

  function getMaterialTitle() {
    return state.blocks[0]?.settings?.title || state.blocks[0]?.settings?.label || `Patientmaterial ${new Date().toLocaleDateString('sv-SE')}`;
  }

  function labelForType(type) {
    const labels = {
      info: 'Information',
      textfield: 'Textfält',
      rating: 'Skattning',
      table: 'Tabell',
      emoji: 'Emoji'
    };
    return labels[type] || type;
  }

  function openModal(element) {
    element.classList.add('open');
    element.setAttribute('aria-hidden', 'false');
  }

  function closeModal(element) {
    element.classList.remove('open');
    element.setAttribute('aria-hidden', 'true');
  }

  function showToast(title, detail = '') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<strong>${escapeHtml(title)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ''}`;
    els.toastArea.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replaceAll('`', '&#96;');
  }
}
