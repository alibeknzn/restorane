const CLIENT_ID =
  '238459408958-ug5nb6iam75o9pbemkca73iimlss78vf.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAR4A_D28oNNn_tCl6_VWgbKnhw_NSkJzo';
const DISCOVERY_DOCS = [
  'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
  'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
];
const SCOPES =
  'https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/calendar';

// Storage keys
const STORAGE_KEY_TOKEN = 'google_token';
const STORAGE_KEY_PROFILE = 'user_profile';
const STORAGE_KEY_EXPIRY = 'token_expiry';

let userProfile = null;
let isAuthorized = false;

// Called when the page loads
function handleClientLoad() {
  console.log('Loading GAPI client...');

  // Try to load profile from localStorage
  const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
  const tokenExpiry = localStorage.getItem(STORAGE_KEY_EXPIRY);

  // Check if we have a valid token that hasn't expired
  if (
    savedProfile &&
    tokenExpiry &&
    new Date().getTime() < parseInt(tokenExpiry, 10)
  ) {
    userProfile = JSON.parse(savedProfile);
    console.log('Restored profile from localStorage:', userProfile);

    // Initialize API client and proceed with stored credentials
    initializeApiClient(true);
  } else {
    // Clear any stale data
    clearStoredAuth();

    // Initialize API client without auto-loading data
    initializeApiClient(false);
  }
}

// Initialize just the API client without auth
async function initializeApiClient(autoLoadData) {
  try {
    await gapi.load('client', async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        console.log('GAPI client initialized');

        // If we have stored credentials, load user data
        if (autoLoadData && userProfile) {
          // Set the token from localStorage
          const token = localStorage.getItem(STORAGE_KEY_TOKEN);
          if (token) {
            gapi.client.setToken({ access_token: token });

            // Show loading and load user data
            document.getElementById('auth-section').style.display = 'none';
            document.getElementById('loading-section').style.display = 'block';
            loadUserData();
          } else {
            showLoginScreen();
          }
        } else {
          showLoginScreen();
        }
      } catch (error) {
        console.error('Error initializing GAPI client:', error);
        showError(
          'Failed to initialize Google API. Please check your connection and try again.',
        );
        showLoginScreen();
      }
    });
  } catch (error) {
    console.error('Error loading GAPI client:', error);
    showError(
      'Failed to load Google API. Please refresh the page and try again.',
    );
    showLoginScreen();
  }
}

// Show the login screen
function showLoginScreen() {
  document.getElementById('auth-section').style.display = 'block';
  document.getElementById('loading-section').style.display = 'none';
  document.getElementById('content-section').style.display = 'none';
}

// Handle auth click - using the new Identity Services
function handleAuthClick() {
  console.log('Auth button clicked, starting sign-in process...');

  // Show loading indicator while authenticating
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('loading-section').style.display = 'block';

  // Use newer Identity Services library
  google.accounts.oauth2
    .initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      prompt: 'consent',
      callback: handleAuthResponse,
    })
    .requestAccessToken();
}

// Handle the auth response
function handleAuthResponse(response) {
  console.log('Auth response received:', response);

  if (response.error) {
    console.error('Error in auth response:', response.error);
    showError('Authentication failed: ' + response.error);
    showLoginScreen();
    return;
  }

  if (response.access_token) {
    // Store the token
    const tokenExpiryTime = new Date().getTime() + response.expires_in * 1000;
    localStorage.setItem(STORAGE_KEY_TOKEN, response.access_token);
    localStorage.setItem(STORAGE_KEY_EXPIRY, tokenExpiryTime.toString());

    // Set the token for API calls
    gapi.client.setToken({ access_token: response.access_token });

    // Get user profile
    fetchUserProfile()
      .then(() => {
        loadUserData();
      })
      .catch((error) => {
        console.error('Error fetching user profile:', error);
        showError('Failed to fetch user profile. Please try again.');
        showLoginScreen();
      });
  } else {
    showError('No access token received. Please try again.');
    showLoginScreen();
  }
}

// Fetch the user profile using the UserInfo endpoint instead of People API
async function fetchUserProfile() {
  try {
    // Use the UserInfo endpoint instead of People API
    const response = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem(STORAGE_KEY_TOKEN),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`UserInfo request failed with status ${response.status}`);
    }

    const data = await response.json();

    // Extract profile info
    userProfile = {
      id: data.sub,
      name: data.name || 'User',
      email: data.email || 'No email',
      imageUrl: data.picture || '',
    };

    console.log('User profile:', userProfile);

    // Store profile in localStorage
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(userProfile));

    return userProfile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    throw new Error('Failed to fetch user profile');
  }
}

// Handle sign-out click
function handleSignoutClick() {
  console.log('Sign-out button clicked');

  // Clear stored auth data
  clearStoredAuth();

  // Reset API client token
  gapi.client.setToken(null);

  // Show login screen
  showLoginScreen();
}

