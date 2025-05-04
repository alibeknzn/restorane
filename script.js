const CLIENT_ID =
  '238459408958-ug5nb6iam75o9pbemkca73iimlss78vf.apps.googleusercontent.com';
const API_KEY = '';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
];
const SCOPES =
  'https://www.googleapis.com/auth/tasks.readonly https://www.googleapis.com/auth/calendar.readonly';

let userProfile = null;

function handleClientLoad() {
  gapi.load('client:auth2', initClient);
}

function initClient() {
  gapi.client
    .init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    })
    .then(() => {
      console.log('✅ GAPI initialized');
      updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
      gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
    })
    .catch((error) => {
      console.error('Error initializing GAPI client', error);
    });
}

function updateSigninStatus(isSignedIn) {
  const authSection = document.getElementById('auth-section');
  const contentSection = document.getElementById('content-section');

  if (isSignedIn) {
    authSection.style.display = 'none';
    contentSection.style.display = 'block';

    const user = gapi.auth2.getAuthInstance().currentUser.get();
    const profile = user.getBasicProfile();
    userProfile = {
      id: profile.getId(),
      name: profile.getName(),
      email: profile.getEmail(),
      imageUrl: profile.getImageUrl(),
    };

    document.getElementById('user-email').textContent = userProfile.email;

    loadTasks();
  } else {
    authSection.style.display = 'block';
    contentSection.style.display = 'none';
    userProfile = null;
  }
}

function handleAuthClick() {
  gapi.auth2.getAuthInstance().signIn();
}

function handleSignoutClick() {
  gapi.auth2.getAuthInstance().signOut();
}

function switchTab(tabName) {
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.classList.remove('active');
  });
  event.target.classList.add('active');

  document.querySelectorAll('.tab-content').forEach((content) => {
    content.style.display = 'none';
  });

  if (tabName === 'calendar') {
    document.getElementById('calendar-tab').style.display = 'block';
    loadCalendarEvents();
  } else if (tabName === 'tasks') {
    document.getElementById('tasks-tab').style.display = 'block';
    loadTasks();
  }
}

function loadCalendarEvents() {
  const eventsContainer = document.getElementById('events-list');
  eventsContainer.innerHTML = '<p>Loading events...</p>';

  const today = new Date();
  const tenDaysLater = new Date(today);
  tenDaysLater.setDate(today.getDate() + 10);

  gapi.client.calendar.events
    .list({
      calendarId: 'primary',
      timeMin: today.toISOString(),
      timeMax: tenDaysLater.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 10,
      orderBy: 'startTime',
    })
    .then((response) => {
      const events = response.result.items;
      displayEvents(events);
    })
    .catch((error) => {
      console.error('Error fetching calendar events', error);
      eventsContainer.innerHTML =
        '<p>Error loading events. Please try again.</p>';
    });
}

function displayEvents(events) {
  const eventsContainer = document.getElementById('events-list');

  if (!events || events.length === 0) {
    eventsContainer.innerHTML = '<p>No upcoming events found.</p>';
    return;
  }

  let html = '<div class="events-grid">';

  events.forEach((event) => {
    const start = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date);
    const end = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date);

    const dateOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit' };

    const dateStr = start.toLocaleDateString(undefined, dateOptions);
    const startTimeStr = event.start.dateTime
      ? start.toLocaleTimeString(undefined, timeOptions)
      : 'All day';
    const endTimeStr = event.end.dateTime
      ? end.toLocaleTimeString(undefined, timeOptions)
      : '';

    const timeStr = startTimeStr + (endTimeStr ? ` - ${endTimeStr}` : '');

    html += `
      <div class="event-card">
        <div class="event-date">${dateStr}</div>
        <div class="event-time">${timeStr}</div>
        <div class="event-title">${event.summary || 'Untitled Event'}</div>
        ${
          event.location
            ? `<div class="event-location">📍 ${event.location}</div>`
            : ''
        }
      </div>
    `;
  });

  html += '</div>';
  eventsContainer.innerHTML = html;
}

function loadTasks() {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '<li>Loading tasks...</li>';

  gapi.client.tasks.tasklists
    .list()
    .then((response) => {
      const listId = response.result.items[0].id;
      gapi.client.tasks.tasks
        .list({ tasklist: listId })
        .then((resp) => {
          const tasks = resp.result.items || [];
          taskList.innerHTML = '';

          if (tasks.length === 0) {
            taskList.innerHTML = '<li>No tasks found.</li>';
            return;
          }

          tasks.forEach((task) => {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
          <span class="task-title ${
            task.status === 'completed' ? 'completed' : ''
          }">
            ${task.title || 'Untitled Task'}
          </span>
          ${
            task.status === 'completed'
              ? '<span class="task-status">✅</span>'
              : ''
          }
        `;
            taskList.appendChild(li);
          });
        })
        .catch((error) => {
          console.error('Error loading tasks', error);
          taskList.innerHTML =
            '<li>Error loading tasks. Please try again.</li>';
        });
    })
    .catch((error) => {
      console.error('Error loading task lists', error);
      taskList.innerHTML =
        '<li>Error loading task lists. Please try again.</li>';
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = handleClientLoad;
  document.body.appendChild(script);
});
