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
    library: 'kbtapp_material_library',
    assigned: 'kbtapp_assigned_materials',
    submissions: 'kbtapp_material_submissions'
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
    suppressLibraryClickUntil: 0,
    assignedPatientId: patients[0].id,
    activeClientPatientId: patients[0].id
  };

  const collapsedTypes = new Set(['rating', 'textfield', 'table', 'emoji', 'info']);

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
    clientAssignmentsGrid: document.getElementById('client-assignments-grid'),
    clientMaterialsGrid: document.getElementById('client-materials-grid'),
    therapistSubmissionsGrid: document.getElementById('therapist-submissions-grid'),
    toastArea: document.getElementById('toast-area')
  };

  const materialSeed = [
    { title: 'Sömnregistrering', description: 'Typ: Hemuppgift · status: aktiv mall' },
    { title: 'Beteendeaktivering – vecka 1', description: 'Typ: Hemuppgift · status: sparad version' },
    { title: 'Psykoedukation om oro', description: 'Typ: Material · status: publicerbar' }
  ];
  const clientMaterialSeed = [
    { title: 'Vad är oro?', description: 'Psykoedukation · läst 80%' },
    { title: 'Sömn och återhämtning', description: 'Artikel · sparad' },
    { title: 'Andningsövning', description: 'Övning · redo att öppnas' }
  ];
  const templateSeed = [
    { title: 'Tankefälla – registrering', description: 'Importera till arbetsytan och skapa patientversion.' },
    { title: 'Exponering – planeringsblad', description: 'Bas för gradvis exponering med anpassningsbara steg.' },
    { title: 'Värderad riktning', description: 'Mall för ACT-inspirerad reflektionsövning.' }
  ];

  bindPanelLibrary();
  bindToolbar();
  bindModals();
  renderSavedCollections();
  render();

  function bindPanelLibrary() {
    els.library.querySelectorAll('.library-block').forEach(item => {
      item.addEventListener('click', event => {
        if (Date.now() < state.suppressLibraryClickUntil) return;
        if (event.target.closest('.library-add-badge')) {
          event.preventDefault();
        }
        addBlock(item.dataset.blockType);
      });
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
    requestAnimationFrame(() => {
      const inserted = els.stack.querySelector(`[data-block-id="${block.id}"]`);
      inserted?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function moveBlockToIndex(id, targetIndex) {
    const currentIndex = state.blocks.findIndex(block => block.id === id);
    if (currentIndex === -1) return;
    const boundedIndex = clamp(targetIndex, 0, state.blocks.length - 1);
    if (currentIndex === boundedIndex) return;
    const [block] = state.blocks.splice(currentIndex, 1);
    state.blocks.splice(boundedIndex, 0, block);
    state.selectedBlockId = id;
    render();
    showToast('Block flyttat', `Blocket ligger nu på plats ${boundedIndex + 1} av ${state.blocks.length}.`);
    requestAnimationFrame(() => {
      const moved = els.stack.querySelector(`[data-block-id="${id}"]`);
      moved?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }

  function removeBlock(id) {
    state.blocks = state.blocks.filter(block => block.id !== id);
    if (state.selectedBlockId === id) {
      state.selectedBlockId = state.blocks[0]?.id || null;
    }
    render();
  }

  function updateBlock(id, updater, options = {}) {
    const block = state.blocks.find(item => item.id === id);
    if (!block) return;
    updater(block);
    render(options);
  }

  function createBlock(type) {
    const id = `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    switch (type) {
      case 'info':
        return { id, type, title: 'Informationstext', collapsed: collapsedTypes.has(type), settings: { title: 'Informationstext', content: 'Skriv instruktioner, sammanhang eller psykoedukation här.' } };
      case 'textfield':
        return { id, type, title: 'Textfält', collapsed: collapsedTypes.has(type), settings: { label: 'Beskriv vad du lade märke till', maxChars: 2000 } };
      case 'rating':
        return { id, type, title: 'Skattningsbox', collapsed: collapsedTypes.has(type), settings: { label: 'Ångestnivå', scale: '0-10', customMin: 0, customMax: 10, ratingType: 'clickable' } };
      case 'table':
        return { id, type, title: 'Tabell', collapsed: collapsedTypes.has(type), settings: { rows: 3, cols: 3, headerRow: true, cells: createTableCells(3, 3) } };
      case 'emoji':
        return { id, type, title: 'Emoji-skala', collapsed: collapsedTypes.has(type), settings: { label: 'Hur känns det just nu?', defaultValue: 4 } };
      default:
        return null;
    }
  }

  function render(options = {}) {
    renderCanvas();
    renderSettings(options);
  }

  function renderCanvas() {
    els.stack.innerHTML = '';
    els.empty.style.display = state.blocks.length ? 'none' : 'flex';
    els.count.textContent = `${state.blocks.length} block`;

    state.blocks.forEach((block, index) => {
      const card = document.createElement('article');
      card.className = `canvas-block ${state.selectedBlockId === block.id ? 'selected' : ''} ${block.collapsed ? 'collapsed' : ''}`;
      card.dataset.blockId = block.id;
      card.innerHTML = `
        <div class="block-order-bar">
          <div class="block-order-copy">
            <span class="block-order-label">Placering ${index + 1} av ${state.blocks.length}</span>
            <small>Flytta blocket stegvis eller direkt till toppen/botten.</small>
          </div>
          <div class="reorder-actions" aria-label="Flytta block">
            <button class="reorder-button" type="button" data-move="top" ${index === 0 ? 'disabled' : ''} aria-label="Flytta till toppen" title="Flytta till toppen">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="m6 11 6-6 6 6"/></svg>
            </button>
            <button class="reorder-button" type="button" data-move="up" ${index === 0 ? 'disabled' : ''} aria-label="Flytta upp" title="Flytta upp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>
            </button>
            <button class="reorder-button" type="button" data-move="down" ${index === state.blocks.length - 1 ? 'disabled' : ''} aria-label="Flytta ned" title="Flytta ned">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
            </button>
            <button class="reorder-button" type="button" data-move="bottom" ${index === state.blocks.length - 1 ? 'disabled' : ''} aria-label="Flytta till botten" title="Flytta till botten">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><path d="m18 13-6 6-6-6"/></svg>
            </button>
          </div>
        </div>
        <div class="block-top">
          <div class="block-meta">
            <span class="block-chip">${labelForType(block.type)}</span>
            <div>
              <div class="block-title">${escapeHtml(getBlockTitle(block))}</div>
              <small>${getBlockSummary(block)}</small>
            </div>
          </div>
          <div class="block-actions">
            <button class="block-collapse" type="button" aria-label="${block.collapsed ? 'Visa block' : 'Dölj block'}" title="${block.collapsed ? 'Rulla upp block' : 'Rulla ihop block'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button class="block-remove" type="button" aria-label="Ta bort block">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18"/><path d="M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div class="block-body ${block.collapsed ? 'is-collapsed' : ''}"></div>
      `;

      card.addEventListener('click', event => {
        if (event.target.closest('.block-remove') || event.target.closest('.block-collapse') || event.target.closest('.reorder-button')) return;
        state.selectedBlockId = block.id;
        renderSettings();
        renderCanvas();
        if (window.innerWidth <= 860) els.settingsPanel.classList.add('open');
      });

      card.querySelector('.block-remove').addEventListener('click', event => {
        event.stopPropagation();
        removeBlock(block.id);
      });

      card.querySelector('.block-collapse').addEventListener('click', event => {
        event.stopPropagation();
        updateBlock(block.id, item => { item.collapsed = !item.collapsed; });
      });

      card.querySelectorAll('.reorder-button').forEach(button => {
        button.addEventListener('click', event => {
          event.stopPropagation();
          const move = button.dataset.move;
          if (move === 'top') moveBlockToIndex(block.id, 0);
          if (move === 'up') moveBlockToIndex(block.id, index - 1);
          if (move === 'down') moveBlockToIndex(block.id, index + 1);
          if (move === 'bottom') moveBlockToIndex(block.id, state.blocks.length - 1);
        });
      });

      const body = card.querySelector('.block-body');
      if (!block.collapsed) {
        body.appendChild(renderBlockPreview(block, false));
      }
      els.stack.appendChild(card);
    });
  }

  function renderSettings(options = {}) {
    const block = state.blocks.find(item => item.id === state.selectedBlockId);
    const preserve = options.preserveFocus;
    const activeElement = preserve ? document.activeElement : null;
    const activeName = preserve && activeElement ? activeElement.getAttribute('data-setting-name') : null;
    const activeSelectionStart = preserve && activeElement && typeof activeElement.selectionStart === 'number' ? activeElement.selectionStart : null;
    const activeSelectionEnd = preserve && activeElement && typeof activeElement.selectionEnd === 'number' ? activeElement.selectionEnd : null;

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

    if (preserve && activeName) {
      const nextField = els.settingsContent.querySelector(`[data-setting-name="${activeName}"]`);
      if (nextField) {
        nextField.focus({ preventScroll: true });
        if (typeof nextField.selectionStart === 'number' && activeSelectionStart !== null && activeSelectionEnd !== null) {
          nextField.setSelectionRange(activeSelectionStart, activeSelectionEnd);
        }
      }
    }
  }

  function renderInfoSettings(container, block) {
    container.append(
      createTextInput('Rubrik', block.settings.title, value => updateBlock(block.id, item => { item.settings.title = value; item.title = value || 'Informationstext'; }, { preserveFocus: true }), 'info-title'),
      createTextarea('Innehåll', block.settings.content, value => updateBlock(block.id, item => { item.settings.content = value; }, { preserveFocus: true }), 'info-content')
    );
  }

  function renderTextFieldSettings(container, block) {
    container.append(
      createTextInput('Ledtext', block.settings.label, value => updateBlock(block.id, item => { item.settings.label = value; }, { preserveFocus: true }), 'textfield-label'),
      createNumberInput('Max tecken', block.settings.maxChars, 50, 2000, value => updateBlock(block.id, item => { item.settings.maxChars = value; }, { preserveFocus: true }), 'textfield-maxchars')
    );
  }

  function renderRatingSettings(container, block) {
    container.append(
      createTextInput('Etikett', block.settings.label, value => updateBlock(block.id, item => { item.settings.label = value; }, { preserveFocus: true }), 'rating-label'),
      createSelect('Skala', block.settings.scale, ['0-10', '1-5', '1-7', 'SUDS 0-100', 'custom'], value => updateBlock(block.id, item => { item.settings.scale = value; }, { preserveFocus: true }), 'rating-scale')
    );
    if (block.settings.scale === 'custom') {
      const row = document.createElement('div');
      row.className = 'field-row';
      row.append(
        createNumberInput('Minvärde', block.settings.customMin, -100, 100, value => updateBlock(block.id, item => { item.settings.customMin = value; }, { preserveFocus: true }), 'rating-custom-min'),
        createNumberInput('Maxvärde', block.settings.customMax, -100, 100, value => updateBlock(block.id, item => { item.settings.customMax = value; }, { preserveFocus: true }), 'rating-custom-max')
      );
      container.appendChild(row);
    }

    const radioGroup = document.createElement('div');
    radioGroup.className = 'field-group';
    radioGroup.innerHTML = '<label class="field-label">Typ</label>';
    const radioRow = document.createElement('div');
    radioRow.className = 'radio-row';
    [['clickable', 'Klickbara skalsteg'], ['slider', 'Dragbar horisontell mätare']].forEach(([value, label]) => {
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
      createNumberInput('Rader', block.settings.rows, 1, 8, value => updateBlock(block.id, item => resizeTable(item, value, item.settings.cols), { preserveFocus: true }), 'table-rows'),
      createNumberInput('Kolumner', block.settings.cols, 1, 4, value => updateBlock(block.id, item => resizeTable(item, item.settings.rows, value), { preserveFocus: true }), 'table-cols')
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
          createTextInput('Text', cell.text, value => updateBlock(block.id, item => { item.settings.cells[rowIndex][colIndex].text = value; }, { preserveFocus: true }), `table-${rowIndex}-${colIndex}-text`, true),
          createToggle(cell.type === 'patient', checked => updateBlock(block.id, item => { item.settings.cells[rowIndex][colIndex].type = checked ? 'patient' : 'static'; }), 'Patientfält', 'Låt patienten fylla i denna cell')
        );
        cellGrid.appendChild(editor);
      });
    });
    container.appendChild(cellGrid);
  }

  function renderEmojiSettings(container, block) {
    container.append(
      createTextInput('Etikett', block.settings.label, value => updateBlock(block.id, item => { item.settings.label = value; }, { preserveFocus: true }), 'emoji-label'),
      createNumberInput('Förvalt värde', block.settings.defaultValue, 1, 6, value => updateBlock(block.id, item => { item.settings.defaultValue = value; }, { preserveFocus: true }), 'emoji-default')
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
          slider.className = 'slider-preview horizontal';
          const scaleTop = document.createElement('div');
          scaleTop.className = 'slider-scale horizontal';
          scaleTop.innerHTML = `<strong>${min}</strong><span>Dragbar nivå</span><strong>${max}</strong>`;
          const rail = document.createElement('div');
          rail.className = 'slider-rail horizontal';
          const fill = document.createElement('div');
          fill.className = 'slider-fill';
          fill.style.width = '50%';
          const thumb = document.createElement('div');
          thumb.className = 'slider-thumb horizontal';
          thumb.style.left = 'calc(50% - 16px)';
          rail.append(fill, thumb);
          slider.append(scaleTop, rail);
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
      const patient = patients.find(item => item.id === state.assignedPatientId);
      const intro = document.createElement('section');
      intro.className = 'preview-intro';
      intro.innerHTML = `
        <div>
          <span class="preview-kicker">Patientvy</span>
          <h4>${escapeHtml(getMaterialTitle())}</h4>
          <p>Så här möter materialet patienten i samma fönster, med lugn läsrytm och tydliga block.</p>
        </div>
        <div class="preview-meta-pills">
          <span>${state.blocks.length} block</span>
          <span>${escapeHtml(patient ? patient.name : 'Ingen vald patient')}</span>
        </div>
      `;
      els.previewShell.appendChild(intro);

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
    state.activeClientPatientId = state.assignedPatientId;
    const patient = patients.find(item => item.id === state.assignedPatientId);
    const title = getMaterialTitle();
    const assignedEntry = {
      id: `assigned_${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      title,
      createdAt: new Date().toLocaleString('sv-SE'),
      status: 'tilldelad',
      blocks: structuredClone(state.blocks)
    };
    const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.assigned) || '[]');
    current.unshift(assignedEntry);
    localStorage.setItem(STORAGE_KEYS.assigned, JSON.stringify(current));
    renderSavedCollections();
    showToast('Material tilldelat', `${title} skickades till ${patient.name}.`);
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
    renderClientAssignments();
    renderClientMaterials();
    renderTherapistSubmissions();
  }

  function renderClientAssignments() {
    const assigned = JSON.parse(localStorage.getItem(STORAGE_KEYS.assigned) || '[]').filter(item => item.patientId === state.activeClientPatientId);
    if (!els.clientAssignmentsGrid) return;
    els.clientAssignmentsGrid.innerHTML = '';
    if (!assigned.length) {
      els.clientAssignmentsGrid.innerHTML = '<div class="card"><h3>Inga tilldelade hemuppgifter ännu</h3><p>När terapeuten skickar material till Maja Svensson visas det här.</p></div>';
      return;
    }
    assigned.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3>${escapeHtml(item.title)}</h3><p>Status: ${escapeHtml(item.status)}</p><p>${item.blocks.length} block · tilldelad ${escapeHtml(item.createdAt)}</p><button class="builder-action accent" type="button">Skicka in till terapeut</button>`;
      card.querySelector('button').addEventListener('click', () => submitAssignment(item.id));
      els.clientAssignmentsGrid.appendChild(card);
    });
  }

  function renderClientMaterials() {
    if (!els.clientMaterialsGrid) return;
    els.clientMaterialsGrid.innerHTML = '';
    clientMaterialSeed.forEach(item => els.clientMaterialsGrid.appendChild(createLibraryCard(item.title, item.description)));
    const assigned = JSON.parse(localStorage.getItem(STORAGE_KEYS.assigned) || '[]').filter(item => item.patientId === state.activeClientPatientId);
    assigned.forEach(item => {
      els.clientMaterialsGrid.appendChild(createLibraryCard(item.title, `${item.patientName} · ${item.blocks.length} block · status ${item.status}`));
    });
  }

  function submitAssignment(assignmentId) {
    const assigned = JSON.parse(localStorage.getItem(STORAGE_KEYS.assigned) || '[]');
    const item = assigned.find(entry => entry.id === assignmentId);
    if (!item) return;
    item.status = 'inskickad';
    localStorage.setItem(STORAGE_KEYS.assigned, JSON.stringify(assigned));
    const submissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.submissions) || '[]');
    submissions.unshift({
      id: `submission_${Date.now()}`,
      assignmentId: item.id,
      patientId: item.patientId,
      patientName: item.patientName,
      title: item.title,
      submittedAt: new Date().toLocaleString('sv-SE'),
      blocks: item.blocks
    });
    localStorage.setItem(STORAGE_KEYS.submissions, JSON.stringify(submissions));
    renderSavedCollections();
    showToast('Inskickat', `${item.title} skickades in av ${item.patientName}.`);
  }

  function renderTherapistSubmissions() {
    if (!els.therapistSubmissionsGrid) return;
    const submissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.submissions) || '[]');
    els.therapistSubmissionsGrid.innerHTML = '';
    if (!submissions.length) {
      els.therapistSubmissionsGrid.innerHTML = '<div class="card"><h3>Inga inskick ännu</h3><p>När patienten skickar in material visas det här.</p></div>';
      return;
    }
    submissions.forEach(item => {
      els.therapistSubmissionsGrid.appendChild(createLibraryCard(item.title, `${item.patientName} · inskickad ${item.submittedAt} · ${item.blocks.length} block`));
    });
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

  function createTextInput(label, value, onChange, fieldName = '', compact = false) {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `<label class="field-label">${label}</label><input type="text" class="form-control" data-setting-name="${escapeAttribute(fieldName)}" value="${escapeAttribute(value || '')}"/>`;
    group.querySelector('input').addEventListener('input', event => onChange(event.target.value));
    if (compact) group.style.marginBottom = '6px';
    return group;
  }

  function createTextarea(label, value, onChange, fieldName = '') {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `<label class="field-label">${label}</label><textarea data-setting-name="${escapeAttribute(fieldName)}">${escapeHtml(value || '')}</textarea>`;
    group.querySelector('textarea').addEventListener('input', event => onChange(event.target.value));
    return group;
  }

  function createNumberInput(label, value, min, max, onChange, fieldName = '') {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `<label class="field-label">${label}</label><input type="number" class="form-control" data-setting-name="${escapeAttribute(fieldName)}" min="${min}" max="${max}" value="${value}"/>`;
    group.querySelector('input').addEventListener('input', event => {
      const next = clamp(Number(event.target.value || min), min, max);
      onChange(next);
    });
    return group;
  }

  function createSelect(label, value, options, onChange, fieldName = '') {
    const group = document.createElement('div');
    group.className = 'field-group';
    const select = document.createElement('select');
    select.className = 'form-control';
    select.setAttribute('data-setting-name', fieldName);
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
