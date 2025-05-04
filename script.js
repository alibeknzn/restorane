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
let isAuthorized = false;

// Called when the page loads
function handleClientLoad() {
  console.log('Loading GAPI client...');
  gapi.load('client:auth2', initClient);
}

// Initialize the GAPI client
async function initClient() {
  console.log('Initializing GAPI client...');
  try {
    await gapi.client.init({
      apiKey: API_KEY,
      clientId: CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    });

    console.log('GAPI client initialized');

    // Listen for sign-in state changes
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);

    // Handle the initial sign-in state
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  } catch (error) {
    console.error('Error initializing GAPI client:', error);
    showError(
      'Failed to initialize Google API. Please check your connection and try again.',
    );
  }
}

// Update UI based on auth status
function updateSigninStatus(isSignedIn) {
  console.log('Auth status changed. Signed in:', isSignedIn);
  isAuthorized = isSignedIn;

  if (isSignedIn) {
    // Hide auth section and show loading
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('loading-section').style.display = 'block';

    // Get user info
    const user = gapi.auth2.getAuthInstance().currentUser.get();
    const profile = user.getBasicProfile();
    userProfile = {
      id: profile.getId(),
      name: profile.getName(),
      email: profile.getEmail(),
      imageUrl: profile.getImageUrl(),
    };

    console.log('User profile:', userProfile);

    // Show content after retrieving data
    loadUserData();
  } else {
    // User is not signed in, show auth section
    document.getElementById('auth-section').style.display = 'block';
    document.getElementById('loading-section').style.display = 'none';
    document.getElementById('content-section').style.display = 'none';
  }
}

// Handle auth click - streamlined single step auth
function handleAuthClick() {
  if (!gapi.auth2) {
    console.error('Auth2 not initialized');
    showError(
      'Authentication service not initialized. Please refresh the page and try again.',
    );
    return;
  }

  console.log('Auth button clicked, starting sign-in process...');

  // Show loading indicator while authenticating
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('loading-section').style.display = 'block';

  gapi.auth2
    .getAuthInstance()
    .signIn()
    .then(() => {
      console.log('Sign-in successful');
      // updateSigninStatus listener will handle the UI update
    })
    .catch((error) => {
      console.error('Sign-in error:', error);
      document.getElementById('auth-section').style.display = 'block';
      document.getElementById('loading-section').style.display = 'none';

      if (error.error === 'popup_blocked' || error.details?.includes('popup')) {
        showError(
          'Popup was blocked. Please allow popups for this site and try again.',
        );
      } else {
        showError('Sign-in failed. Please try again later.');
      }
    });
}

// Handle sign-out click
function handleSignoutClick() {
  console.log('Sign-out button clicked');
  gapi.auth2
    .getAuthInstance()
    .signOut()
    .then(() => {
      console.log('Sign-out successful');
      // The updateSigninStatus listener will handle UI updates
    })
    .catch((error) => {
      console.error('Sign-out error:', error);
    });
}

// Load user data after authentication
function loadUserData() {
  // Display user email
  if (userProfile && userProfile.email) {
    document.getElementById('user-email').textContent = userProfile.email;
  }

  // Load calendar events first
  loadCalendarEvents()
    .then(() => {
      // Show content section after data is loaded
      document.getElementById('loading-section').style.display = 'none';
      document.getElementById('content-section').style.display = 'block';

      // Also load tasks in background
      loadTasks().catch((error) => {
        console.error('Error loading tasks:', error);
      });
    })
    .catch((error) => {
      console.error('Error loading calendar events:', error);
      document.getElementById('loading-section').style.display = 'none';
      document.getElementById('content-section').style.display = 'block';
      // Still show content but with error message in events section
    });
}

// Show error message to user
function showError(message) {
  alert(message);
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
    loadCalendarEvents().catch((error) => {
      console.error('Error reloading calendar events:', error);
    });
  } else if (tabName === 'tasks') {
    document.getElementById('tasks-tab').style.display = 'block';
    loadTasks().catch((error) => {
      console.error('Error reloading tasks:', error);
    });
  }
}

