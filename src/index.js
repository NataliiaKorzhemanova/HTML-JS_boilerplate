import './style.css';
import { throws } from 'assert';

const tasksKey = 'tasks';
const ascKeyWord = 'asc';

class Task {
  constructor(obj) {
    this.text = obj.text || '';
    this.creationDate =
      (obj.creationDate && new Date(obj.creationDate)) || new Date();
    this.done = obj.done || false;
    this.doneDate = obj.doneDate && new Date(obj.doneDate);
    this.id = obj.id || new Date().getTime();
  }

  complete() {
    this.done = true;
    this.doneDate = new Date();
  }

  open() {
    this.done = false;
    this.doneDate = undefined;
  }
}

const renderSortSelect = id => {
  const value = localStorage.getItem(id);
  if (value) {
    const select = document.getElementById(id);
    select.value = value;
  }
};

const renderInProgressTasks = async () => {
  renderSortSelect('open-select-sort');
  const inProgressTasks = await getInProgressTasks();
  const list = document.getElementById('open-list');
  list.innerHTML = '';
  inProgressTasks.every(task => renderTask(task, list));
};

const renderDoneTasks = async () => {
  renderSortSelect('done-select-sort');
  const doneTasks = await getDoneTasks();
  const list = document.getElementById('done-list');
  list.innerHTML = '';
  doneTasks.every(task => renderTask(task, list));
};

const changeDoneStatus = async event => {
  const newStatus = event.target.checked;
  const id = event.target.parentElement.parentElement.parentElement.id;
  const tasks = await getAllTasks();
  const index = tasks.findIndex(task => task.id.toString() === id.toString());
  if (index < 0) {
    return;
  }
  const task = tasks[index];
  if (newStatus) {
    task.complete();
  } else {
    task.open();
  }
  await updateTasksInLocalStorage(tasks);
  render();
};

const editTask = event => {
  const textDiv = event.target;
  textDiv.setAttribute('contenteditable', true);
  textDiv.focus();
};

const saveTask = async event => {
  if (event.keyCode !== 13 && event.keyCode !== 27) {
    return;
  }
  const target = event.target;
  const parent = target.parentElement;

  const id = parent.id;
  const tasks = [...(await getAllTasks())];
  const index = tasks.findIndex(task => task.id.toString() === id.toString());
  if (index < 0) {
    return;
  }
  const task = tasks[index];

  let value;
  if (event.keyCode === 13) {
    value = target.textContent;
  } else if (event.keyCode === 27) {
    value = task.value;
  }
  
  task.text = value;
  await updateTasksInLocalStorage(tasks);
  target.textContent = value;
  target.removeAttribute('contentEditable');
};

const deleteTask = async event => {
  const id = event.target.parentElement.parentElement.parentElement.id;
  const tasks = [...(await getAllTasks())].filter(
    task => task.id.toString() !== id.toString(),
  );
  await updateTasksInLocalStorage(tasks);
  render();
};

const renderTask = (task, list) => {
  const hiddenItem = document.getElementById('hidden-item');
  const item = hiddenItem.cloneNode(true);
  item.setAttribute('id', task.id);

  const hiddenCheckbox = document.getElementById('hidden-item-checkbox');
  const checkbox = hiddenCheckbox.cloneNode(true);
  checkbox.removeAttribute('id');
  if (task.done) {
    checkbox.firstElementChild.firstElementChild.setAttribute('checked', true);
  }
  checkbox.firstElementChild.addEventListener('change', event =>
    changeDoneStatus(event),
  );

  const hiddenText = document.getElementById('hidden-item-text');
  const text = hiddenText.cloneNode(true);
  text.removeAttribute('id');
  const textValue = document.createTextNode(task.text);
  text.appendChild(textValue);
  text.addEventListener('dblclick', editTask);
  text.addEventListener('keypress', event => saveTask(event));

  const hiddenDates = document.getElementById('hidden-item-dates');
  const dates = hiddenDates.cloneNode(true);
  dates.removeAttribute('id');
  const creationDate = createDateSpan(task.creationDate);
  const doneDate = createDateSpan(task.doneDate);
  dates.appendChild(creationDate);
  dates.appendChild(doneDate);

  const hiddenDeleteButton = document.getElementById('hidden-item-delete');
  const deleteButton = hiddenDeleteButton.cloneNode(true);
  deleteButton.removeAttribute('id');
  deleteButton.firstElementChild.addEventListener('click', event =>
    deleteTask(event),
  );

  item.appendChild(checkbox);
  item.appendChild(text);
  item.appendChild(dates);
  item.appendChild(deleteButton);

  removeHidden(checkbox, text, dates, deleteButton, item);

  list.appendChild(item);
  return true;
};

const removeHidden = (...args) => {
  [...args].every(arg => {
    arg.classList.remove('tdl-hidden');
    return true;
  });
};