// Clear stored auth data
function clearStoredAuth() {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
  localStorage.removeItem(STORAGE_KEY_PROFILE);
  localStorage.removeItem(STORAGE_KEY_EXPIRY);
  userProfile = null;
  isAuthorized = false;
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

      // Check if this is an auth error
      if (
        error.status === 401 ||
        error.status === 403 ||
        (error.result &&
          error.result.error &&
          (error.result.error.status === 'UNAUTHENTICATED' ||
            error.result.error.status === 'PERMISSION_DENIED'))
      ) {
        console.log('Authentication error detected, clearing stored auth');
        clearStoredAuth();
        showError('Your session has expired. Please sign in again.');
        showLoginScreen();
      } else {
        // For other errors, still show content with error message
        document.getElementById('loading-section').style.display = 'none';
        document.getElementById('content-section').style.display = 'block';
      }
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

  console.log(
    'Fetching calendar events from',
    today.toISOString(),
    'to',
    thirtyDaysLater.toISOString(),
  );

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
      console.log('Calendar API response:', response);
      const events = response.result.items;
      console.log('Found', events ? events.length : 0, 'calendar events');

      if (events && events.length > 0) {
        console.log('First event:', events[0]);
      }

      displayEvents(events);
      return events;
    })
    .catch((error) => {
      console.error('Error fetching calendar events', error);
      eventsContainer.innerHTML =
        '<p class="error-message">Error loading events: ' +
        (error.result?.error?.message || error.message || 'Unknown error') +
        '</p>';
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

  // Store the active task list ID globally
  let activeTaskListId;

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

      activeTaskListId = response.result.items[0].id;
      console.log('Using task list ID:', activeTaskListId);

      return gapi.client.tasks.tasks.list({ tasklist: activeTaskListId });
    })
    .then((resp) => {
      if (!resp) return; // Handle if previous promise didn't return tasks

      console.log('Tasks response:', resp);
      const tasks = resp.result.items || [];
      taskList.innerHTML = '';

      if (tasks.length === 0) {
        console.log('No tasks found in list');

        // Add a button to add a new task
        const noTasksElement = document.createElement('div');
        noTasksElement.innerHTML = `
          <p>No tasks found in this list.</p>
          <button id="add-task-btn" class="add-task-btn">Add a new task</button>
        `;
        taskList.appendChild(noTasksElement);

        // Add event listener for the add task button
        document
          .getElementById('add-task-btn')
          .addEventListener('click', () => {
            addNewTask(activeTaskListId);
          });

        return;
      }

      // Add a button to add a new task at the top
      const addTaskBtn = document.createElement('div');
      addTaskBtn.className = 'add-task-container';
      addTaskBtn.innerHTML = `<button id="add-task-btn" class="add-task-btn">Add a new task</button>`;
      taskList.appendChild(addTaskBtn);

      // Add event listener for the add task button
      document.getElementById('add-task-btn').addEventListener('click', () => {
        addNewTask(activeTaskListId);
      });

      console.log(`Found ${tasks.length} tasks, rendering...`);
      tasks.forEach((task) => {
        console.log('Task:', task.title, 'Status:', task.status);
        const li = document.createElement('li');
        li.className = 'task-item';
        li.dataset.taskId = task.id;
        li.dataset.taskListId = activeTaskListId;

        li.innerHTML = `
          <input type="checkbox" class="task-checkbox" ${
            task.status === 'completed' ? 'checked' : ''
          }>
          <span class="task-title ${
            task.status === 'completed' ? 'completed' : ''
          }">
            ${task.title || 'Untitled Task'}
          </span>
        `;

        // Add event listener to handle checkbox clicks
        li.querySelector('.task-checkbox').addEventListener(
          'click',
          function (event) {
            const isCompleted = this.checked;
            const taskId = li.dataset.taskId;
            const taskListId = li.dataset.taskListId;

            updateTaskStatus(taskListId, taskId, isCompleted);
          },
        );

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

// Function to add a new task
function addNewTask(taskListId) {
  const taskTitle = prompt('Enter task title:');
  if (!taskTitle) return; // User cancelled

  console.log('Adding new task:', taskTitle);

  // Show loading indicator
  const taskList = document.getElementById('task-list');
  const loadingLi = document.createElement('li');
  loadingLi.textContent = 'Adding task...';
  loadingLi.className = 'task-item loading';
  taskList.appendChild(loadingLi);

  // Call the API to add the task
  gapi.client.tasks.tasks
    .insert({
      tasklist: taskListId,
      resource: {
        title: taskTitle,
        status: 'needsAction',
      },
    })
    .then((response) => {
      console.log('Task added successfully:', response);
      // Reload the tasks list
      loadTasks();
    })
    .catch((error) => {
      console.error('Error adding task:', error);
      alert(
        'Failed to add task: ' +
          (error.result?.error?.message || error.message || 'Unknown error'),
      );
      // Remove the loading indicator
      taskList.removeChild(loadingLi);
    });
}

// Function to update task status
function updateTaskStatus(taskListId, taskId, isCompleted) {
  console.log(
    'Updating task status:',
    taskId,
    isCompleted ? 'completed' : 'needsAction',
  );

  // Update UI immediately for better user experience
  const taskElement = document.querySelector(`li[data-task-id="${taskId}"]`);
  const titleElement = taskElement.querySelector('.task-title');

  if (isCompleted) {
    titleElement.classList.add('completed');
  } else {
    titleElement.classList.remove('completed');
  }

  // Call the API to update the task
  gapi.client.tasks.tasks
    .patch({
      tasklist: taskListId,
      task: taskId,
      resource: {
        id: taskId,
        status: isCompleted ? 'completed' : 'needsAction',
      },
    })
    .then((response) => {
      console.log('Task status updated successfully:', response);
    })
    .catch((error) => {
      console.error('Error updating task status:', error);
      alert(
        'Failed to update task: ' +
          (error.result?.error?.message || error.message || 'Unknown error'),
      );

      // Revert UI changes on error
      if (isCompleted) {
        titleElement.classList.remove('completed');
        taskElement.querySelector('.task-checkbox').checked = false;
      } else {
        titleElement.classList.add('completed');
        taskElement.querySelector('.task-checkbox').checked = true;
      }
    });
}

document.addEventListener('DOMContentLoaded', () => {
  // Load both the Google API libraries
  const script1 = document.createElement('script');
  script1.src = 'https://apis.google.com/js/api.js';
  script1.onload = handleClientLoad;
  document.body.appendChild(script1);
});
