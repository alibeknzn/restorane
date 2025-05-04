const CLIENT_ID =
  '238459408958-ug5nb6iam75o9pbemkca73iimlss78vf.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAR4A_D28oNNn_tCl6_VWgbKnhw_NSkJzo';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
];
const SCOPES =
  'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar';

let userProfile = null;

function handleClientLoad() {
  console.log('Loading GAPI client...');
  gapi.load('client:auth2', initClient);
}

function initClient() {
  console.log('Initializing GAPI client...');
  gapi.client
    .init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    })
    .then(() => {
      console.log('✅ GAPI initialized successfully');
      const authInstance = gapi.auth2.getAuthInstance();
      const isSignedIn = authInstance.isSignedIn.get();
      console.log('User is signed in:', isSignedIn);

      // Setup sign-in listener
      authInstance.isSignedIn.listen(updateSigninStatus);

      // Handle initial sign-in state
      updateSigninStatus(isSignedIn);
    })
    .catch((error) => {
      console.error('Error initializing GAPI client:', error);
      alert('Failed to initialize Google API. Check console for details.');
    });
}

function updateSigninStatus(isSignedIn) {
  console.log('Auth status changed. Signed in:', isSignedIn);
  const authSection = document.getElementById('auth-section');
  const contentSection = document.getElementById('content-section');

  if (isSignedIn) {
    try {
      console.log('User is signed in, updating UI...');
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

      console.log('User profile:', userProfile);
      document.getElementById('user-email').textContent = userProfile.email;

      // Load tasks
      console.log('Loading tasks...');
      loadTasks();
    } catch (error) {
      console.error('Error in updateSigninStatus:', error);
    }
  } else {
    console.log('User is signed out, updating UI...');
    authSection.style.display = 'block';
    contentSection.style.display = 'none';
    userProfile = null;
  }
}

function handleAuthClick() {
  console.log('Auth button clicked, starting sign-in process...');
  gapi.auth2
    .getAuthInstance()
    .signIn()
    .then(() => {
      console.log('Sign-in successful');
    })
    .catch((error) => {
      console.error('Sign-in error:', error);
      alert('Sign-in failed. Check console for details.');
    });
}

function handleSignoutClick() {
  console.log('Sign-out button clicked');
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

  console.log('Starting to load task lists...');

  // Check if API is properly initialized
  if (!gapi.client.tasks) {
    console.error('Tasks API not loaded properly');
    taskList.innerHTML =
      '<li>Error: Google Tasks API not loaded. Check your API key and console for details.</li>';
    return;
  }

  gapi.client.tasks.tasklists
    .list()
    .then((response) => {
      console.log('Task lists response:', response);

      if (!response.result.items || response.result.items.length === 0) {
        console.log('No task lists found');
        taskList.innerHTML =
          '<li>No task lists found. Create a task list in Google Tasks first.</li>';
        return;
      }

      const listId = response.result.items[0].id;
      console.log('Using task list ID:', listId);

      return gapi.client.tasks.tasks.list({ tasklist: listId });
    })
    .then((resp) => {
      if (!resp) return; // Handle if previous promise didn't return tasks

      console.log('Tasks response:', resp);
      const tasks = resp.result.items || [];
      taskList.innerHTML = '';

      if (tasks.length === 0) {
        console.log('No tasks found in list');
        taskList.innerHTML = '<li>No tasks found in this list.</li>';
        return;
      }

      console.log(`Found ${tasks.length} tasks, rendering...`);
      tasks.forEach((task) => {
        console.log('Task:', task.title, 'Status:', task.status);
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
      console.error('Error in loadTasks:', error);
      taskList.innerHTML = `<li>Error loading tasks: ${
        error.message || 'Unknown error'
      }</li>`;
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = handleClientLoad;
  document.body.appendChild(script);
});
