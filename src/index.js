import './style.css';
import { throws } from 'assert';

const tasksKey = 'tasks';
const ascKeyWord = 'asc';

class Task {
  constructor(obj) {
    this.text = obj.text || '';
    this.creationDate =
      (obj.creationDate && new Date(obj.creationDate)) || new Date();
    this.doneDate = obj.doneDate && new Date(obj.doneDate);
    this.id = obj.id || new Date().getTime();
  }

  complete() {
    this.doneDate = new Date();
  }

  open() {
    this.doneDate = null;
  }
}

class TasksStorage {
  constructor() {}

  getStoredTasks() {
    const tasks = localStorage.getItem('tasks');
    if (tasks) {
      const tasksJson = JSON.parse(tasks);
      return tasksJson.map(task => new Task(task));
    }
    return [];
  }

  updateTasksInLocalStorage(tasks) {
    const result = JSON.stringify(tasks);
    try {
      localStorage.setItem(tasksKey, result);
    } catch (ex) {
      console.error('Failed to add tasks to local storage', ex.message);
    }
  }
}

class ToDoList {
  constructor(obj) {
    this.query = obj.query;
    this.openSort = {
      id: obj.openSortId || 'open-select-sort',
      value: obj.openSortValue || 'asc-creationDate',
    };
    this.doneSort = {
      id: obj.doneSortId || 'done-select-sort',
      value: obj.doneSortValue || 'asc-doneDate',
    };
    this.openListId = obj.openListId || 'open-list';
    this.doneListId = obj.doneListId || 'done-list';
    this.tasksStorage = new TasksStorage();
  }

  render() {
    let tasks = this.tasksStorage.getStoredTasks();
    if (this.query) {
      const reg = new RegExp(this.query, 'ig');
      tasks = tasks.filter(task => task.text && task.text.match(reg));
    }
    const inProgress = tasks.filter(task => !task.doneDate);
    const done = tasks.filter(task => task.doneDate);
    this.renderTasks(inProgress, this.openSort, this.openListId);
    this.renderTasks(done, this.doneSort, this.doneListId);
  }

  renderTasks(tasks, sort, listId) {
    this.renderSortSelect(sort);
    const sorted = this.sortTasks(tasks, sort.value);
    const list = document.getElementById(listId);
    list.innerHTML = '';
    sorted.every(task => this.renderTask(task, list));
  }

  renderSortSelect(sort) {
    if (sort && sort.id && sort.value) {
      const select = document.getElementById(sort.id);
      select.value = sort.value;
    }
  }

  sortTasks(tasks, sort) {
    let [asc, attribute] = sort.split('-');
    asc = asc === ascKeyWord;
    return attribute ? this.sortByAttribute(tasks, asc, attribute) : tasks;
  }

  sortByAttribute(tasks, asc, attribute) {
    if (asc) {
      tasks.sort((a, b) => this.compare(a, b, attribute));
    } else {
      tasks.sort((a, b) => this.compare(b, a, attribute));
    }
    return tasks;
  }

  compare(a, b, attribute) {
    if (a[attribute] < b[attribute]) return -1;
    else if (a[attribute] > b[attribute]) return 1;
    else return 0;
  }

  renderTask(task, list) {
    const hiddenItem = document.getElementById('hidden-item');
    const item = hiddenItem.cloneNode(true);
    item.setAttribute('id', task.id);

    const itemChildren = item.children;

    const checkbox = itemChildren[0];
    if (task.doneDate) {
      checkbox.firstElementChild.firstElementChild.setAttribute(
        'checked',
        true,
      );
    }

    const text = itemChildren[1];
    const textValue = document.createTextNode(task.text);
    text.appendChild(textValue);

    const dates = itemChildren[2];
    const creationDate = this.createDateSpan(task.creationDate);
    const doneDate = this.createDateSpan(task.doneDate);
    dates.appendChild(creationDate);
    dates.appendChild(doneDate);

    const deleteButton = itemChildren[3];

    this.addEventListeners(checkbox, text, deleteButton);

    list.appendChild(item);

    item.classList.remove('tdl-hidden');
    return true;
  }

  addEventListeners(checkbox, text, deleteButton) {
    checkbox.firstElementChild.addEventListener('change', event =>
      this.changeDoneStatus(event),
    );
    text.addEventListener('dblclick', event => this.editTask(event));
    text.addEventListener('keypress', event => this.saveTask(event));
    deleteButton.firstElementChild.addEventListener('click', event =>
      this.deleteTask(event),
    );
  }

  changeDoneStatus(event) {
    const newStatus = event.target.checked;
    const id = event.target.parentElement.parentElement.parentElement.id;
    const tasks = this.tasksStorage.getStoredTasks();
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
    this.tasksStorage.updateTasksInLocalStorage(tasks);
    this.render();
  }

  editTask(event) {
    const textDiv = event.target;
    textDiv.setAttribute('contenteditable', true);
    textDiv.focus();
  }