const createDateSpan = date => {
  const dateSpan = document.createElement('span');
  if (date) {
    let formatDate;
    const hours = getHours(date);
    const minutes = getMinutes(date);
    const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
    if (isToday(date)) {
      formatDate = `${hours}:${minutes} ${ampm}`;
    } else {
      formatDate = `${date.getFullYear()}-${getMonth(date)}-${getDay(
        date,
      )} ${hours}:${minutes} ${ampm}`;
    }
    const dateText = document.createTextNode(formatDate);
    dateSpan.appendChild(dateText);
  }
  return dateSpan;
};

const getHours = date => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  if (hours < 10) {
    hours = '0' + hours;
  }
  return hours;
};

const getMinutes = date => {
  let min = date.getMinutes();
  if (min < 10) {
    min = '0' + min;
  }
  return min;
};

const getMonth = date => {
  let mm = date.getMonth() + 1;
  if (mm < 10) {
    mm = '0' + mm;
  }
  return mm;
};

const getDay = date => {
  let dd = date.getDate();
  if (dd < 10) {
    dd = '0' + dd;
  }
  return dd;
};

const isToday = date => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const render = async () => {
  renderInProgressTasks();
  renderDoneTasks();
};

const getAllTasks = async () => {
  const tasks = await localStorage.getItem('tasks');
  const tasksJson = await JSON.parse(tasks);
  return tasksJson.map(task => new Task(task));
};

const getTasks = async () => {
  let tasks = [...(await getAllTasks())];
  const query = getCurrentQuery();
  if (query) {
    const reg = new RegExp(query, 'ig');
    tasks = tasks.filter(task => task.text && task.text.match(reg));
  }
  return tasks;
};

const sortTasks = (tasks, sort) => {
  let [asc, attribute] = sort.split('-');
  asc = asc === ascKeyWord;
  return attribute ? sortByAttribute(tasks, asc, attribute) : tasks;
};

const compare = (a, b, attribute) => {
  if (a[attribute] < b[attribute]) return -1;
  else if (a[attribute] > b[attribute]) return 1;
  else return 0;
};

const getInProgressTasks = async () => {
  const allTasks = await getTasks();
  const inProgress = allTasks.filter(task => !task.done);
  const sort = localStorage.getItem('open-select-sort');
  const result = sort ? sortTasks(inProgress, sort) : inProgress;
  console.log(result);
  return result;
};

const getDoneTasks = async () => {
  const allTasks = await getTasks();
  const done = allTasks.filter(task => task.done);
  const sort = localStorage.getItem('done-select-sort');
  const result = sort ? sortTasks(done, sort) : done;
  console.log(result);
  return result;
};

const search = async () => {
  const query = getCurrentQuery();
  await render();
  console.debug(`Show elements by query ${query}`);
};

const getCurrentQuery = () => {
  return document.getElementById('search-input').value;
};

const sortByAttribute = (tasks, asc, attribute) => {
  let result = [...tasks];
  if (asc) {
    return result.sort((a, b) => compare(a, b, attribute));
  } else {
    return result.sort((a, b) => compare(b, a, attribute));
  }
};

const updateTasksInLocalStorage = async tasks => {
  const result = await JSON.stringify(tasks);
  try {
    localStorage.setItem(tasksKey, result);
  } catch (ex) {
    console.error('Failed to add tasks to local storage', ex.message);
  }
};

const clearByStatus = async done => {
  const tasks = await getTasks();
  const filtered = tasks.filter(task => task.done !== done);
  await updateTasksInLocalStorage(filtered);
};

const clearOpen = async () => {
  await clearByStatus(false);
  renderInProgressTasks();
  console.debug('Open items are removed');
};

const clearDone = async () => {
  await clearByStatus(true);
  renderDoneTasks();
  console.debug('Done items are removed');
};

const rememberSort = async event => {
  const target = event.target;
  const key = target.id;
  const value = target.options[target.selectedIndex].value;
  localStorage.setItem(key, value);
  if (key.startsWith('open')) {
    await renderInProgressTasks();
  } else if (key.startsWith('done')) {
    await renderDoneTasks();
  }
};

const addTask = async event => {
  const inputValue = document.getElementById('new-task').value;
  if (!inputValue) {
    alert('Please fill task');
    return;
  }
  document.getElementById('new-task').value = '';
  const task = new Task({ text: inputValue });
  const tasks = [...(await getAllTasks())];
  tasks.push(task);
  await updateTasksInLocalStorage(tasks);
  await localStorage.setItem('open-select-sort', 'desc-creationDate');
  renderInProgressTasks();
};

const addTaskByEnter = async event => {
  if (event.keyCode === 13) addTask(event);
};

window.addEventListener('load', () => render());
document
  .getElementById('clear-open')
  .addEventListener('click', () => clearOpen());
document
  .getElementById('clear-done')
  .addEventListener('click', () => clearDone());
document
  .getElementById('search-input')
  .addEventListener('keyup', () => search());
document
  .getElementById('open-select-sort')
  .addEventListener('change', event => rememberSort(event));
document
  .getElementById('done-select-sort')
  .addEventListener('change', event => rememberSort(event));
document
  .getElementById('new-task-button')
  .addEventListener('click', event => addTask(event));
document
  .getElementById('new-task')
  .addEventListener('keyup', event => addTaskByEnter(event));
