/******************************************************************************
 * script.js – KBTApp grundnavigering
 * Punkt 1: Endast vyväxling. Ingen backend, inget API, ingen data än.
 ******************************************************************************/

document.addEventListener('DOMContentLoaded', () => {
  // --- Dagens datum ---
  const today = new Date().toLocaleDateString('sv-SE', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const tp = document.getElementById('therapist-date');
  const cp = document.getElementById('client-date');
  if (tp) tp.textContent = today;
  if (cp) cp.textContent = today;

  // --- Vyväxling ---
  const loginView = document.getElementById('login-view');
  const therapistView = document.getElementById('therapist-view');
  const clientView = document.getElementById('client-view');

  function openRole(role) {
    loginView.classList.remove('active');
    therapistView.classList.remove('active');
    clientView.classList.remove('active');
    if (role === 'therapist') {
      therapistView.classList.add('active');
    } else {
      clientView.classList.add('active');
    }
  }

  document.querySelectorAll('.login-role').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      openRole(btn.dataset.role);
    });
  });

  // --- Logga ut ---
  document.querySelectorAll('.logout').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      therapistView.classList.remove('active');
      clientView.classList.remove('active');
      loginView.classList.add('active');
    });
  });

  // --- Navigationsrouter (sidonav + bottennav) ---
  function setupNav(viewElement, prefix) {
    const sideNav = viewElement.querySelector('.side-nav');
    const bottomNav = viewElement.querySelector('.bottom-nav');
    const main = viewElement.querySelector('.app-main');

    function switchPage(pageId) {
      // Uppdatera sidonav
      sideNav.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
      });
      // Uppdatera bottennav
      if (bottomNav) {
        bottomNav.querySelectorAll('.bottom-item').forEach(item => {
          item.classList.toggle('active', item.dataset.page === pageId);
        });
      }
      // Uppdatera sidor
      main.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.dataset.page === pageId);
      });
    }

    // Klick i sidonav
    sideNav.querySelectorAll('.nav-item[data-page]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        switchPage(item.dataset.page);
      });
    });

    // Klick i bottennav
    if (bottomNav) {
      bottomNav.querySelectorAll('.bottom-item[data-page]').forEach(item => {
        item.addEventListener('click', e => {
          e.preventDefault();
          switchPage(item.dataset.page);
        });
      });
    }
  }

  setupNav(therapistView, 'therapist');
  setupNav(clientView, 'client');

  // --- Arbetsyta-flikar (Skapa patientmaterial) ---
  document.querySelectorAll('.workspace-tabs').forEach(tabBar => {
    tabBar.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        tabBar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  });
});