  saveTask(event) {
    if (event.keyCode !== 13 && event.keyCode !== 27) {
      return;
    }
    const target = event.target;
    const parent = target.parentElement;

    const id = parent.id;
    const tasks = this.tasksStorage.getStoredTasks();
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
    this.tasksStorage.updateTasksInLocalStorage(tasks);
    target.textContent = value;
    target.removeAttribute('contentEditable');
  }

  deleteTask(event) {
    const id = event.target.parentElement.parentElement.parentElement.id;
    const tasks = this.tasksStorage
      .getStoredTasks()
      .filter(task => task.id.toString() !== id.toString());
    this.tasksStorage.updateTasksInLocalStorage(tasks);
    this.render();
  }

  createDateSpan(date) {
    const dateSpan = document.createElement('span');
    if (date) {
      const dateView = new DateView(date);
      const formatDate = dateView.getFormattedDate();
      const dateText = document.createTextNode(formatDate);
      dateSpan.appendChild(dateText);
    }
    return dateSpan;
  }

  search() {
    this.query = document.getElementById('search-input').value;
    this.render();
  }

  clearOpen() {
    const tasks = this.tasksStorage.getStoredTasks();
    const filtered = tasks.filter(task => task.doneDate);
    this.tasksStorage.updateTasksInLocalStorage(filtered);
    this.render();
  }

  clearDone() {
    const tasks = this.tasksStorage.getStoredTasks();
    const filtered = tasks.filter(task => !task.doneDate);
    this.tasksStorage.updateTasksInLocalStorage(filtered);
    this.render();
  }

  rememberSort(event) {
    const target = event.target;
    const key = target.id;
    const value = target.options[target.selectedIndex].value;
    localStorage.setItem(key, value);
    if (key.startsWith('open')) {
      this.openSort = { id: key, value: value };
    } else if (key.startsWith('done')) {
      this.doneSort = { id: key, value: value };
    }
    this.render();
  }

  addTask(event) {
    const inputValue = document.getElementById('new-task').value;
    if (!inputValue) {
      alert('Please fill task');
      return;
    }
    document.getElementById('new-task').value = '';
    const task = new Task({ text: inputValue });
    const tasks = this.tasksStorage.getStoredTasks();
    tasks.push(task);
    this.tasksStorage.updateTasksInLocalStorage(tasks);
    this.render();
  }

  addTaskByEnter(event) {
    if (event.keyCode === 13) this.addTask(event);
  }
}

class DateView {
  constructor(date) {
    this.date = date;
  }

  getHours() {
    let hours = this.date.getHours();
    const minutes = this.date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    if (hours < 10) {
      hours = '0' + hours;
    }
    return hours;
  }

  getMinutes() {
    let min = this.date.getMinutes();
    if (min < 10) {
      min = '0' + min;
    }
    return min;
  }

  getMonth() {
    let mm = this.date.getMonth() + 1;
    if (mm < 10) {
      mm = '0' + mm;
    }
    return mm;
  }

  getYear() {
    return this.date.getFullYear();
  }

  getDay() {
    let dd = this.date.getDate();
    if (dd < 10) {
      dd = '0' + dd;
    }
    return dd;
  }

  isToday() {
    const today = new Date();
    return (
      this.date.getFullYear() === today.getFullYear() &&
      this.date.getMonth() === today.getMonth() &&
      this.date.getDate() === today.getDate()
    );
  }

  getAmPm() {
    return this.date.getHours() >= 12 ? 'PM' : 'AM';
  }

  getFormattedDate() {
    let formatDate;
    const hours = this.getHours();
    const minutes = this.getMinutes();
    const ampm = this.getAmPm();
    if (this.isToday()) {
      formatDate = `${hours}:${minutes} ${ampm}`;
    } else {
      formatDate = `${this.getYear()}-${this.getMonth()}-${this.getDay()} ${hours}:${minutes} ${ampm}`;
    }
    return formatDate;
  }
}

const openSortId = 'open-select-sort';
const openSortValue = localStorage.getItem(openSortId);
const doneSortId = 'done-select-sort';
const doneSortValue = localStorage.getItem(doneSortId);
const openListId = 'open-list';
const doneListId = 'done-list';
const obj = {
  openSortId: openSortId,
  openSortValue: openSortValue,
  doneSortId: doneSortId,
  doneSortValue: doneSortValue,
  openListId: openListId,
  doneListId: doneListId,
};
const toDoList = new ToDoList(obj);

window.addEventListener('load', () => toDoList.render());
document
  .getElementById('clear-open')
  .addEventListener('click', () => toDoList.clearOpen());
document
  .getElementById('clear-done')
  .addEventListener('click', () => toDoList.clearDone());
document
  .getElementById('search-input')
  .addEventListener('keyup', () => toDoList.search());
document
  .getElementById('open-select-sort')
  .addEventListener('change', event => toDoList.rememberSort(event));
document
  .getElementById('done-select-sort')
  .addEventListener('change', event => toDoList.rememberSort(event));
document
  .getElementById('new-task-button')
  .addEventListener('click', event => toDoList.addTask(event));
document
  .getElementById('new-task')
  .addEventListener('keyup', event => toDoList.addTaskByEnter(event));
