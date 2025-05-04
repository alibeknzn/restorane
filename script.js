const CLIENT_ID = '238459408958-ug5nb6iam75o9pbemkca73iimlss78vf.apps.googleusercontent.com';
  const API_KEY = ''; // можно не использовать, если только tasks API
  const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest"];
  const SCOPES = 'https://www.googleapis.com/auth/tasks.readonly';

  function handleClientLoad() {
    gapi.load('client:auth2', initClient);
  }

  function initClient() {
    gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES
    }).then(() => {
      const authInstance = gapi.auth2.getAuthInstance();
      if (authInstance.isSignedIn.get()) {
        loadTasks();
      } else {
        console.log('⛔ Пользователь не авторизован');
      }
    });
  }

  function handleAuthClick() {
    gapi.auth2.getAuthInstance().signIn().then(() => {
      loadTasks();
    }).catch(err => {
      console.error('❌ Ошибка входа:', err);
    });
  }

  function loadTasks() {
    gapi.client.tasks.tasklists.list().then(response => {
      const listId = response.result.items[0]?.id;
      if (!listId) return alert('Нет списка задач');

      gapi.client.tasks.tasks.list({ tasklist: listId }).then(resp => {
        const tasks = resp.result.items || [];
        const ul = document.getElementById('task-list');
        ul.innerHTML = '';
        tasks.forEach(task => {
          const li = document.createElement('li');
          li.textContent = `${task.title}${task.status === 'completed' ? ' ✅' : ''}`;
          ul.appendChild(li);
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const script = document.createElement('script');
    script.src = "https://apis.google.com/js/api.js";
    script.onload = handleClientLoad;
    document.body.appendChild(script);
  });