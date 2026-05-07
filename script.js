document.addEventListener('DOMContentLoaded', () => {
  const AUTH_STORAGE_KEY = 'kbtapp_auth_token';
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
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const authFeedback = document.getElementById('auth-feedback');
  const therapistHeaderName = document.getElementById('therapist-header-name');
  const clientHeaderName = document.getElementById('client-header-name');

  const authState = {
    role: 'therapist',
    user: null
  };

  function getAuthToken() {
    return localStorage.getItem(AUTH_STORAGE_KEY) || '';
  }

  function setAuthFeedback(message, tone = 'neutral') {
    if (!authFeedback) return;
    authFeedback.textContent = message;
    authFeedback.dataset.tone = tone;
  }

  async function apiRequest(url, payload = {}, options = {}) {
    const token = getAuthToken();
    let response;
    try {
      response = await fetch(url, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: options.method === 'GET' ? undefined : JSON.stringify(payload)
      });
    } catch (error) {
      throw new Error('Kunde inte nå servern. Starta appen lokalt och försök igen.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Något gick fel.');
    }
    return data;
  }

  function setAuthFormBusy(form, isBusy, busyLabel) {
    if (!form) return;
    const submitButton = form.querySelector('.auth-submit');
    if (!submitButton) return;
    if (!submitButton.dataset.idleLabel) {
      submitButton.dataset.idleLabel = submitButton.textContent.trim();
    }
    submitButton.disabled = isBusy;
    submitButton.textContent = isBusy ? busyLabel : submitButton.dataset.idleLabel;
  }

  function syncRoleButtons() {
    document.querySelectorAll('[data-auth-role]').forEach(button => {
      button.classList.toggle('active', button.dataset.authRole === authState.role);
    });
  }

  function applyUserToUi(user) {
    authState.user = user;
    authState.role = user.role;
    if (therapistHeaderName) therapistHeaderName.textContent = user.role === 'therapist' ? user.name : 'Dr. Lindgren';
    if (clientHeaderName) clientHeaderName.textContent = user.role === 'client' ? user.name.split(' ')[0] : 'Maja';
  }

  function closeVisibleOverlays() {
    document.querySelectorAll('.overlay-modal.open').forEach(modal => {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    });
    document.body.classList.remove('modal-open');
  }

  function openRole(role) {
    closeVisibleOverlays();
    authState.role = role;
    syncRoleButtons();
    loginView.classList.remove('active');
    therapistView.classList.remove('active');
    clientView.classList.remove('active');
    if (role === 'therapist') therapistView.classList.add('active');
    else clientView.classList.add('active');
  }

  document.querySelectorAll('[data-auth-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      authState.role = btn.dataset.authRole || 'therapist';
      syncRoleButtons();
      setAuthFeedback(`Vald roll: ${authState.role === 'therapist' ? 'terapeut' : 'patient'}.`, 'neutral');
    });
  });

  document.querySelectorAll('.logout').forEach(item => {
    item.addEventListener('click', async e => {
      e.preventDefault();
      try {
        await apiRequest('/api/auth/logout', {}, { method: 'POST' });
      } catch (error) {
        // ignored on logout
      }
      localStorage.removeItem(AUTH_STORAGE_KEY);
      authState.user = null;
      closeVisibleOverlays();
      therapistView.classList.remove('active');
      clientView.classList.remove('active');
      loginView.classList.add('active');
      setAuthFeedback('Du är utloggad.', 'success');
      document.dispatchEvent(new CustomEvent('kbtapp:auth-changed', { detail: { loggedIn: false, user: null } }));
    });
  });

  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    setAuthFeedback('Loggar in…', 'neutral');
    setAuthFormBusy(loginForm, true, 'Loggar in…');
    try {
      const result = await apiRequest('/api/auth/login', {
        email: formData.get('email'),
        password: formData.get('password'),
        role: authState.role
      });
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      applyUserToUi(result.user);
      loginForm.reset();
      setAuthFeedback(`Inloggad som ${result.user.name}.`, 'success');
      openRole(result.user.role);
      document.dispatchEvent(new CustomEvent('kbtapp:auth-changed', { detail: { loggedIn: true, role: result.user.role, user: result.user } }));
    } catch (error) {
      setAuthFeedback(error.message, 'error');
    } finally {
      setAuthFormBusy(loginForm, false);
    }
  });

  registerForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const password = String(formData.get('password') || '');
    const passwordConfirm = String(formData.get('passwordConfirm') || '');

    if (password !== passwordConfirm) {
      setAuthFeedback('Lösenorden matchar inte. Kontrollera och försök igen.', 'error');
      return;
    }

    setAuthFeedback('Skapar konto…', 'neutral');
    setAuthFormBusy(registerForm, true, 'Skapar konto…');
    try {
      const result = await apiRequest('/api/auth/register', {
        name: formData.get('name'),
        email: formData.get('email'),
        password,
        role: authState.role
      });
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      applyUserToUi(result.user);
      registerForm.reset();
      setAuthFeedback(`Konto skapat för ${result.user.name}.`, 'success');
      openRole(result.user.role);
      document.dispatchEvent(new CustomEvent('kbtapp:auth-changed', { detail: { loggedIn: true, role: result.user.role, user: result.user } }));
    } catch (error) {
      setAuthFeedback(error.message, 'error');
    } finally {
      setAuthFormBusy(registerForm, false);
    }
  });

  async function restoreSession() {
    const token = getAuthToken();
    if (!token) {
      syncRoleButtons();
      return;
    }
    try {
      const result = await apiRequest('/api/auth/session', {}, { method: 'GET' });
      applyUserToUi(result.user);
      setAuthFeedback(`Välkommen tillbaka, ${result.user.name}.`, 'success');
      openRole(result.user.role);
      document.dispatchEvent(new CustomEvent('kbtapp:auth-changed', { detail: { loggedIn: true, role: result.user.role, restored: true, user: result.user } }));
    } catch (error) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthFeedback('Tidigare session kunde inte återställas. Logga in igen.', 'error');
      syncRoleButtons();
    }
  }

  function setupNav(viewElement) {
    const sideNav = viewElement.querySelector('.side-nav');
    const bottomNav = viewElement.querySelector('.bottom-nav');
    const main = viewElement.querySelector('.app-main');

    function switchPage(pageId) {
      closeVisibleOverlays();
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
      main.scrollTo({ top: 0, behavior: 'smooth' });
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

    viewElement.querySelectorAll('[data-quick-nav]').forEach(button => {
      button.addEventListener('click', () => switchPage(button.dataset.quickNav));
    });
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
  restoreSession();
});

