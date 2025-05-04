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
let tokenClient;
let hasAccessToken = false;

// Called when the page loads
function handleClientLoad() {
  console.log('Loading GAPI client...');
  gapi.load('client', initializeGapiClient);
}

// Initialize the GAPI client
async function initializeGapiClient() {
  console.log('Initializing GAPI client...');
  try {
    await gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: DISCOVERY_DOCS,
    });
    console.log('GAPI client initialized');

    // Initialize the token client
    initializeTokenClient();
  } catch (error) {
    console.error('Error initializing GAPI client:', error);
    alert('Failed to initialize Google API. Check console for details.');
  }
}

// Initialize the Google Identity Services token client
function initializeTokenClient() {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (tokenResponse) => {
      if (tokenResponse && tokenResponse.access_token) {
        console.log('Access token received successfully');
        hasAccessToken = true;
        // Access token received, user is authenticated
        updateUIForSignedIn();
      } else {
        console.log('No access token received in response');
        showConsentScreen();
      }
    },
    error_callback: (error) => {
      console.error('Token client error:', error);

      // Check if this is a popup blocked error
      if (
        error.type === 'popup_failed_to_open' ||
        error.message?.includes('popup')
      ) {
        alert(
          'Popup was blocked. Please allow popups for this site and try again.',
        );
      } else {
        alert('Failed to get access token: ' + error.message);
      }

      showConsentScreen();
    },
  });
}

// Handle credential response from Google Identity Services
function handleCredentialResponse(response) {
  if (response.credential) {
    console.log('Credential received:', response);

    // Decode the JWT token to get user profile info
    const decodedToken = parseJwt(response.credential);
    if (decodedToken) {
      userProfile = {
        id: decodedToken.sub,
        name: decodedToken.name,
        email: decodedToken.email,
        imageUrl: decodedToken.picture,
      };

      console.log('User profile:', userProfile);

      // Show consent screen instead of automatically requesting token
      showConsentScreen();
    }
  } else {
    console.error('No credential received');
    document.getElementById('auth-section').style.display = 'block';
  }
}

// Parse the JWT token
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );

    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error parsing JWT token:', e);
    return null;
  }
}

// Show the consent screen after initial sign-in
function showConsentScreen() {
  console.log('Showing consent screen');
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('content-section').style.display = 'none';

  const consentSection = document.getElementById('consent-section');
  consentSection.style.display = 'block';

  if (userProfile && userProfile.email) {
    document.getElementById('consent-user-email').textContent =
      'Signed in as: ' + userProfile.email;
  }
}

// Request access token with appropriate scopes
// This is now called by the button click directly
function requestAccessToken() {
  console.log('Requesting access token via button click...');

  // This is now triggered directly by user interaction (button click)
  // which should prevent popup blocking
  tokenClient.requestAccessToken({
    prompt: '', // empty string for a single prompt
    // Use 'consent' to force the consent screen every time
  });
}

// Update UI when user is signed in
function updateUIForSignedIn() {
  console.log('Updating UI for signed in user');
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('consent-section').style.display = 'none';
  document.getElementById('content-section').style.display = 'block';

  // Display user email if available
  if (userProfile && userProfile.email) {
    document.getElementById('user-email').textContent = userProfile.email;
  }

  // Load calendar events by default
  loadCalendarEvents();

  // Also preload tasks in the background
  setTimeout(() => {
    loadTasks();
  }, 500);
}

// Update UI when user is signed out
function updateUIForSignedOut() {
  console.log('Updating UI for signed out user');
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('consent-section').style.display = 'none';
  document.getElementById('content-section').style.display = 'none';
  userProfile = null;
  hasAccessToken = false;
}

// Sign out the user
function handleSignoutClick() {
  console.log('Sign-out button clicked');

  // Revoke the token
  if (gapi.client.getToken()) {
    google.accounts.oauth2.revoke(gapi.client.getToken().access_token, () => {
      console.log('Token revoked');
      gapi.client.setToken('');
      updateUIForSignedOut();
    });
  } else {
    updateUIForSignedOut();
  }
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
  eventsContainer.innerHTML =
    '<p class="loading-message">Loading your calendar events...</p>';

  const today = new Date();
  const thirtyDaysLater = new Date(today);
  thirtyDaysLater.setDate(today.getDate() + 30); // Show next 30 days instead of 10

  gapi.client.calendar.events
    .list({
      calendarId: 'primary',
      timeMin: today.toISOString(),
      timeMax: thirtyDaysLater.toISOString(),
      showDeleted: false,
      singleEvents: true,
      maxResults: 20, // Increased from 10 to 20
      orderBy: 'startTime',
    })
    .then((response) => {
      const events = response.result.items;
      displayEvents(events);
    })
    .catch((error) => {
      console.error('Error fetching calendar events', error);
      eventsContainer.innerHTML =
        '<p class="error-message">Error loading events. Please try again or check console for details.</p>';
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