// Load calendar events and return promise
function loadCalendarEvents() {
  const eventsContainer = document.getElementById('events-list');
  eventsContainer.innerHTML =
    '<p class="loading-message">Loading your calendar events...</p>';

  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30);

  return gapi.client.calendar.events
    .list({
      calendarId: 'primary',
      timeMin: today.toISOString(),
      timeMax: thirtyDaysLater.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 20,
      orderBy: 'startTime',
    })
    .then((response) => {
      const events = response.result.items;
      displayEvents(events);
      return events;
    })
    .catch((error) => {
      console.error('Error fetching calendar events', error);
      eventsContainer.innerHTML =
        '<p class="error-message">Error loading events. Please try again or check console for details.</p>';
      throw error;
    });
}

function displayEvents(events) {
  const eventsContainer = document.getElementById('events-list');

  if (!events || events.length === 0) {
    eventsContainer.innerHTML =
      '<p class="no-events">No upcoming events found in your calendar.</p>';
    return;
  }

  // Group events by date
  const eventsByDate = {};
  events.forEach((event) => {
    const start = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date);
    const dateStr = start.toISOString().split('T')[0]; // YYYY-MM-DD format

    if (!eventsByDate[dateStr]) {
      eventsByDate[dateStr] = [];
    }
    eventsByDate[dateStr].push(event);
  });

  let html = '';

  // Sort dates chronologically
  const sortedDates = Object.keys(eventsByDate).sort();

  sortedDates.forEach((dateStr) => {
    const date = new Date(dateStr);
    const dateOptions = { weekday: 'long', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString(undefined, dateOptions);

    // Add date header
    html += `<div class="date-header">${formattedDate}</div>`;
    html += '<div class="events-grid">';

    // Add events for this date
    eventsByDate[dateStr].forEach((event) => {
      const start = event.start.dateTime
        ? new Date(event.start.dateTime)
        : new Date(event.start.date);
      const end = event.end.dateTime
        ? new Date(event.end.dateTime)
        : new Date(event.start.date);

      const timeOptions = { hour: '2-digit', minute: '2-digit' };

      const startTimeStr = event.start.dateTime
        ? start.toLocaleTimeString(undefined, timeOptions)
        : 'All day';
      const endTimeStr = event.end.dateTime
        ? end.toLocaleTimeString(undefined, timeOptions)
        : '';

      const timeStr = startTimeStr + (endTimeStr ? ` - ${endTimeStr}` : '');

      // Format calendar color
      const calendarColor = event.colorId ? `color-${event.colorId}` : '';

      html += `
        <div class="event-card ${calendarColor}">
          <div class="event-time">${timeStr}</div>
          <div class="event-title">${event.summary || 'Untitled Event'}</div>
          ${
            event.location
              ? `<div class="event-location">📍 ${event.location}</div>`
              : ''
          }
          ${
            event.description
              ? `<div class="event-description">${truncateText(
                  event.description,
                  100,
                )}</div>`
              : ''
          }
          ${
            event.hangoutLink
              ? `<div class="event-meet"><a href="${event.hangoutLink}" target="_blank">Join Google Meet</a></div>`
              : ''
          }
        </div>
      `;
    });

    html += '</div>';
  });

  eventsContainer.innerHTML = html;
}

// Helper function to truncate text
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Load tasks and return promise
function loadTasks() {
  const taskList = document.getElementById('task-list');
  taskList.innerHTML = '<li>Loading tasks...</li>';

  console.log('Starting to load task lists...');

  // Check if API is properly initialized
  if (!gapi.client.tasks) {
    console.error('Tasks API not loaded properly');
    taskList.innerHTML =
      '<li>Error: Google Tasks API not loaded. Check your API key and console for details.</li>';
    return Promise.reject(new Error('Tasks API not loaded'));
  }

  return gapi.client.tasks.tasklists
    .list()
    .then((response) => {
      console.log('Task lists response:', response);

      if (!response.result.items || response.result.items.length === 0) {
        console.log('No task lists found');
        taskList.innerHTML =
          '<li>No task lists found. Create a task list in Google Tasks first.</li>';
        return null;
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

      return tasks;
    })
    .catch((error) => {
      console.error('Error in loadTasks:', error);
      taskList.innerHTML = `<li>Error loading tasks: ${
        error.message || 'Unknown error'
      }</li>`;
      throw error;
    });
}

document.addEventListener('DOMContentLoaded', () => {
  const script = document.createElement('script');
  script.src = 'https://apis.google.com/js/api.js';
  script.onload = handleClientLoad;
  document.body.appendChild(script);
});