function initMaterialBuilder() {
  const STORAGE_KEYS = {
    auth: 'kbtapp_auth_token',
    templates: 'kbtapp_templates',
    library: 'kbtapp_material_library',
    assigned: 'kbtapp_assigned_materials',
    submissions: 'kbtapp_material_submissions',
    messages: 'kbtapp_messages'
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
    activeClientPatientId: patients[0].id,
    activeAssignmentId: null,
    activeSubmissionId: null,
    activeTherapistThreadPatientId: patients[0].id,
    submissionFilter: 'alla',
    submissionSort: 'needs-review',
    serverAssigned: [],
    serverSubmissions: [],
    serverMessages: [],
    serverLibrary: [],
    serverDataLoaded: false,
    currentUser: null,
    linkedClients: []
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
    submissionSortSelect: document.getElementById('submission-sort-select'),
    submissionListSummary: document.getElementById('submission-list-summary'),
    openNextSubmissionButton: document.getElementById('open-next-submission'),
    assignmentModal: document.getElementById('assignment-modal'),
    assignmentShell: document.getElementById('assignment-shell'),
    assignmentModalTitle: document.getElementById('assignment-modal-title'),
    submitAssignmentModal: document.getElementById('submit-assignment-modal'),
    submissionModal: document.getElementById('submission-modal'),
    submissionShell: document.getElementById('submission-shell'),
    submissionModalTitle: document.getElementById('submission-modal-title'),
    submissionFeedbackInput: document.getElementById('submission-feedback-input'),
    sendSubmissionFeedback: document.getElementById('send-submission-feedback'),
    markSubmissionReviewed: document.getElementById('mark-submission-reviewed'),
    toastArea: document.getElementById('toast-area'),
    therapistThreadList: document.getElementById('therapist-thread-list'),
    therapistMessageList: document.getElementById('therapist-message-list'),
    therapistThreadTitle: document.getElementById('therapist-thread-title'),
    therapistThreadSubtitle: document.getElementById('therapist-thread-subtitle'),
    therapistThreadStatus: document.getElementById('therapist-thread-status'),
    therapistMessageForm: document.getElementById('therapist-message-form'),
    therapistMessageInput: document.getElementById('therapist-message-input'),
    therapistQuickReplies: document.getElementById('therapist-quick-replies'),
    clientMessageList: document.getElementById('client-message-list'),
    clientThreadTitle: document.getElementById('client-thread-title'),
    clientThreadSubtitle: document.getElementById('client-thread-subtitle'),
    clientThreadStatus: document.getElementById('client-thread-status'),
    clientMessageForm: document.getElementById('client-message-form'),
    clientMessageInput: document.getElementById('client-message-input'),
    clientQuickReplies: document.getElementById('client-quick-replies')
  };

  const therapistQuickReplySeed = [
    'Tack, jag ser detta och återkommer i lugn takt.',
    'Bra att du hör av dig. Fortsätt där du är så följer vi upp nästa gång.',
    'Det låter som ett rimligt nästa steg. Testa gärna en liten del först.'
  ];

  const clientQuickReplySeed = [
    'Jag har gjort första delen av hemuppgiften.',
    'Jag fastnade på en fråga och vill be om förtydligande.',
    'Jag vill dela hur det gick efter övningen.'
  ];

  const materialSeed = [
    { title: 'Sömnregistrering', description: 'Kvällsvanor, uppvaknanden och kort morgonreflektion för en lugn veckoöverblick.', meta: ['7–10 min', 'Aktiv mall'], type: 'Hemuppgift' },
    { title: 'Beteendeaktivering – vecka 1', description: 'Tre små aktiviteter med energiskattning före och efter samt uppföljningsfråga.', meta: ['10–15 min', 'Sparad version'], type: 'Hemuppgift' },
    { title: 'Psykoedukation om oro', description: 'Patientvänlig genomgång av oro, undvikande och varför exponering hjälper på sikt.', meta: ['4 min läsning', 'Publicerbar'], type: 'Material' }
  ];
  const clientMaterialSeed = [
    { title: 'Vad är oro?', description: 'Kort introduktion med varm ton och konkreta exempel från vardagen.', meta: ['Läst 80%', '2 min kvar'], type: 'Material' },
    { title: 'Sömn och återhämtning', description: 'Lugn artikel om kvällsrutiner, skärmtid och återhämtning mellan sessioner.', meta: ['Sparad', 'Lästid 5 min'], type: 'Material' },
    { title: 'Andningsövning', description: 'Guidad mikropaus för att landa innan en uppgift eller efter en intensiv dag.', meta: ['2 minuter', 'Redo att öppnas'], type: 'Övning' }
  ];
  const templateSeed = [
    { title: 'Tankefälla – registrering', description: 'Situation, automatisk tanke, alternativ tanke och nästa lilla test i ett tydligt flöde.', meta: ['4 block', 'Redo att importera'], type: 'Mall' },
    { title: 'Exponering – planeringsblad', description: 'Trappa med förväntad SUDS, faktisk upplevelse och lärdom efteråt.', meta: ['6 block', 'Vanlig i KBT'], type: 'Mall' },
    { title: 'Värderad riktning', description: 'ACT-inspirerad övning om riktning, hinder och ett litet steg till nästa vecka.', meta: ['5 block', 'Lugn ton'], type: 'Mall' }
  ];

  bindPanelLibrary();
  bindToolbar();
  bindModals();
  bindMessaging();
  bindSubmissionFilters();
  loadServerCollections().finally(() => {
    renderSavedCollections();
    render();
  });

  function getAuthToken() {
    return localStorage.getItem(STORAGE_KEYS.auth) || '';
  }

  async function serverDataRequest(url, payload = {}, method = 'GET') {
    const token = getAuthToken();
    if (!token) throw new Error('Ingen aktiv session.');
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: method === 'GET' ? undefined : JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Kunde inte spara data.');
    return data;
  }

  function createPatientProfile(id, name, userId = null) {
    return { id, name, userId };
  }

  function getCurrentTherapistIdentity() {
    if (state.currentUser?.role === 'therapist') {
      return {
        therapistUserId: state.currentUser.id,
        therapistName: state.currentUser.name
      };
    }
    return {
      therapistUserId: '',
      therapistName: 'Dr. Lindgren'
    };
  }

  function patientProfileFromUser(user) {
    if (!user || user.role !== 'client') return null;
    return createPatientProfile(`client_${user.id}`, user.name, user.id);
  }

  function shouldPreferRegisteredClients() {
    return state.currentUser?.role === 'therapist';
  }

  function getKnownPatients() {
    const seedProfiles = shouldPreferRegisteredClients() ? [] : patients.map(item => createPatientProfile(item.id, item.name));
    const dynamicProfiles = state.linkedClients
      .map(user => ({ ...user, isLinked: true }))
      .map(user => patientProfileFromUser(user))
      .filter(Boolean);
    const currentClientProfile = patientProfileFromUser(state.currentUser);
    const combined = [...seedProfiles, ...dynamicProfiles, ...(currentClientProfile ? [currentClientProfile] : [])];
    const seen = new Set();
    return combined.filter(profile => {
      if (!profile?.id || seen.has(profile.id)) return false;
      seen.add(profile.id);
      return true;
    });
  }

  function getDefaultAssignedPatientId() {
    return getKnownPatients()[0]?.id || '';
  }

  function getCurrentClientPatientId() {
    return patientProfileFromUser(state.currentUser)?.id || state.activeClientPatientId || getDefaultAssignedPatientId();
  }

  function syncActivePatientState() {
    const knownPatients = getKnownPatients();
    const clientPatientId = getCurrentClientPatientId();
    if (!knownPatients.some(item => item.id === state.assignedPatientId)) {
      state.assignedPatientId = getDefaultAssignedPatientId();
    }
    if (state.currentUser?.role === 'client') {
      state.activeClientPatientId = clientPatientId;
    } else if (!knownPatients.some(item => item.id === state.activeClientPatientId)) {
      state.activeClientPatientId = clientPatientId;
    }
    if (!knownPatients.some(item => item.id === state.activeTherapistThreadPatientId)) {
      state.activeTherapistThreadPatientId = clientPatientId;
    }
  }

  async function loadAvailableClients() {
    if (!getAuthToken()) {
      state.linkedClients = [];
      syncActivePatientState();
      return;
    }
    try {
      if (state.currentUser?.role === 'therapist') {
        const result = await serverDataRequest('/api/relationships/clients');
        state.linkedClients = Array.isArray(result.linkedClients) ? result.linkedClients : [];
      } else {
        state.linkedClients = [];
      }
    } catch (error) {
      console.warn('Kunde inte läsa klientkonton från servern:', error);
      state.linkedClients = [];
    }
    syncActivePatientState();
  }

  async function ensureTherapistClientRelationship(patient) {
    if (!patient?.userId || state.currentUser?.role !== 'therapist') return;
    const alreadyLinked = state.linkedClients.some(user => user.id === patient.userId);
    if (alreadyLinked) return;
    await serverDataRequest('/api/relationships/clients', { clientUserId: patient.userId }, 'POST');
    await loadAvailableClients();
    populatePatientSelect();
  }

  function setLinkClientFeedback(message, tone = 'neutral') {
    const feedback = document.getElementById('link-client-feedback');
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.tone = tone;
  }

  async function linkClientByEmail() {
    const input = document.getElementById('link-client-email');
    const button = document.getElementById('link-client-button');
    const email = String(input?.value || '').trim().toLowerCase();
    if (!email) {
      setLinkClientFeedback('Fyll i patientens registrerade e-postadress först.', 'error');
      return;
    }

    if (button) button.disabled = true;
    setLinkClientFeedback('Länkar patientkonto…', 'neutral');
    try {
      const result = await serverDataRequest('/api/relationships/clients', { clientEmail: email }, 'POST');
      await loadAvailableClients();
      state.assignedPatientId = `client_${result.client.id}`;
      populatePatientSelect();
      if (input) input.value = '';
      setLinkClientFeedback(`${result.client.name} är nu länkad till dig.`, 'success');
      showToast('Patient länkad', result.client.name);
    } catch (error) {
      setLinkClientFeedback(error.message || 'Kunde inte länka patienten.', 'error');
    } finally {
      if (button) button.disabled = false;
    }
  }

  function populatePatientSelect() {
    if (!els.patientSelect) return;
    const knownPatients = getKnownPatients();
    els.patientSelect.innerHTML = '';

    if (!knownPatients.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = state.currentUser?.role === 'therapist'
        ? 'Inga länkade patienter ännu'
        : 'Ingen patient vald';
      option.selected = true;
      els.patientSelect.appendChild(option);
      const confirmAssignButton = document.getElementById('confirm-assign');
      if (confirmAssignButton) confirmAssignButton.disabled = true;
      return;
    }

    const linkedClientIds = new Set(state.linkedClients.map(user => user.id));
    knownPatients.forEach(patient => {
      const option = document.createElement('option');
      option.value = patient.id;
      const isRegisteredClient = patient.id.startsWith('client_');
      const isLinkedRegisteredClient = isRegisteredClient && patient.userId && linkedClientIds.has(patient.userId);
      option.textContent = isRegisteredClient
        ? `${patient.name} (${isLinkedRegisteredClient ? 'min patient' : 'patient'})`
        : `${patient.name} (${patient.id})`;
      option.selected = patient.id === state.assignedPatientId;
      els.patientSelect.appendChild(option);
    });

    const confirmAssignButton = document.getElementById('confirm-assign');
    if (confirmAssignButton) confirmAssignButton.disabled = false;
  }

  function getAssignedItems() {
    return state.serverAssigned;
  }

  function getLibraryItems() {
    return state.serverLibrary;
  }

  function getSubmissionItems() {
    return state.serverSubmissions;
  }

  function getMessageThreads() {
    return ensureMessageThreads();
  }

  async function saveAssignedItems(items) {
    state.serverAssigned = items;
    if (!getAuthToken()) return items;
    const result = await serverDataRequest('/api/data/assigned', { items }, 'PUT');
    state.serverAssigned = Array.isArray(result.items) ? result.items : items;
    return state.serverAssigned;
  }

  async function saveLibraryItems(items) {
    state.serverLibrary = items;
    if (!getAuthToken() || state.currentUser?.role !== 'therapist') {
      localStorage.setItem(STORAGE_KEYS.library, JSON.stringify(items));
      return items;
    }
    const result = await serverDataRequest('/api/data/library', { items }, 'PUT');
    state.serverLibrary = Array.isArray(result.items) ? result.items : items;
    localStorage.setItem(STORAGE_KEYS.library, JSON.stringify(state.serverLibrary));
    return state.serverLibrary;
  }

  async function saveSubmissionItems(items) {
    state.serverSubmissions = items;
    if (!getAuthToken()) return items;
    const result = await serverDataRequest('/api/data/submissions', { items }, 'PUT');
    state.serverSubmissions = Array.isArray(result.items) ? result.items : items;
    return state.serverSubmissions;
  }

  async function saveMessageThreads(items) {
    state.serverMessages = items;
    if (!getAuthToken()) {
      localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(items));
      return items;
    }
    const result = await serverDataRequest('/api/data/messages', { items }, 'PUT');
    state.serverMessages = Array.isArray(result.items) ? result.items : items;
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(state.serverMessages));
    return state.serverMessages;
  }

  function buildAuthBackedThreads() {
    if (state.currentUser?.role === 'therapist') {
      return getKnownPatients().map(patient => createMessageThread(patient, [], { patientUserId: patient.userId || null }));
    }
    return [];
  }

  function isAuthBackedMessageThread(thread) {
    return Boolean(thread?.patientUserId || thread?.therapistUserId || String(thread?.patientId || '').startsWith('client_'));
  }

  async function loadServerCollections() {
    if (!getAuthToken()) return;
    try {
      await loadAvailableClients();
      const requests = [
        serverDataRequest('/api/data/assigned'),
        serverDataRequest('/api/data/submissions'),
        serverDataRequest('/api/data/messages')
      ];
      if (state.currentUser?.role === 'therapist') {
        requests.push(serverDataRequest('/api/data/library'));
      }
      const [assignedResult, submissionsResult, messagesResult, libraryResult] = await Promise.all(requests);

      const assignedItems = Array.isArray(assignedResult.items) ? assignedResult.items : [];
      const submissionItems = Array.isArray(submissionsResult.items) ? submissionsResult.items : [];
      const messageItems = Array.isArray(messagesResult.items) ? messagesResult.items : [];
      const libraryItems = Array.isArray(libraryResult?.items) ? libraryResult.items : [];
      const legacyAssigned = JSON.parse(localStorage.getItem(STORAGE_KEYS.assigned) || '[]');
      const legacySubmissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.submissions) || '[]');
      const legacyMessagesRaw = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '[]');
      const legacyMessages = legacyMessagesRaw.filter(isAuthBackedMessageThread);
      const legacyLibrary = JSON.parse(localStorage.getItem(STORAGE_KEYS.library) || '[]');

      state.serverAssigned = assignedItems.length ? assignedItems : legacyAssigned;
      state.serverSubmissions = submissionItems.length ? submissionItems : legacySubmissions;
      state.serverMessages = messageItems.length ? messageItems : legacyMessages;
      state.serverLibrary = state.currentUser?.role === 'therapist'
        ? (libraryItems.length ? libraryItems : legacyLibrary)
        : [];

      if (!state.serverMessages.length && getAuthToken()) {
        state.serverMessages = buildAuthBackedThreads();
      }

      if (!assignedItems.length && legacyAssigned.length) await saveAssignedItems(state.serverAssigned);
      if (!submissionItems.length && legacySubmissions.length) await saveSubmissionItems(state.serverSubmissions);
      if (!messageItems.length && state.serverMessages.length) await saveMessageThreads(state.serverMessages);
      if (state.currentUser?.role === 'therapist' && !libraryItems.length && legacyLibrary.length) await saveLibraryItems(state.serverLibrary);

      localStorage.removeItem(STORAGE_KEYS.assigned);
      localStorage.removeItem(STORAGE_KEYS.submissions);
      localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(state.serverMessages));
      if (state.currentUser?.role === 'therapist') {
        localStorage.setItem(STORAGE_KEYS.library, JSON.stringify(state.serverLibrary));
      }
      state.serverDataLoaded = true;
      syncActivePatientState();
      populatePatientSelect();
    } catch (error) {
      console.warn('Kunde inte läsa behandlingsdata från servern:', error);
      state.serverAssigned = JSON.parse(localStorage.getItem(STORAGE_KEYS.assigned) || '[]');
      state.serverSubmissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.submissions) || '[]');
      state.serverMessages = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '[]');
      state.serverLibrary = JSON.parse(localStorage.getItem(STORAGE_KEYS.library) || '[]');
      syncActivePatientState();
      populatePatientSelect();
    }
  }

  document.addEventListener('kbtapp:auth-changed', async event => {
    state.currentUser = event.detail?.user || null;
    if (event.detail?.loggedIn) {
      await loadServerCollections();
    } else {
      state.serverAssigned = JSON.parse(localStorage.getItem(STORAGE_KEYS.assigned) || '[]');
      state.serverSubmissions = JSON.parse(localStorage.getItem(STORAGE_KEYS.submissions) || '[]');
      state.serverMessages = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '[]');
      state.serverLibrary = JSON.parse(localStorage.getItem(STORAGE_KEYS.library) || '[]');
      syncActivePatientState();
      populatePatientSelect();
    }
    renderSavedCollections();
    renderMessages();
  });

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
    document.getElementById('assign-patient').addEventListener('click', () => {
      closeSettingsSheet();
      openModal(els.assignModal);
    });
    document.getElementById('confirm-assign').addEventListener('click', assignPatient);
    document.getElementById('link-client-button')?.addEventListener('click', linkClientByEmail);

    const openSettings = document.getElementById('open-settings');
    const closeSettings = document.getElementById('close-settings');
    if (openSettings) openSettings.addEventListener('click', () => els.settingsPanel.classList.add('open'));
    if (closeSettings) closeSettings.addEventListener('click', closeSettingsSheet);
  }

  function bindModals() {
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.closeModal;
        if (type === 'preview') closeModal(els.previewModal);
        if (type === 'assign') closeModal(els.assignModal);
        if (type === 'assignment') closeModal(els.assignmentModal);
        if (type === 'submission') closeModal(els.submissionModal);
      });
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeAllModals();
    });
    els.submitAssignmentModal?.addEventListener('click', () => {
      if (state.activeAssignmentId) submitAssignment(state.activeAssignmentId);
      closeModal(els.assignmentModal);
    });
    els.markSubmissionReviewed?.addEventListener('click', () => {
      if (state.activeSubmissionId) markSubmissionReviewed(state.activeSubmissionId);
    });
    els.sendSubmissionFeedback?.addEventListener('click', () => {
      if (state.activeSubmissionId) saveSubmissionFeedback(state.activeSubmissionId);
    });
  }

  function bindMessaging() {
    ensureMessageThreads();
    bindQuickReplies(els.therapistQuickReplies, therapistQuickReplySeed, text => {
      if (els.therapistMessageInput) els.therapistMessageInput.value = text;
    });
    bindQuickReplies(els.clientQuickReplies, clientQuickReplySeed, text => {
      if (els.clientMessageInput) els.clientMessageInput.value = text;
    });

    els.therapistMessageForm?.addEventListener('submit', event => {
      event.preventDefault();
      sendMessage('therapist', state.activeTherapistThreadPatientId, els.therapistMessageInput?.value || '');
      if (els.therapistMessageInput) els.therapistMessageInput.value = '';
    });

    els.clientMessageForm?.addEventListener('submit', event => {
      event.preventDefault();
      sendMessage('client', state.activeClientPatientId, els.clientMessageInput?.value || '');
      if (els.clientMessageInput) els.clientMessageInput.value = '';
    });

    renderMessages();
  }

  function bindQuickReplies(target, replies, onPick) {
    if (!target) return;
    target.innerHTML = '';
    replies.forEach(reply => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'quick-reply-chip';
      button.textContent = reply;
      button.addEventListener('click', () => onPick(reply));
      target.appendChild(button);
    });
  }

  function seededMessageThreads() {
    return [
      createMessageThread(patients[0], [
        createMessage('client', 'Hej, jag har fyllt i veckans registrering men är osäker på sista delen.', '2026-05-04 09:12'),
        createMessage('therapist', 'Tack, jag ser den. Vi går igenom sista delen tillsammans i nästa session.', '2026-05-04 10:03')
      ]),
      createMessageThread(patients[1], [
        createMessage('client', 'Jag sov bättre i natt men undrar hur noga jag ska fylla i uppvaknanden.', '2026-05-04 15:44')
      ]),
      createMessageThread(patients[2], [
        createMessage('therapist', 'Bekräftar torsdag 14.00. Ta gärna med dina anteckningar om veckan.', '2026-05-04 11:20')
      ])
    ];
  }

  function ensureMessageThreads() {
    const currentClientProfile = patientProfileFromUser(state.currentUser);
    if (Array.isArray(state.serverMessages) && state.serverMessages.length) {
      if (currentClientProfile && !state.serverMessages.some(item => item.patientId === currentClientProfile.id)) {
        state.serverMessages.unshift(createMessageThread(currentClientProfile, []));
      }
      return state.serverMessages;
    }
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEYS.messages) || '[]');
    if (existing.length) {
      state.serverMessages = existing;
      if (currentClientProfile && !state.serverMessages.some(item => item.patientId === currentClientProfile.id)) {
        state.serverMessages.unshift(createMessageThread(currentClientProfile, []));
      }
      return existing;
    }

    if (getAuthToken()) {
      const authBackedThreads = buildAuthBackedThreads();
      state.serverMessages = authBackedThreads;
      localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(authBackedThreads));
      return authBackedThreads;
    }

    const seeded = seededMessageThreads();
    if (currentClientProfile && !seeded.some(item => item.patientId === currentClientProfile.id)) {
      seeded.unshift(createMessageThread(currentClientProfile, []));
    }
    state.serverMessages = seeded;
    localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(seeded));
    return seeded;
  }

  function createMessageThread(patient, messages = [], options = {}) {
    const therapistIdentity = getCurrentTherapistIdentity();
    return {
      patientId: patient.id,
      patientName: patient.name,
      patientUserId: options.patientUserId ?? patient.userId ?? null,
      therapistUserId: options.therapistUserId ?? therapistIdentity.therapistUserId ?? '',
      therapistName: options.therapistName ?? therapistIdentity.therapistName ?? 'Dr. Lindgren',
      messages
    };
  }

  function createMessage(author, text, timestamp = new Date().toLocaleString('sv-SE')) {
    return {
      id: `msg_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      author,
      text,
      timestamp
    };
  }

  async function sendMessage(author, patientId, rawText) {
    const text = rawText.trim();
    if (!text) {
      showToast('Tomt meddelande', 'Skriv något innan du skickar.');
      return;
    }
    const threads = getMessageThreads();
    let thread = threads.find(item => item.patientId === patientId);
    if (!thread) {
      const patient = getKnownPatients().find(item => item.id === patientId) || createPatientProfile(patientId, patientLabel(patientId));
      thread = createMessageThread(patient, [], {
        patientUserId: patient.userId || null
      });
      threads.unshift(thread);
    }
    thread.messages.push(createMessage(author, text));
    try {
      await saveMessageThreads(threads);
      renderMessages();
      showToast(author === 'therapist' ? 'Svar skickat' : 'Meddelande skickat', patientLabel(patientId));
    } catch (error) {
      showToast('Kunde inte spara meddelandet', error.message || 'Försök igen.');
    }
  }

  function renderMessages() {
    renderTherapistThreads();
    renderTherapistConversation();
    renderClientConversation();
  }

  function renderTherapistThreads() {
    if (!els.therapistThreadList) return;
    const threads = getMessageThreads();
    if (!threads.length) {
      els.therapistThreadList.innerHTML = '<div class="message-empty-state">Registrera ett patientkonto för att starta en riktig tråd här.</div>';
      return;
    }
    if (!threads.some(item => item.patientId === state.activeTherapistThreadPatientId)) {
      state.activeTherapistThreadPatientId = threads[0]?.patientId || '';
    }
    els.therapistThreadList.innerHTML = '';
    threads.forEach(thread => {
      const lastMessage = thread.messages.at(-1);
      const unreadCount = thread.messages.filter(message => message.author === 'client').length;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `message-thread-button ${thread.patientId === state.activeTherapistThreadPatientId ? 'active' : ''}`;
      button.innerHTML = `
        <div class="message-thread-top">
          <div>
            <div class="list-primary">${escapeHtml(thread.patientName)}</div>
            <div class="message-thread-meta"><span>${escapeHtml(thread.patientId)}</span><span>${escapeHtml(lastMessage?.timestamp || 'Ingen aktivitet ännu')}</span></div>
          </div>
          <span class="message-count-badge">${thread.messages.length}</span>
        </div>
        <div class="message-thread-preview">${escapeHtml(compactText(lastMessage?.text || 'Starta en tråd med patienten.', 88))}</div>
        <div class="message-thread-meta"><span>${unreadCount ? unreadCount + ' patientmeddelanden' : 'Ingen ny patienttext'}</span></div>
      `;
      button.addEventListener('click', () => {
        state.activeTherapistThreadPatientId = thread.patientId;
        state.activeClientPatientId = thread.patientId;
        renderMessages();
      });
      els.therapistThreadList.appendChild(button);
    });
  }

  function renderTherapistConversation() {
    const thread = getMessageThreads().find(item => item.patientId === state.activeTherapistThreadPatientId);
    if (!thread) return;
    if (els.therapistThreadTitle) els.therapistThreadTitle.textContent = thread.patientName;
    if (els.therapistThreadSubtitle) els.therapistThreadSubtitle.textContent = `Säker tråd kopplad till ${thread.patientId}. Här kan terapeuten läsa och svara i samma flöde.`;
    if (els.therapistThreadStatus) els.therapistThreadStatus.textContent = `${thread.messages.length} meddelanden`;
    renderMessageList(els.therapistMessageList, thread.messages, { viewer: 'therapist', thread });
  }

  function renderClientConversation() {
    const clientPatientId = getCurrentClientPatientId();
    const thread = getMessageThreads().find(item => item.patientId === clientPatientId) || getMessageThreads()[0];
    if (!thread) return;
    state.activeClientPatientId = thread.patientId;
    if (els.clientThreadTitle) els.clientThreadTitle.textContent = `Kontakt med ${thread.therapistName}`;
    if (els.clientThreadSubtitle) els.clientThreadSubtitle.textContent = `${thread.patientName} kan skriva frågor, status och reflektioner här i ett enkelt första flöde med ${thread.therapistName}.`;
    if (els.clientThreadStatus) els.clientThreadStatus.textContent = `Senast uppdaterad ${thread.messages.at(-1)?.timestamp || 'nyss'}`;
    renderMessageList(els.clientMessageList, thread.messages, { viewer: 'client', thread });
  }

  function renderMessageList(target, messages, { viewer, thread }) {
    if (!target) return;
    target.innerHTML = '';
    if (!messages.length) {
      target.innerHTML = '<div class="message-empty-state">Inga meddelanden ännu. Starta en lugn första kontakt här.</div>';
      return;
    }
    messages.forEach(message => {
      const bubble = document.createElement('div');
      const isOutgoing = (viewer === 'therapist' && message.author === 'therapist') || (viewer === 'client' && message.author === 'client');
      const therapistLabel = thread?.therapistName || getCurrentTherapistIdentity().therapistName || 'Terapeut';
      const patientName = thread?.patientName || patientLabel(state.activeClientPatientId);
      bubble.className = `chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
      bubble.innerHTML = `${escapeHtml(message.text)}<small>${escapeHtml(message.author === 'therapist' ? therapistLabel : patientName)} · ${escapeHtml(message.timestamp)}</small>`;
      target.appendChild(bubble);
    });
  }

  function patientLabel(patientId) {
    return getKnownPatients().find(item => item.id === patientId)?.name || 'Patient';
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
        return {
          id,
          type,
          title: 'Textfält',
          collapsed: collapsedTypes.has(type),
          settings: {
            title: 'Reflektionsfrågor',
            maxChars: 2000,
            fields: [
              createTextFieldItem('Situation', 'Beskriv kort situationen eller övningen du vill att patienten ska återvända till.'),
              createTextFieldItem('Vad lade du märke till?', 'Skriv några meningar om tankar, känslor eller kroppsliga reaktioner.')
            ]
          }
        };
      case 'rating':
        return { id, type, title: 'Skattningsbox', collapsed: collapsedTypes.has(type), settings: { label: 'Ångestnivå', scale: '0-10', customMin: 0, customMax: 10, ratingType: 'clickable' } };
      case 'table':
        return { id, type, title: 'Tabell', collapsed: collapsedTypes.has(type), settings: { rows: 3, cols: 3, headerRow: true, firstColumnHeaders: true, cells: createTableCells(3, 3) } };
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
    ensureTextFieldSettings(block);

    container.append(
      createTextInput('Blockrubrik', block.settings.title, value => updateBlock(block.id, item => { ensureTextFieldSettings(item); item.settings.title = value; }, { preserveFocus: true }), 'textfield-title'),
      createNumberInput('Max tecken per fält', block.settings.maxChars, 50, 2000, value => updateBlock(block.id, item => { item.settings.maxChars = value; }, { preserveFocus: true }), 'textfield-maxchars')
    );

    const helper = document.createElement('div');
    helper.className = 'inline-help';
    helper.textContent = 'Lägg till flera fritextfält med egen rubrik. Exempeltexten rensas automatiskt när du börjar redigera ett nytt standardfält.';
    container.appendChild(helper);

    const fieldList = document.createElement('div');
    fieldList.className = 'text-field-list';

    block.settings.fields.forEach((fieldItem, index) => {
      const card = document.createElement('div');
      card.className = 'text-field-card';
      card.innerHTML = `<div class="text-field-card-head"><strong>Fält ${index + 1}</strong>${block.settings.fields.length > 1 ? '<button class="builder-action danger ghost" type="button">Ta bort</button>' : ''}</div>`;

      card.append(
        createTextInput('Rubrik', fieldItem.title, value => updateBlock(block.id, item => { ensureTextFieldSettings(item); item.settings.fields[index].title = value; }, { preserveFocus: true }), `textfield-field-${index}-title`, false, fieldItem.defaultTitle),
        createTextarea('Exempeltext / hjälp', fieldItem.prompt, value => updateBlock(block.id, item => { ensureTextFieldSettings(item); item.settings.fields[index].prompt = value; }, { preserveFocus: true }), `textfield-field-${index}-prompt`, { clearOnFocusValue: fieldItem.defaultPrompt })
      );

      const removeButton = card.querySelector('button');
      if (removeButton) {
        removeButton.addEventListener('click', () => updateBlock(block.id, item => {
          ensureTextFieldSettings(item);
          item.settings.fields.splice(index, 1);
        }));
      }

      fieldList.appendChild(card);
    });

    const addButton = document.createElement('button');
    addButton.className = 'builder-action';
    addButton.type = 'button';
    addButton.textContent = 'Lägg till fritextfält';
    addButton.addEventListener('click', () => updateBlock(block.id, item => {
      ensureTextFieldSettings(item);
      item.settings.fields.push(createTextFieldItem(`Fritext ${item.settings.fields.length + 1}`, 'Skriv kort hjälpinstruktion eller exempeltext här.'));
    }));

    container.append(fieldList, addButton);
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

    const firstColumnToggle = document.createElement('div');
    firstColumnToggle.className = 'toggle-row';
    firstColumnToggle.innerHTML = `
      <div>
        <div class="field-label" style="margin-bottom:4px">Första kolumnen = radrubriker</div>
        <div class="inline-help">Vänster kolumn visas som radrubriker i både redigeringsläge och patientförhandsvisning.</div>
      </div>
      <label class="toggle-switch">
        <input type="checkbox" ${block.settings.firstColumnHeaders ? 'checked' : ''}/>
        <span class="toggle-slider"></span>
      </label>
    `;
    firstColumnToggle.querySelector('input').addEventListener('change', event => updateBlock(block.id, item => { item.settings.firstColumnHeaders = event.target.checked; }));
    container.appendChild(firstColumnToggle);

    const helper = document.createElement('div');
    helper.className = 'inline-help';
    helper.textContent = 'Dubbelklicka på en cell i tabellen nedan för snabb redigering. Första raden kan vara kolumnrubriker och första kolumnen kan användas som radrubriker.';
    container.appendChild(helper);

    const preview = renderBlockPreview(block, false);
    container.appendChild(preview);

    const cellGrid = document.createElement('div');
    cellGrid.className = 'cell-grid';
    block.settings.cells.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const editor = document.createElement('div');
        const isHeader = block.settings.headerRow && rowIndex === 0;
        const isRowHeader = block.settings.firstColumnHeaders && colIndex === 0 && (!block.settings.headerRow || rowIndex > 0);
        editor.className = `cell-editor-card ${isHeader || isRowHeader ? 'is-header' : ''}`;
        editor.innerHTML = `<strong>${isHeader ? `Kolumnrubrik ${colIndex + 1}` : isRowHeader ? `Radrubrik ${rowIndex}` : `Cell ${rowIndex + 1}.${colIndex + 1}`}</strong>`;
        editor.append(
          createTextInput('Text', cell.text, value => updateBlock(block.id, item => { item.settings.cells[rowIndex][colIndex].text = value; }, { preserveFocus: true }), `table-${rowIndex}-${colIndex}-text`, true, getDefaultTableCellText(rowIndex, colIndex)),
          createToggle(cell.type === 'patient', checked => updateBlock(block.id, item => { item.settings.cells[rowIndex][colIndex].type = checked ? 'patient' : 'static'; }), 'Patientfält', 'Låt patienten fylla i denna cell')
        );

        if (isHeader || isRowHeader) {
          const badge = document.createElement('div');
          badge.className = 'inline-help';
          badge.textContent = isHeader ? 'Visas överst som kolumnrubrik.' : 'Visas till vänster som radrubrik.';
          editor.appendChild(badge);
        }
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
        ensureTextFieldSettings(block);
        const title = document.createElement('div');
        title.className = 'block-title';
        title.textContent = block.settings.title || 'Textfält';
        wrap.appendChild(title);

        const list = document.createElement('div');
        list.className = 'text-field-preview-list';
        block.settings.fields.forEach(fieldItem => {
          const fieldWrap = document.createElement('div');
          fieldWrap.className = 'text-field-preview-item';
          fieldWrap.innerHTML = `<div class="text-field-preview-head"><strong>${escapeHtml(fieldItem.title || 'Fritextfält')}</strong>${fieldItem.prompt ? `<small>${escapeHtml(compactText(fieldItem.prompt, isReadOnly ? 140 : 72))}</small>` : ''}</div>`;
          const field = document.createElement('div');
          field.className = 'patient-field-preview';
          field.textContent = `Patientens svar skrivs här · max ${block.settings.maxChars} tecken`;
          fieldWrap.appendChild(field);
          list.appendChild(fieldWrap);
        });
        wrap.appendChild(list);
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
            const isRowHeader = block.settings.firstColumnHeaders && colIndex === 0 && (!block.settings.headerRow || rowIndex > 0);
            const td = document.createElement(isHeader || isRowHeader ? 'th' : 'td');
            const cellInner = document.createElement('div');
            cellInner.className = `${cell.type === 'patient' ? 'table-cell-patient' : 'table-cell-static'} ${isRowHeader ? 'table-row-heading-cell' : ''}`;
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
    closeSettingsSheet();
    els.previewShell.innerHTML = '';
    els.previewShell.classList.add('device-preview');
    if (!state.blocks.length) {
      els.previewShell.innerHTML = '<div class="preview-block"><h4>Tom arbetsyta</h4><p>Lägg till minst ett block för att kunna förhandsvisa materialet.</p></div>';
    } else {
      const patient = getKnownPatients().find(item => item.id === state.assignedPatientId);
      const intro = document.createElement('section');
      intro.className = 'preview-intro';
      intro.innerHTML = `
        <span class="preview-phone-brand">KBTApp</span>
        <div class="preview-patient-card">
          <div class="preview-patient-head">
            <div>
              <span class="preview-kicker">Patientvy</span>
              <h4>${escapeHtml(getMaterialTitle())}</h4>
              <p>Så här möter materialet patienten i mobilen: varm ton, kort orientering och tydliga nästa steg.</p>
            </div>
            <span class="preview-status-chip">Redo att fyllas i</span>
          </div>
          <div class="preview-patient-meta">
            <span>${state.blocks.length} block</span>
            <span>${escapeHtml(patient ? patient.name : 'Ingen vald patient')}</span>
            <span>Beräknad tid ${estimateCompletionTime()}</span>
          </div>
          <div class="preview-helper-note">Målet är att patienten snabbt ska förstå vad som ska göras, hur lång tid det tar och att det räcker att fylla i ett steg i taget.</div>
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

  async function assignPatient() {
    state.assignedPatientId = els.patientSelect.value;
    if (!state.assignedPatientId) {
      showToast('Ingen patient vald', 'Registrera först ett patientkonto och försök igen.');
      return;
    }
    state.activeClientPatientId = state.assignedPatientId;
    const patient = getKnownPatients().find(item => item.id === state.assignedPatientId);
    await ensureTherapistClientRelationship(patient);
    const title = getMaterialTitle();
    const therapistIdentity = getCurrentTherapistIdentity();
    const assignedEntry = {
      id: `assigned_${Date.now()}`,
      patientId: patient.id,
      patientUserId: patient.userId || null,
      patientName: patient.name,
      therapistUserId: therapistIdentity.therapistUserId,
      therapistName: therapistIdentity.therapistName,
      title,
      createdAt: new Date().toLocaleString('sv-SE'),
      status: 'tilldelad',
      reviewedAt: '',
      blocks: structuredClone(state.blocks)
    };
    const current = [...getAssignedItems()];
    current.unshift(assignedEntry);
    await saveAssignedItems(current);

    const threads = getMessageThreads();
    const hasThread = threads.some(item => item.patientId === patient.id && (item.therapistUserId || '') === therapistIdentity.therapistUserId);
    if (!hasThread) {
      threads.unshift(createMessageThread(patient, [], {
        patientUserId: patient.userId || null,
        therapistUserId: therapistIdentity.therapistUserId,
        therapistName: therapistIdentity.therapistName
      }));
      await saveMessageThreads(threads);
    }

    renderSavedCollections();
    renderMessages();
    showToast('Material tilldelat', `${title} skickades till ${patient.name}.`);
    closeModal(els.assignModal);
  }

  async function saveCollection(kind) {
    if (!state.blocks.length) {
      showToast('Inget att spara', 'Arbetsytan är tom. Lägg till block först.');
      return;
    }
    const patient = getKnownPatients().find(item => item.id === state.assignedPatientId);
    const title = getMaterialTitle();
    const entry = {
      id: `${kind}_${Date.now()}`,
      title,
      patient: patient ? `${patient.name} (${patient.id})` : 'Ej tilldelad',
      createdAt: new Date().toLocaleString('sv-SE'),
      blocks: structuredClone(state.blocks)
    };
    if (kind === 'library') {
      const current = [...getLibraryItems()];
      current.unshift({
        ...entry,
        therapistUserId: state.currentUser?.role === 'therapist' ? state.currentUser.id : '',
        therapistName: state.currentUser?.role === 'therapist' ? state.currentUser.name : 'Dr. Lindgren'
      });
      await saveLibraryItems(current);
    } else {
      const key = STORAGE_KEYS[kind];
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      current.unshift(entry);
      localStorage.setItem(key, JSON.stringify(current));
    }
    renderSavedCollections();
    showToast(kind === 'templates' ? 'Mall sparad' : 'Material sparat', title);
  }

  function renderSavedCollections() {
    renderCollectionGrid(els.libraryGrid, materialSeed, getLibraryItems(), 'library');
    renderCollectionGrid(els.templateGrid, templateSeed, JSON.parse(localStorage.getItem(STORAGE_KEYS.templates) || '[]'), 'templates');
    renderClientAssignments();
    renderClientMaterials();
    renderTherapistSubmissions();
  }

  function renderClientAssignments() {
    const assigned = getAssignedItems().filter(item => item.patientId === state.activeClientPatientId);
    if (!els.clientAssignmentsGrid) return;
    els.clientAssignmentsGrid.innerHTML = '';
    if (!assigned.length) {
      const currentPatientName = getKnownPatients().find(item => item.id === state.activeClientPatientId)?.name || 'dig';
      els.clientAssignmentsGrid.innerHTML = `<div class="card library-card"><div class="library-card-head"><div><span class="library-card-type">Tom vy</span><h3>Inga tilldelade hemuppgifter ännu</h3></div></div><p>När terapeuten skickar material till ${escapeHtml(currentPatientName)} visas det här med tydlig status, öppna-knapp och möjlighet att skicka in svar.</p><div class="library-card-meta"><span>Lugn översikt</span><span>Tydliga nästa steg</span></div></div>`;
      return;
    }
    assigned.forEach(item => {
      const actionLabel = item.status === 'tilldelad' ? 'Öppna formulär' : item.status === 'påbörjad' ? 'Fortsätt fylla i' : 'Öppna svar';
      const submitLabel = item.status === 'inskickad' || item.status === 'granskad' ? 'Skicka in igen' : 'Skicka in till terapeut';
      const reviewedMeta = item.reviewedAt ? ` · granskad ${escapeHtml(item.reviewedAt)}` : '';
      const feedbackBox = item.feedback?.text ? `<div class="assignment-feedback-box"><strong>Återkoppling från behandlaren</strong><p>${escapeHtml(compactText(item.feedback.text, 180))}</p><span class="assignment-feedback-meta">${escapeHtml(item.feedback.updatedAt || item.reviewedAt || 'Nyligen skickad')}</span></div>` : '';
      const card = document.createElement('div');
      card.className = 'card library-card';
      card.innerHTML = `<div class="library-card-head"><div><span class="library-card-type">Hemuppgift</span><h3>${escapeHtml(item.title)}</h3></div><span class="status-pill status-${escapeAttribute(item.status)}">${escapeHtml(item.status)}</span></div><p>Status: ${escapeHtml(item.status)} · tilldelad ${escapeHtml(item.createdAt)}${reviewedMeta}</p><div class="library-card-meta"><span>${item.blocks.length} block</span><span>${escapeHtml(item.patientName)}</span></div>${feedbackBox}<div class="builder-toolbar"><button class="builder-action" type="button">${actionLabel}</button><button class="builder-action accent" type="button">${submitLabel}</button></div>`;
      const [openBtn, submitBtn] = card.querySelectorAll('button');
      openBtn.addEventListener('click', () => openAssignment(item.id));
      submitBtn.addEventListener('click', () => submitAssignment(item.id));
      els.clientAssignmentsGrid.appendChild(card);
    });
  }

  async function openAssignment(assignmentId) {
    const assigned = [...getAssignedItems()];
    const item = assigned.find(entry => entry.id === assignmentId);
    if (!item || !els.assignmentShell) return;
    if (item.status === 'tilldelad') {
      item.status = 'påbörjad';
      await saveAssignedItems(assigned);
      renderSavedCollections();
    }
    state.activeAssignmentId = assignmentId;
    if (els.assignmentModalTitle) els.assignmentModalTitle.textContent = item.title;
    els.assignmentShell.innerHTML = '';

    const stage = document.createElement('section');
    stage.className = 'assignment-stage';
    stage.innerHTML = `<div><span class="section-kicker">Patientläge</span><h4>${escapeHtml(item.title)}</h4><p>Fyll i formuläret nedan som patient. Detta läge är gjort för att kännas lugnare, mer fokuserat och tydligt steg för steg.</p></div><div class="assignment-summary"><div><strong>Status</strong><span>${escapeHtml(item.status)}</span></div><div><strong>Patient</strong><span>${escapeHtml(item.patientName)}</span></div><div><strong>Block</strong><span>${item.blocks.length} st</span></div>${item.feedback?.text ? `<div><strong>Återkoppling</strong><span>Ny kommentar från behandlaren</span></div>` : ''}</div>${item.feedback?.text ? `<div class="assignment-feedback-box"><strong>Senaste återkopplingen</strong><p>${escapeHtml(item.feedback.text)}</p><span class="assignment-feedback-meta">${escapeHtml(item.feedback.updatedAt || item.reviewedAt || 'Nyligen skickad')}</span></div>` : ''}`;
    els.assignmentShell.appendChild(stage);

    item.blocks.forEach((block, index) => {
      const card = document.createElement('section');
      card.className = 'assignment-form-card';
      const content = renderInteractiveAssignmentBlock(item, block, index);
      card.appendChild(content);
      els.assignmentShell.appendChild(card);
    });

    openModal(els.assignmentModal);
  }

  function renderInteractiveAssignmentBlock(assignment, block, blockIndex) {
    const wrap = document.createElement('div');
    const answers = assignment.answers || (assignment.answers = {});
    const answerKey = block.id;
    switch (block.type) {
      case 'info': {
        const title = document.createElement('h4');
        title.textContent = block.settings.title || 'Informationstext';
        const text = document.createElement('p');
        text.className = 'preview-text';
        text.textContent = block.settings.content || 'Ingen text ännu.';
        wrap.append(title, text);
        break;
      }
      case 'textfield': {
        ensureTextFieldSettings(block);
        wrap.innerHTML = `<div class="block-title">${escapeHtml(block.settings.title || 'Textfält')}</div>`;
        const list = document.createElement('div');
        list.className = 'assignment-text-field-list';
        block.settings.fields.forEach((fieldItem, fieldIndex) => {
          const fieldWrap = document.createElement('label');
          fieldWrap.className = 'assignment-text-field';
          fieldWrap.innerHTML = `<span class="assignment-field-title">${escapeHtml(fieldItem.title || `Fritext ${fieldIndex + 1}`)}</span>${fieldItem.prompt ? `<span class="assignment-field-help">${escapeHtml(fieldItem.prompt)}</span>` : ''}`;
          const field = document.createElement('textarea');
          field.className = 'assignment-textarea';
          field.maxLength = block.settings.maxChars || 2000;
          field.placeholder = 'Skriv ditt svar här...';
          field.value = answers[answerKey]?.[`field_${fieldIndex}`] || '';
          field.addEventListener('input', e => updateAssignmentAnswer(assignment.id, answerKey, { [`field_${fieldIndex}`]: e.target.value }));
          fieldWrap.appendChild(field);
          list.appendChild(fieldWrap);
        });
        wrap.appendChild(list);
        break;
      }
      case 'rating': {
        const label = document.createElement('div');
        label.className = 'block-title';
        label.textContent = block.settings.label || 'Skattningsbox';
        wrap.appendChild(label);
        const { min, max } = getScaleRange(block.settings);
        if (block.settings.ratingType === 'slider') {
          const sliderWrap = document.createElement('div');
          sliderWrap.className = 'assignment-slider-wrap';
          sliderWrap.innerHTML = `<div class="assignment-slider-meta"><span>${min}</span><span>${max}</span></div>`;
          const input = document.createElement('input');
          input.type = 'range';
          input.className = 'assignment-slider';
          input.min = min;
          input.max = max;
          input.value = answers[answerKey]?.value ?? Math.round((min + max) / 2);
          input.addEventListener('input', e => updateAssignmentAnswer(assignment.id, answerKey, { value: Number(e.target.value) }));
          sliderWrap.appendChild(input);
          wrap.appendChild(sliderWrap);
        } else {
          const row = document.createElement('div');
          row.className = 'assignment-rating-row';
          getScaleValues(min, max).forEach(value => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `assignment-rating-button ${(answers[answerKey]?.value === value) ? 'active' : ''}`;
            btn.textContent = value;
            btn.addEventListener('click', () => {
              updateAssignmentAnswer(assignment.id, answerKey, { value });
              openAssignment(assignment.id);
            });
            row.appendChild(btn);
          });
          wrap.appendChild(row);
        }
        break;
      }
      case 'table': {
        const title = document.createElement('div');
        title.className = 'block-title';
        title.textContent = `Tabellblock ${blockIndex + 1}`;
        wrap.appendChild(title);
        const box = document.createElement('div');
        box.className = 'table-wrapper';
        const table = document.createElement('table');
        table.className = 'material-table';
        const tbody = document.createElement('tbody');
        block.settings.cells.forEach((row, rowIndex) => {
          const tr = document.createElement('tr');
          row.forEach((cell, colIndex) => {
            const isHeader = block.settings.headerRow && rowIndex === 0;
            const isRowHeader = block.settings.firstColumnHeaders && colIndex === 0 && (!block.settings.headerRow || rowIndex > 0);
            const td = document.createElement(isHeader || isRowHeader ? 'th' : 'td');
            if (cell.type === 'patient' && !isHeader && !isRowHeader) {
              const input = document.createElement('textarea');
              input.className = 'assignment-table-input';
              input.placeholder = 'Skriv här';
              input.value = answers[answerKey]?.[`cell_${rowIndex}_${colIndex}`] || '';
              input.addEventListener('input', e => updateAssignmentAnswer(assignment.id, answerKey, { [`cell_${rowIndex}_${colIndex}`]: e.target.value }));
              td.appendChild(input);
            } else {
              td.textContent = cell.text || (isRowHeader ? `Radrubrik ${rowIndex}` : 'Tom statisk cell');
            }
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        box.appendChild(table);
        wrap.appendChild(box);
        break;
      }
      case 'emoji': {
        const label = document.createElement('div');
        label.className = 'block-title';
        label.textContent = block.settings.label || 'Emoji-skala';
        wrap.appendChild(label);
        const row = document.createElement('div');
        row.className = 'assignment-emoji-row';
        emojiScale.forEach((item, index) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `assignment-emoji-button ${(answers[answerKey]?.value === index + 1) ? 'active' : ''}`;
          btn.innerHTML = `<span class="emoji-char">${item.emoji}</span><span class="emoji-tone">${item.label}</span>`;
          btn.addEventListener('click', () => {
            updateAssignmentAnswer(assignment.id, answerKey, { value: index + 1 });
            openAssignment(assignment.id);
          });
          row.appendChild(btn);
        });
        wrap.appendChild(row);
        break;
      }
    }
    return wrap;
  }

  async function updateAssignmentAnswer(assignmentId, blockId, patch) {
    const assigned = [...getAssignedItems()];
    const item = assigned.find(entry => entry.id === assignmentId);
    if (!item) return;
    item.answers = item.answers || {};
    item.answers[blockId] = { ...(item.answers[blockId] || {}), ...patch };
    if (item.status === 'tilldelad') item.status = 'påbörjad';
    await saveAssignedItems(assigned);
    renderSavedCollections();
  }

  function renderClientMaterials() {
    if (!els.clientMaterialsGrid) return;
    els.clientMaterialsGrid.innerHTML = '';
    clientMaterialSeed.forEach(item => els.clientMaterialsGrid.appendChild(createLibraryCard(item.title, item.description)));
    const assigned = getAssignedItems().filter(item => item.patientId === state.activeClientPatientId);
    assigned.forEach(item => {
      els.clientMaterialsGrid.appendChild(createLibraryCard(item.title, `${item.patientName} · ${item.blocks.length} block · status ${item.status}`));
    });
  }

  async function submitAssignment(assignmentId) {
    const assigned = [...getAssignedItems()];
    const item = assigned.find(entry => entry.id === assignmentId);
    if (!item) return;
    item.status = 'inskickad';
    item.reviewedAt = '';
    item.feedback = null;
    await saveAssignedItems(assigned);

    const submissions = [...getSubmissionItems()];
    const answersSnapshot = structuredClone(item.answers || {});
    const summary = buildSubmissionSummary(item.blocks, answersSnapshot);
    const existingIndex = submissions.findIndex(entry => entry.assignmentId === item.id);
    const submissionEntry = {
      id: existingIndex >= 0 ? submissions[existingIndex].id : `submission_${Date.now()}`,
      assignmentId: item.id,
      patientId: item.patientId,
      patientUserId: item.patientUserId || state.currentUser?.id || null,
      patientName: item.patientName,
      therapistUserId: item.therapistUserId || '',
      therapistName: item.therapistName || 'Dr. Lindgren',
      title: item.title,
      submittedAt: new Date().toLocaleString('sv-SE'),
      status: 'inskickad',
      reviewedAt: '',
      feedback: null,
      blocks: structuredClone(item.blocks),
      answers: answersSnapshot,
      summary
    };

    if (existingIndex >= 0) submissions.splice(existingIndex, 1);
    submissions.unshift(submissionEntry);
    await saveSubmissionItems(submissions);
    renderSavedCollections();
    showToast('Inskickat', `${item.title} skickades in av ${item.patientName}.`);
  }

  function renderTherapistSubmissions() {
    if (!els.therapistSubmissionsGrid) return;
    const submissions = getSubmissionItems();
    const activeFilter = state.submissionFilter || 'alla';
    const filteredSubmissions = submissions
      .filter(item => activeFilter === 'alla' ? true : (item.status || 'inskickad') === activeFilter)
      .sort(compareSubmissions);
    syncSubmissionFilterButtons(submissions);
    syncSubmissionSortControl();
    syncSubmissionListSummary(submissions, filteredSubmissions, activeFilter);
    els.therapistSubmissionsGrid.innerHTML = '';
    if (!submissions.length) {
      els.therapistSubmissionsGrid.innerHTML = '<div class="card library-card"><div class="library-card-head"><div><span class="library-card-type">Väntar</span><h3>Inga inskick ännu</h3></div></div><p>När patienten skickar in material visas det här i en tydlig lista för snabb uppföljning.</p><div class="library-card-meta"><span>Redo för uppföljning</span><span>Visas i terapeutvyn</span></div></div>';
      return;
    }
    if (!filteredSubmissions.length) {
      els.therapistSubmissionsGrid.innerHTML = `<div class="card library-card"><div class="library-card-head"><div><span class="library-card-type">Filter</span><h3>Inga ${escapeHtml(activeFilter)} inskick just nu</h3></div></div><p>Byt filter för att se andra inskick eller fortsätt när nya svar kommer in.</p><div class="library-card-meta"><span>${submissions.length} totalt</span><span>Snabb uppföljning</span></div></div>`;
      return;
    }
    filteredSubmissions.forEach(item => {
      const card = createLibraryCard({
        title: item.title,
        description: `${item.patientName} · inskickad ${item.submittedAt} · ${item.blocks.length} block`,
        meta: [
          `Status ${item.status || 'inskickad'}`,
          `${item.summary?.answeredCount || 0} svar ifyllda`,
          item.summary?.preview || 'Öppna för att granska svar'
        ],
        type: 'Inskick'
      });
      card.querySelector('.library-card-head')?.insertAdjacentHTML('beforeend', `<span class="status-pill status-${escapeAttribute(item.status || 'inskickad')}">${escapeHtml(item.status || 'inskickad')}</span>`);
      const [primaryButton, secondaryButton] = card.querySelectorAll('button');
      primaryButton.textContent = 'Öppna inskick';
      secondaryButton.textContent = 'Öppna patienttråd';
      primaryButton.addEventListener('click', () => openSubmission(item.id));
      secondaryButton.addEventListener('click', () => {
        state.activeTherapistThreadPatientId = item.patientId;
        state.activeClientPatientId = item.patientId;
        renderMessages();
        document.querySelector('#therapist-view .nav-item[data-page="messages"]')?.click();
      });
      els.therapistSubmissionsGrid.appendChild(card);
    });
  }

  function bindSubmissionFilters() {
    document.querySelectorAll('[data-submission-filter]').forEach(button => {
      button.addEventListener('click', () => {
        state.submissionFilter = button.dataset.submissionFilter || 'alla';
        renderTherapistSubmissions();
      });
    });

    if (els.submissionSortSelect) {
      els.submissionSortSelect.addEventListener('change', () => {
        state.submissionSort = els.submissionSortSelect.value || 'needs-review';
        renderTherapistSubmissions();
      });
    }

    els.openNextSubmissionButton?.addEventListener('click', () => openNextPendingSubmission());
  }

  function syncSubmissionFilterButtons(submissions = []) {
    const counts = submissions.reduce((acc, item) => {
      const status = item.status || 'inskickad';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, { alla: submissions.length });

    document.querySelectorAll('[data-submission-filter]').forEach(button => {
      const filter = button.dataset.submissionFilter || 'alla';
      const count = counts[filter] || 0;
      const baseLabel = filter === 'alla' ? 'Alla' : filter === 'inskickad' ? 'Inskickade' : 'Granskade';
      button.classList.toggle('is-active', filter === (state.submissionFilter || 'alla'));
      button.textContent = `${baseLabel} (${count})`;
    });
  }

  function syncSubmissionSortControl() {
    if (!els.submissionSortSelect) return;
    els.submissionSortSelect.value = state.submissionSort || 'needs-review';
  }

  function syncSubmissionListSummary(submissions = [], filteredSubmissions = [], activeFilter = 'alla') {
    if (!els.submissionListSummary) return;
    if (!submissions.length) {
      els.submissionListSummary.textContent = 'Redo att visa nya patientinskick så snart de kommer in.';
      syncOpenNextSubmissionButton([]);
      return;
    }
    const pendingSubmissions = submissions.filter(item => (item.status || 'inskickad') === 'inskickad');
    const pendingCount = pendingSubmissions.length;
    const reviewedCount = submissions.filter(item => (item.status || 'inskickad') === 'granskad').length;
    const filterLabel = activeFilter === 'alla' ? 'alla inskick' : activeFilter === 'inskickad' ? 'inskick som väntar granskning' : 'redan granskade inskick';
    const sortLabel = getSubmissionSortLabel(state.submissionSort || 'needs-review').toLowerCase();
    els.submissionListSummary.textContent = `Visar ${filteredSubmissions.length} av ${submissions.length} ${filterLabel}. ${pendingCount} väntar granskning och ${reviewedCount} är redan granskade. Sortering: ${sortLabel}.`;
    syncOpenNextSubmissionButton(pendingSubmissions);
  }

  function syncOpenNextSubmissionButton(pendingSubmissions = []) {
    if (!els.openNextSubmissionButton) return;
    const nextPending = [...pendingSubmissions].sort(compareSubmissions)[0];
    els.openNextSubmissionButton.disabled = !nextPending;
    els.openNextSubmissionButton.textContent = nextPending
      ? `Öppna nästa som väntar (${nextPending.patientName})`
      : 'Inget nytt inskick väntar';
  }

  function getSubmissionSortLabel(sortKey) {
    return ({
      'needs-review': 'Behöver granskas först',
      'recent': 'Senast inkommet',
      'reviewed-recent': 'Senast granskat',
      'patient': 'Patient A–Ö'
    })[sortKey] || 'Behöver granskas först';
  }

  function compareSubmissions(a, b) {
    const sortKey = state.submissionSort || 'needs-review';
    if (sortKey === 'patient') {
      return (a.patientName || '').localeCompare(b.patientName || '', 'sv');
    }
    if (sortKey === 'reviewed-recent') {
      return getSubmissionTimestamp(b.reviewedAt || b.submittedAt) - getSubmissionTimestamp(a.reviewedAt || a.submittedAt);
    }
    if (sortKey === 'recent') {
      return getSubmissionTimestamp(b.submittedAt) - getSubmissionTimestamp(a.submittedAt);
    }

    const statusRank = value => (value || 'inskickad') === 'inskickad' ? 0 : 1;
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;
    return getSubmissionTimestamp(b.submittedAt) - getSubmissionTimestamp(a.submittedAt);
  }

  function getSubmissionTimestamp(value) {
    if (!value) return 0;
    const normalized = value.replace(' ', 'T');
    const direct = Date.parse(normalized);
    if (!Number.isNaN(direct)) return direct;
    const match = value.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!match) return 0;
    const [, year, month, day, hour, minute, second = '00'] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
  }

  function openNextPendingSubmission() {
    const submissions = getSubmissionItems();
    const nextPending = submissions
      .filter(item => (item.status || 'inskickad') === 'inskickad')
      .sort(compareSubmissions)[0];

    if (!nextPending) {
      showToast('Inget väntar', 'Alla aktuella inskick är redan granskade.');
      return;
    }

    openSubmission(nextPending.id);
    showToast('Öppnar nästa inskick', `${nextPending.patientName} · ${nextPending.title}`);
  }

  function openSubmission(submissionId) {
    const submissions = getSubmissionItems();
    const item = submissions.find(entry => entry.id === submissionId);
    if (!item || !els.submissionShell) return;
    state.activeSubmissionId = submissionId;
    if (els.markSubmissionReviewed) {
      els.markSubmissionReviewed.hidden = item.status === 'granskad';
      els.markSubmissionReviewed.disabled = item.status === 'granskad';
      els.markSubmissionReviewed.textContent = item.status === 'granskad' ? 'Redan granskad' : 'Markera som granskad';
    }
    if (els.submissionFeedbackInput) {
      els.submissionFeedbackInput.value = item.feedback?.text || '';
    }
    if (els.submissionModalTitle) els.submissionModalTitle.textContent = item.title;
    els.submissionShell.innerHTML = '';

    const stage = document.createElement('section');
    stage.className = 'assignment-stage';
    stage.innerHTML = `<div><span class="section-kicker">Inskickad av patient</span><h4>${escapeHtml(item.title)}</h4><p>Här kan terapeuten granska vad patienten faktiskt skickade in, block för block, utan att lämna gränssnittet.</p></div><div class="assignment-summary"><div><strong>Patient</strong><span>${escapeHtml(item.patientName)}</span></div><div><strong>Status</strong><span>${escapeHtml(item.status || 'inskickad')}</span></div><div><strong>Inskickad</strong><span>${escapeHtml(item.submittedAt)}</span></div><div><strong>Svar</strong><span>${item.summary?.answeredCount || 0} ifyllda delar</span></div>${item.reviewedAt ? `<div><strong>Granskad</strong><span>${escapeHtml(item.reviewedAt)}</span></div>` : ''}</div>${item.feedback?.text ? `<div class="assignment-feedback-box"><strong>Senast sparad återkoppling</strong><p>${escapeHtml(item.feedback.text)}</p><span class="assignment-feedback-meta">${escapeHtml(item.feedback.updatedAt || item.reviewedAt || 'Nyligen sparad')}</span></div>` : ''}`;
    els.submissionShell.appendChild(stage);

    item.blocks.forEach((block, index) => {
      const card = document.createElement('section');
      card.className = 'assignment-form-card';
      card.appendChild(renderSubmissionBlock(block, item.answers || {}, index));
      els.submissionShell.appendChild(card);
    });

    openModal(els.submissionModal);
  }

  async function markSubmissionReviewed(submissionId) {
    const submissions = [...getSubmissionItems()];
    const item = submissions.find(entry => entry.id === submissionId);
    if (!item) return;

    const reviewedAt = new Date().toLocaleString('sv-SE');
    item.status = 'granskad';
    item.reviewedAt = reviewedAt;
    await saveSubmissionItems(submissions);

    const assigned = [...getAssignedItems()];
    const assignment = assigned.find(entry => entry.id === item.assignmentId);
    if (assignment) {
      assignment.status = 'granskad';
      assignment.reviewedAt = reviewedAt;
      await saveAssignedItems(assigned);
    }

    renderSavedCollections();
    openSubmission(submissionId);
    showToast('Markerad som granskad', `${item.title} är nu markerad som granskad.`);
  }

  async function saveSubmissionFeedback(submissionId) {
    const text = els.submissionFeedbackInput?.value.trim();
    if (!text) {
      showToast('Ingen återkoppling sparad', 'Skriv minst en kort kommentar först.');
      return;
    }

    const submissions = [...getSubmissionItems()];
    const item = submissions.find(entry => entry.id === submissionId);
    if (!item) return;

    const updatedAt = new Date().toLocaleString('sv-SE');
    item.feedback = { text, updatedAt };
    item.status = 'granskad';
    item.reviewedAt = item.reviewedAt || updatedAt;
    await saveSubmissionItems(submissions);

    const assigned = [...getAssignedItems()];
    const assignment = assigned.find(entry => entry.id === item.assignmentId);
    if (assignment) {
      assignment.status = 'granskad';
      assignment.reviewedAt = item.reviewedAt;
      assignment.feedback = { text, updatedAt };
      await saveAssignedItems(assigned);
    }

    renderSavedCollections();
    openSubmission(submissionId);
    showToast('Återkoppling sparad', 'Patienten kan nu se din kommentar i sin uppgift.');
  }

  function renderSubmissionBlock(block, answers, blockIndex) {
    const wrap = document.createElement('div');
    const answer = answers[block.id] || {};

    switch (block.type) {
      case 'info': {
        const title = document.createElement('h4');
        title.textContent = block.settings.title || 'Informationstext';
        const text = document.createElement('p');
        text.className = 'preview-text';
        text.textContent = block.settings.content || 'Ingen text ännu.';
        wrap.append(title, text);
        break;
      }
      case 'textfield': {
        ensureTextFieldSettings(block);
        const title = document.createElement('div');
        title.className = 'block-title';
        title.textContent = block.settings.title || 'Textfält';
        wrap.appendChild(title);
        const list = document.createElement('div');
        list.className = 'assignment-text-field-list';
        block.settings.fields.forEach((fieldItem, fieldIndex) => {
          const value = answer[`field_${fieldIndex}`] || '';
          const fieldWrap = document.createElement('div');
          fieldWrap.className = 'text-field-card';
          fieldWrap.innerHTML = `<div class="assignment-field-title">${escapeHtml(fieldItem.title || `Fritext ${fieldIndex + 1}`)}</div>${fieldItem.prompt ? `<div class="assignment-field-help">${escapeHtml(fieldItem.prompt)}</div>` : ''}<div class="submission-answer-box">${escapeHtml(value || 'Inget svar inskickat ännu.')}</div>`;
          list.appendChild(fieldWrap);
        });
        wrap.appendChild(list);
        break;
      }
      case 'rating': {
        const label = document.createElement('div');
        label.className = 'block-title';
        label.textContent = block.settings.label || 'Skattningsbox';
        const result = document.createElement('div');
        result.className = 'submission-answer-box';
        result.textContent = answer.value ?? 'Ingen skattning inskickad';
        wrap.append(label, result);
        break;
      }
      case 'table': {
        const title = document.createElement('div');
        title.className = 'block-title';
        title.textContent = `Tabellblock ${blockIndex + 1}`;
        wrap.appendChild(title);
        const box = document.createElement('div');
        box.className = 'table-wrapper';
        const table = document.createElement('table');
        table.className = 'material-table';
        const tbody = document.createElement('tbody');
        block.settings.cells.forEach((row, rowIndex) => {
          const tr = document.createElement('tr');
          row.forEach((cell, colIndex) => {
            const isHeader = block.settings.headerRow && rowIndex === 0;
            const isRowHeader = block.settings.firstColumnHeaders && colIndex === 0 && (!block.settings.headerRow || rowIndex > 0);
            const td = document.createElement(isHeader || isRowHeader ? 'th' : 'td');
            if (cell.type === 'patient' && !isHeader && !isRowHeader) {
              td.textContent = answer[`cell_${rowIndex}_${colIndex}`] || '—';
            } else {
              td.textContent = cell.text || (isRowHeader ? `Radrubrik ${rowIndex}` : 'Tom statisk cell');
            }
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        box.appendChild(table);
        wrap.appendChild(box);
        break;
      }
      case 'emoji': {
        const label = document.createElement('div');
        label.className = 'block-title';
        label.textContent = block.settings.label || 'Emoji-skala';
        const result = document.createElement('div');
        result.className = 'submission-answer-box';
        result.textContent = answer.value ? `${emojiScale[answer.value - 1]?.emoji || ''} ${emojiScale[answer.value - 1]?.label || answer.value}` : 'Ingen emoji-skattning inskickad';
        wrap.append(label, result);
        break;
      }
    }

    return wrap;
  }

  function buildSubmissionSummary(blocks, answers) {
    let answeredCount = 0;
    const notes = [];

    blocks.forEach(block => {
      const answer = answers[block.id] || {};
      if (block.type === 'textfield') {
        ensureTextFieldSettings(block);
        const values = Object.values(answer).filter(Boolean);
        if (values.length) {
          answeredCount += values.length;
          if (notes.length < 2) notes.push(compactText(values[0], 40));
        }
      }
      if (block.type === 'rating' || block.type === 'emoji') {
        if (answer.value !== undefined && answer.value !== null && answer.value !== '') {
          answeredCount += 1;
          if (notes.length < 2) notes.push(`${getBlockTitle(block)}: ${answer.value}`);
        }
      }
      if (block.type === 'table') {
        const values = Object.values(answer).filter(Boolean);
        if (values.length) {
          answeredCount += values.length;
          if (notes.length < 2) notes.push(`Tabell: ${compactText(values[0], 32)}`);
        }
      }
    });

    return {
      answeredCount,
      preview: notes.length ? notes.join(' · ') : 'Svar ännu ganska kortfattade'
    };
  }

  function renderCollectionGrid(target, seed, savedItems, sourceKind) {
    target.innerHTML = '';
    seed.forEach(item => target.appendChild(createLibraryCard(item, '', { sourceKind, isSaved: false })));
    savedItems.forEach(item => {
      target.appendChild(createLibraryCard({
        title: item.title,
        description: `${item.patient} · ${item.blocks.length} block · sparad ${item.createdAt}`,
        meta: ['Klar att använda', 'Senast sparad'],
        type: sourceKind === 'templates' ? 'Mall' : 'Hemuppgift',
        blocks: structuredClone(item.blocks)
      }, '', { sourceKind, isSaved: true }));
    });
  }

  function createLibraryCard(itemOrTitle, description = '', options = {}) {
    const item = typeof itemOrTitle === 'string'
      ? { title: itemOrTitle, description }
      : itemOrTitle;
    const title = item.title;
    const copy = item.description || description;
    const type = item.type || (/mall/i.test(title + ' ' + copy) ? 'Mall' : /psykoedukation|artikel|material/i.test(copy) ? 'Material' : 'Hemuppgift');
    const meta = item.meta?.length ? item.meta : ['Klar att använda', 'Mobilvänlig vy'];
    const actionPrimary = options.sourceKind === 'templates' ? 'Importera' : 'Öppna';
    const actionSecondary = options.sourceKind === 'templates' ? 'Importera kopia' : 'Duplicera';
    const card = document.createElement('div');
    card.className = 'card library-card';
    card.innerHTML = `<div class="library-card-head"><div><span class="library-card-type">${escapeHtml(type)}</span><h3>${escapeHtml(title)}</h3></div></div><p>${escapeHtml(copy)}</p><div class="library-card-meta">${meta.map(label => `<span>${escapeHtml(label)}</span>`).join('')}</div><div class="library-card-actions"><button class="builder-action" type="button">${actionPrimary}</button><button class="builder-action" type="button">${actionSecondary}</button></div>`;

    const [primaryButton, secondaryButton] = card.querySelectorAll('button');
    primaryButton.addEventListener('click', () => {
      if (options.sourceKind === 'templates') {
        loadCollectionIntoBuilder(item, { duplicate: false, sourceKind: options.sourceKind });
      } else {
        previewLibraryItem(item);
      }
    });
    secondaryButton.addEventListener('click', () => loadCollectionIntoBuilder(item, { duplicate: true, sourceKind: options.sourceKind }));
    return card;
  }

  function createTextInput(label, value, onChange, fieldName = '', compact = false, clearOnFocusValue = '') {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `<label class="field-label">${label}</label><input type="text" class="form-control" data-setting-name="${escapeAttribute(fieldName)}" value="${escapeAttribute(value || '')}"/>`;
    const input = group.querySelector('input');
    maybeBindExampleClear(input, clearOnFocusValue);
    input.addEventListener('input', event => onChange(event.target.value));
    if (compact) group.style.marginBottom = '6px';
    return group;
  }

  function createTextarea(label, value, onChange, fieldName = '', options = {}) {
    const group = document.createElement('div');
    group.className = 'field-group';
    group.innerHTML = `<label class="field-label">${label}</label><textarea data-setting-name="${escapeAttribute(fieldName)}">${escapeHtml(value || '')}</textarea>`;
    const textarea = group.querySelector('textarea');
    maybeBindExampleClear(textarea, options.clearOnFocusValue || '');
    textarea.addEventListener('input', event => onChange(event.target.value));
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
      const isHeaderRow = rowIndex === 0;
      const isFirstColumn = colIndex === 0;
      return {
        type: isHeaderRow || isFirstColumn ? 'static' : 'patient',
        text: getDefaultTableCellText(rowIndex, colIndex)
      };
    }));
  }

  function resizeTable(block, rows, cols) {
    block.settings.rows = clamp(rows, 1, 8);
    block.settings.cols = clamp(cols, 1, 4);
    block.settings.cells = createTableCells(block.settings.rows, block.settings.cols, block.settings.cells);
  }

  function getBlockTitle(block) {
    if (block.type === 'info') return block.settings.title || 'Informationstext';
    if (block.type === 'textfield') return block.settings.title || 'Textfält';
    if (block.type === 'rating') return block.settings.label || 'Skattningsbox';
    if (block.type === 'table') return `${block.settings.rows} × ${block.settings.cols} tabell`;
    if (block.type === 'emoji') return block.settings.label || 'Emoji-skala';
    return block.title;
  }

  function getBlockSummary(block) {
    if (block.type === 'info') return 'Statisk text och instruktioner';
    if (block.type === 'textfield') {
      ensureTextFieldSettings(block);
      const firstField = block.settings.fields[0];
      const suffix = firstField?.prompt ? ` · ${compactText(firstField.prompt, 24)}` : '';
      return `${block.settings.fields.length} fritextfält · max ${block.settings.maxChars} tecken${suffix}`;
    }
    if (block.type === 'rating') return `${block.settings.scale} · ${block.settings.ratingType === 'slider' ? 'dragbar mätare' : 'klickbar skala'}`;
    if (block.type === 'table') return `${block.settings.rows} rader · ${block.settings.cols} kolumner${block.settings.firstColumnHeaders ? ' · radrubriker aktiva' : ''}`;
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


  function estimateCompletionTime(blocks = state.blocks) {
    const minutes = blocks.reduce((sum, block) => {
      if (block.type === 'info') return sum + 1;
      if (block.type === 'textfield') return sum + Math.max(2, (block.settings.fields?.length || 1) * 2);
      if (block.type === 'table') return sum + 3;
      if (block.type === 'rating' || block.type === 'emoji') return sum + 1;
      return sum + 1;
    }, 0);
    return `${Math.max(3, minutes)} min`;
  }

  function previewLibraryItem(item) {
    const blocks = getCollectionBlocks(item);
    closeSettingsSheet();
    els.previewShell.innerHTML = '';
    els.previewShell.classList.add('device-preview');

    const intro = document.createElement('section');
    intro.className = 'preview-intro';
    intro.innerHTML = `
      <span class="preview-phone-brand">KBTApp</span>
      <div class="preview-patient-card">
        <div class="preview-patient-head">
          <div>
            <span class="preview-kicker">Förhandsvisning</span>
            <h4>${escapeHtml(item.title || 'Material')}</h4>
            <p>${escapeHtml(item.description || 'Patientvänlig förhandsvisning av sparat material eller vald mall.')}</p>
          </div>
          <span class="preview-status-chip">${escapeHtml(item.type || 'Material')}</span>
        </div>
        <div class="preview-patient-meta">
          <span>${blocks.length} block</span>
          <span>Beräknad tid ${estimateCompletionTime(blocks)}</span>
        </div>
      </div>
    `;
    els.previewShell.appendChild(intro);

    blocks.forEach(block => {
      const previewBlock = document.createElement('section');
      previewBlock.className = 'preview-block';
      previewBlock.appendChild(renderBlockPreview(block, true));
      els.previewShell.appendChild(previewBlock);
    });

    openModal(els.previewModal);
  }

  function loadCollectionIntoBuilder(item, { duplicate = false, sourceKind = 'library' } = {}) {
    const nextBlocks = getCollectionBlocks(item).map(block => ({
      ...structuredClone(block),
      id: `block_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    }));
    state.blocks = nextBlocks;
    state.selectedBlockId = nextBlocks[0]?.id || null;
    render();
    const therapistCreateNav = document.querySelector('#therapist-view .nav-item[data-page="create"]');
    therapistCreateNav?.click();
    closeSettingsSheet();
    showToast(
      sourceKind === 'templates' ? 'Mall importerad' : (duplicate ? 'Material duplicerat' : 'Material laddat'),
      `${item.title || 'Valt material'} ligger nu i arbetsytan.`
    );
  }

  function getCollectionBlocks(item) {
    if (item.blocks?.length) {
      return structuredClone(item.blocks);
    }

    const title = item.title || 'Patientmaterial';
    const description = item.description || 'Kort introduktion till materialet.';
    const type = (item.type || '').toLowerCase();

    if (type.includes('mall')) {
      return [
        {
          id: `seed_${Date.now()}_1`,
          type: 'info',
          title,
          collapsed: false,
          settings: {
            title,
            content: description
          }
        },
        {
          id: `seed_${Date.now()}_2`,
          type: 'textfield',
          title: 'Textfält',
          collapsed: false,
          settings: {
            title: 'Patientens reflektion',
            maxChars: 1200,
            fields: [
              createTextFieldItem('Situation eller övning', 'Beskriv kort vad du provade eller vill undersöka.'),
              createTextFieldItem('Vad märkte du?', 'Skriv några meningar om tankar, känslor eller vad du lärde dig.')
            ]
          }
        }
      ];
    }

    if (type.includes('material')) {
      return [
        {
          id: `seed_${Date.now()}_1`,
          type: 'info',
          title,
          collapsed: false,
          settings: {
            title,
            content: description
          }
        }
      ];
    }

    return [
      {
        id: `seed_${Date.now()}_1`,
        type: 'info',
        title,
        collapsed: false,
        settings: {
          title,
          content: description
        }
      },
      {
        id: `seed_${Date.now()}_2`,
        type: 'rating',
        title: 'Skattningsbox',
        collapsed: false,
        settings: {
          label: 'Hur svårt kändes detta?',
          scale: '0-10',
          customMin: 0,
          customMax: 10,
          ratingType: 'clickable'
        }
      },
      {
        id: `seed_${Date.now()}_3`,
        type: 'textfield',
        title: 'Textfält',
        collapsed: false,
        settings: {
          title: 'Kort uppföljning',
          maxChars: 1200,
          fields: [
            createTextFieldItem('Vad fungerade?', 'Beskriv kort vad som gick bättre än väntat.'),
            createTextFieldItem('Vad vill du ta med dig?', 'Skriv några meningar om nästa steg eller lärdom.')
          ]
        }
      }
    ];
  }

  function closeSettingsSheet() {
    els.settingsPanel?.classList.remove('open');
  }

  function openModal(element) {
    if (!element) return;
    closeAllModals(element);
    element.classList.add('open');
    element.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal(element) {
    if (!element) return;
    element.classList.remove('open');
    element.setAttribute('aria-hidden', 'true');
    if (!document.querySelector('.overlay-modal.open')) {
      document.body.classList.remove('modal-open');
    }
  }

  function closeAllModals(exceptElement = null) {
    document.querySelectorAll('.overlay-modal.open').forEach(modal => {
      if (exceptElement && modal === exceptElement) return;
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    });
    if (!exceptElement) {
      document.body.classList.remove('modal-open');
    }
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

  function createTextFieldItem(title, prompt) {
    return {
      title,
      prompt,
      defaultTitle: title,
      defaultPrompt: prompt
    };
  }

  function ensureTextFieldSettings(block) {
    if (!block.settings.fields?.length) {
      const legacyLabel = block.settings.label || 'Reflektion';
      block.settings.fields = [createTextFieldItem(legacyLabel, 'Skriv några meningar här.')];
    }
    if (!block.settings.title) block.settings.title = block.settings.label || 'Textfält';
    block.settings.fields = block.settings.fields.map(field => ({
      ...field,
      defaultTitle: field.defaultTitle || field.title || 'Fritext',
      defaultPrompt: field.defaultPrompt || field.prompt || 'Skriv några meningar här.'
    }));
  }

  function maybeBindExampleClear(field, clearOnFocusValue) {
    if (!field || !clearOnFocusValue) return;
    field.addEventListener('focus', () => {
      if (field.dataset.exampleCleared === 'true') return;
      if (field.value === clearOnFocusValue) {
        field.value = '';
        field.dataset.exampleCleared = 'true';
      }
    }, { once: false });
  }

  function compactText(value, maxLength) {
    const clean = String(value || '').replace(/\s+/g, ' ').trim();
    if (!clean) return '';
    return clean.length <= maxLength ? clean : `${clean.slice(0, Math.max(0, maxLength - 1))}…`;
  }

  function getDefaultTableCellText(rowIndex, colIndex) {
    if (rowIndex === 0) return `Kolumnrubrik ${colIndex + 1}`;
    if (colIndex === 0) return `Radrubrik ${rowIndex}`;
    return '';
  }
}
