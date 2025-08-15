// This is the complete, hybrid script for the Taskr application.
// It includes loading indicators, improved error handling, and uses the shared utils file.

document.addEventListener('DOMContentLoaded', async () => {

    // --- AUTHENTICATION CHECK ---
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    const user = session.user;

    // --- DOM ELEMENTS ---
    const loaderOverlay = document.getElementById('loader-overlay');
    const notificationContainer = document.getElementById('notification-container');
    const projectsView = document.getElementById('view-projects');
    const tasksView = document.getElementById('view-tasks');
    const singleProjectView = document.getElementById('view-single-project');
    const tabBtnProjects = document.getElementById('tab-btn-projects');
    const tabBtnTasks = document.getElementById('tab-btn-tasks');
    const projectList = document.getElementById('project-list');
    const noProjectsMessage = document.getElementById('no-projects-message');
    const singleProjectHeader = document.getElementById('single-project-header');
    const singleProjectTaskList = document.getElementById('single-project-task-list');
    const backToProjectsBtn = document.getElementById('back-to-projects-btn');
    const singleProjectNoTasksMessage = document.getElementById('single-project-no-tasks-message');
    const addNoteForm = document.getElementById('add-note-form');
    const notesListContainer = document.getElementById('project-notes-list');
    const addProjectForm = document.getElementById('add-project-form');
    const addTaskForm = document.getElementById('add-task-form');
    const taskList = document.getElementById('task-list');
    const noTasksMessage = document.getElementById('no-tasks-message');
    const taskProjectSelect = document.getElementById('task-project-select');
    const editProjectModal = document.getElementById('edit-project-modal');
    const editProjectForm = document.getElementById('edit-project-form');
    const cancelEditProjectBtn = document.getElementById('cancel-edit-project-btn');
    const deleteProjectBtn = document.getElementById('delete-project-btn'); // NEW
    const editTaskModal = document.getElementById('edit-task-modal');
    const editTaskForm = document.getElementById('edit-task-form');
    const cancelEditTaskBtn = document.getElementById('cancel-edit-task-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmationTitle = document.getElementById('confirmation-title');
    const confirmationMessage = document.getElementById('confirmation-message');
    const cancelConfirmationBtn = document.getElementById('cancel-confirmation-btn');
    const confirmActionBtn = document.getElementById('confirm-action-btn');
    const filterProject = document.getElementById('filter-project');
    const filterPriority = document.getElementById('filter-priority');
    const filterDate = document.getElementById('filter-date');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const filterProjectStatus = document.getElementById('filter-project-status');
    const filterProjectTasksDue = document.getElementById('filter-project-tasks-due');
    const clearProjectFiltersBtn = document.getElementById('clear-project-filters-btn');

    // --- UI FEEDBACK HELPERS ---
    const showLoader = () => { loaderOverlay.style.display = 'flex'; };
    const hideLoader = () => { loaderOverlay.style.display = 'none'; };

    const startButtonLoading = (button) => {
        button.disabled = true;
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = '<span class="spinner"></span>';
    };
    const stopButtonLoading = (button) => {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.innerHTML = button.dataset.originalText;
        }
    };

    const showNotification = (message, isError = false) => {
        notificationContainer.textContent = message;
        notificationContainer.className = `glass-container fixed top-5 right-5 z-[101] text-white px-6 py-3 transition-transform transform ${isError ? 'bg-red-500/30' : 'bg-green-500/30'}`;
        notificationContainer.classList.remove('translate-x-[calc(100%+2rem)]');

        setTimeout(() => {
            notificationContainer.classList.add('translate-x-[calc(100%+2rem)]');
        }, 3000);
    };

    // --- STATE MANAGER ---
    const stateManager = {
        projects: [],
        tasks: [],
        currentProjectId: null,
        taskFilters: { project: 'all', priority: 'all', dateRange: 'all' },
        projectFilters: { status: 'all', tasksDue: 'all' },

        async loadData() {
            const { data: projects, error: projectsError } = await _supabase
                .from('projects')
                .select('*')
                .or(`user_id.eq.${user.id},user_id.is.null`);

            if (projectsError) {
                showNotification('Error fetching projects: ' + projectsError.message, true);
                console.error('Error fetching projects:', projectsError);
            } else {
                this.projects = projects || [];
            }

            const { data: tasks, error: tasksError } = await _supabase.from('tasks').select('*');
            if (tasksError) {
                showNotification('Error fetching tasks: ' + tasksError.message, true);
                console.error('Error fetching tasks:', tasksError);
            } else {
                this.tasks = tasks || [];
            }
        },

        async addProject(projectData) {
            const { data, error } = await _supabase.from('projects').insert([{ ...projectData, user_id: user.id }]).select();
            if (error) {
                showNotification('Error adding project: ' + error.message, true);
                console.error('Error adding project:', error);
                return null;
            }
            this.projects.push(data[0]);
            showNotification('Project added successfully!', false);
            return data[0];
        },

        async updateProject(updateData) {
            const { id, ...dataToUpdate } = updateData;
            const { data, error } = await _supabase.from('projects').update(dataToUpdate).eq('id', id).select();
            if (error) {
                showNotification('Error updating project: ' + error.message, true);
                console.error('Error updating project:', error);
                return null;
            }
            const index = this.projects.findIndex(p => p.id === id);
            if (index !== -1) this.projects[index] = data[0];
            showNotification('Project updated successfully!', false);
            return data[0];
        },
        
        // NEW: Function to delete a project and its tasks
        async deleteProject(projectId) {
            // Step 1: Delete all tasks associated with this project
            const { error: tasksError } = await _supabase
                .from('tasks')
                .delete()
                .eq('project_id', projectId);

            if (tasksError) {
                showNotification('Error deleting associated tasks: ' + tasksError.message, true);
                console.error('Error deleting tasks:', tasksError);
                return false;
            }

            // Step 2: Delete the project itself
            const { error: projectError } = await _supabase
                .from('projects')
                .delete()
                .eq('id', projectId);

            if (projectError) {
                showNotification('Error deleting project: ' + projectError.message, true);
                console.error('Error deleting project:', projectError);
                return false;
            }

            // Step 3: Update local state
            this.projects = this.projects.filter(p => p.id !== Number(projectId));
            this.tasks = this.tasks.filter(t => t.project_id !== Number(projectId));
            
            showNotification('Project and all its tasks deleted successfully.', false);
            return true;
        },

        getProject(id) { return this.projects.find(p => p.id === Number(id)); },

        async addNote(projectId, noteText) {
            const project = this.getProject(projectId);
            if (!project) return null;
            const newNote = { 
                id: Date.now(), 
                text: noteText, 
                author: user.email, 
                timestamp: new Date().toISOString() 
            };
            const updatedNotes = [...(project.notes || []), newNote];
            const { error } = await _supabase.from('projects').update({ notes: updatedNotes }).eq('id', projectId);
            if (error) {
                showNotification("Error adding note: " + error.message, true);
                console.error("Error adding note:", error);
                return null;
            }
            project.notes = updatedNotes;
            showNotification('Note added!', false);
            return { project, newNote };
        },
        async deleteNote(projectId, noteId) {
            const project = this.getProject(projectId);
            if (!project || !project.notes) return false;
            const updatedNotes = project.notes.filter(note => note.id !== Number(noteId));
            const { error } = await _supabase.from('projects').update({ notes: updatedNotes }).eq('id', projectId);
            if (error) {
                showNotification("Error deleting note: " + error.message, true);
                console.error("Error deleting note:", error);
                return false;
            }
            project.notes = updatedNotes;
            showNotification('Note deleted.', false);
            return true;
        },

        async addTask(taskData) {
            const { data, error } = await _supabase.from('tasks').insert([{ ...taskData, user_id: user.id }]).select();
            if (error) {
                showNotification('Error adding task: ' + error.message, true);
                console.error('Error adding task:', error);
                return null;
            }
            this.tasks.push(data[0]);
            showNotification('Task added successfully!', false);
            return data[0];
        },
        async updateTask(updateData) {
            const { id, ...dataToUpdate } = updateData;
            const { data, error } = await _supabase.from('tasks').update(dataToUpdate).eq('id', id).select();
            if (error) {
                showNotification('Error updating task: ' + error.message, true);
                console.error('Error updating task:', error);
                return null;
            }
            const index = this.tasks.findIndex(t => t.id === Number(id));
            if (index !== -1) this.tasks[index] = data[0];
            if (Object.keys(dataToUpdate).length > 1) {
                 showNotification('Task updated successfully!', false);
            }
            return data[0];
        },
        async deleteTask(taskId) {
            const { error } = await _supabase.from('tasks').delete().eq('id', taskId);
            if (error) {
                showNotification('Error deleting task: ' + error.message, true);
                console.error('Error deleting task:', error);
                return false;
            }
            this.tasks = this.tasks.filter(t => t.id !== Number(taskId));
            showNotification('Task deleted.', false);
            return true;
        },
        getTasksForProject(projectId) { return this.tasks.filter(t => Number(t.project_id) === Number(projectId)); }
    };

    // --- HELPERS ---
    const formatTime = (timeString) => { if (!timeString) return ''; const [hour, minute] = timeString.split(':'); const date = new Date(); date.setHours(hour, minute); return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
    const getStatusInfo = (status) => { const statusMap = { 'lead': { text: 'Lead', className: 'status-lead' }, 'dp-in-progress': { text: 'DP In Progress', className: 'status-dp-in-progress' }, 'bp-in-progress': { text: 'BP In Progress', className: 'status-bp-in-progress' }, 'complete': { text: 'Complete', className: 'status-complete' }, 'lost': { text: 'Lost', className: 'status-lost' }, }; return statusMap[status] || { text: 'N/A', className: '' }; };
    const formatNoteTimestamp = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    };
    
    // --- CONFIRMATION MODAL ---
    let confirmationCallback = null;
    const openConfirmationModal = (title, message, onConfirm) => { confirmationTitle.textContent = title; confirmationMessage.textContent = message; confirmationCallback = onConfirm; confirmationModal.classList.remove('opacity-0', 'pointer-events-none'); confirmationModal.querySelector('.modal-container').classList.remove('scale-95'); };
    const closeConfirmationModal = () => { confirmationModal.classList.add('opacity-0', 'pointer-events-none'); confirmationModal.querySelector('.modal-container').classList.add('scale-95'); confirmationCallback = null; };
    confirmActionBtn.addEventListener('click', () => { if (typeof confirmationCallback === 'function') { confirmationCallback(); } closeConfirmationModal(); });
    cancelConfirmationBtn.addEventListener('click', closeConfirmationModal);
    
    // --- UI & RENDERING ---
    const createTaskElement = (task) => { const taskElement = document.createElement('div'); const project = stateManager.getProject(task.project_id); const dueDate = task.due_date ? new Date(task.due_date) : null; const isOverdue = dueDate && !task.completed && (new Date(dueDate.toDateString()) < new Date(new Date().toDateString())); taskElement.className = `task-item glass-container p-4 flex items-center justify-between priority-${task.priority}`; taskElement.dataset.id = task.id; taskElement.innerHTML = `<div class="flex-grow flex items-center"><input type="checkbox" class="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer flex-shrink-0" ${task.completed ? 'checked' : ''}><div class="ml-4"><p class="task-title font-semibold text-lg text-white">${task.title}</p><div class="flex items-center flex-wrap gap-x-4 text-sm text-gray-300 mt-1">${project ? `<span><strong>Project:</strong> ${project.name}</span>` : ''}${task.due_date ? `<span class="${isOverdue ? 'text-red-400 font-semibold' : ''}"><strong>Due:</strong> ${new Date(task.due_date).toLocaleDateString()} ${task.due_time ? formatTime(task.due_time) : ''}</span>` : ''}</div></div></div><div class="flex items-center flex-shrink-0 ml-4"><button class="edit-task-btn text-gray-400 hover:text-white transition-colors mr-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button><button class="delete-btn text-gray-400 hover:text-red-400 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div>`; return taskElement; };
    const createProjectCardElement = (project) => { const projectCard = document.createElement('div'); const statusInfo = getStatusInfo(project.status); projectCard.className = 'glass-container p-6 flex flex-col justify-between'; projectCard.dataset.id = project.id; projectCard.innerHTML = `<div><div class="flex justify-between items-start"><div class="flex-grow cursor-pointer project-card-main"><h3 class="text-xl font-bold text-white">${project.name}</h3><p class="text-sm text-gray-300 mt-1">${project.client_name || 'No client specified'}</p></div><button class="edit-project-btn text-gray-400 hover:text-white transition-colors flex-shrink-0 ml-2"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button></div><div class="mt-4 border-t pt-4 cursor-pointer project-card-main border-white/20"><p class="text-sm"><strong>Address:</strong> ${project.address || 'N/A'}</p></div></div><div class="mt-4 flex justify-end"><span class="status-badge ${statusInfo.className}">${statusInfo.text}</span></div>`; return projectCard; };
    const renderProjects = () => { projectList.innerHTML = ''; const filteredProjects = getFilteredProjects(); noProjectsMessage.classList.toggle('hidden', filteredProjects.length > 0); filteredProjects.forEach(project => projectList.appendChild(createProjectCardElement(project))); };
    const renderTasks = (container, taskArray, noTasksMsgEl) => { container.innerHTML = ''; noTasksMsgEl.classList.toggle('hidden', taskArray.length > 0); taskArray.sort((a, b) => (a.completed - b.completed) || new Date(a.due_date) - new Date(b.due_date) || (a.priority - b.priority)).forEach(task => container.appendChild(createTaskElement(task))); };
    const renderSingleProjectPage = (projectId) => { const project = stateManager.getProject(projectId); if (!project) return; const statusInfo = getStatusInfo(project.status); singleProjectView.dataset.projectId = project.id; singleProjectHeader.innerHTML = `<div class="flex justify-between items-start"><div><h3 class="text-2xl font-bold text-white">${project.name}</h3><p class="text-md text-gray-300 mt-1">${project.client_name || ''} - ${project.client_company || 'N/A'}</p></div><span class="status-badge ${statusInfo.className}">${statusInfo.text}</span></div><div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm"><p><strong>Address:</strong> ${project.address || 'N/A'}</p><p><strong>Value:</strong> $${project.value ? Number(project.value).toLocaleString() : '0'}</p><p><strong>Client Email:</strong> <a href="mailto:${project.client_email}" class="text-indigo-400 hover:underline">${project.client_email || 'N/A'}</a></p><p><strong>Client Phone:</strong> <a href="tel:${project.client_phone}" class="text-indigo-400 hover:underline">${project.client_phone || 'N/A'}</a></p></div>`; document.getElementById('project-type-detail').textContent = project.project_type || 'N/A'; document.getElementById('project-category-detail').textContent = project.project_category || 'N/A'; document.getElementById('services-required-detail').textContent = project.services_required || 'N/A'; document.getElementById('project-area-detail').textContent = `${project.project_area || '0'} ${project.area_unit || ''}`; document.getElementById('possession-date-detail').textContent = project.possession_date ? new Date(project.possession_date).toLocaleDateString() : 'N/A'; document.getElementById('initial-note-detail').textContent = project.other_info || 'No initial notes were provided.'; const filesList = document.getElementById('project-files-list'); filesList.innerHTML = ''; if (project.uploaded_files && project.uploaded_files.files && project.uploaded_files.files.length > 0) { project.uploaded_files.files.forEach(fileUrl => { const fileName = fileUrl.split('/').pop().split('?')[0]; const link = document.createElement('a'); link.href = fileUrl; link.textContent = decodeURIComponent(fileName); link.target = '_blank'; link.className = 'block text-indigo-400 hover:underline'; filesList.appendChild(link); }); } else { filesList.innerHTML = '<p class="text-gray-400">No files were uploaded with the inquiry.</p>'; } const projectTasks = stateManager.getTasksForProject(projectId); renderTasks(singleProjectTaskList, projectTasks, singleProjectNoTasksMessage); renderNotes(project); };
    const renderNotes = (project) => {
        notesListContainer.innerHTML = '';
        if (!project.notes || project.notes.length === 0) {
            notesListContainer.innerHTML = `<p class="text-gray-400 text-sm">No ongoing notes for this project yet.</p>`;
            return;
        }
        const sortedNotes = [...project.notes].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        sortedNotes.forEach(note => {
            const noteEl = document.createElement('div');
            noteEl.className = 'flex justify-between items-start bg-black/20 p-3 rounded-lg';
            noteEl.dataset.noteId = note.id;
            
            const authorInfo = note.author 
                ? `<p class="text-xs text-gray-400 mt-1">${note.author.split('@')[0]} - ${formatNoteTimestamp(note.timestamp)}</p>` 
                : '';

            noteEl.innerHTML = `
                <div class="flex-grow mr-4">
                    <p class="text-white whitespace-pre-wrap">${note.text}</p>
                    ${authorInfo}
                </div>
                <button class="delete-note-btn text-gray-400 hover:text-white flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            `;
            notesListContainer.appendChild(noteEl);
        });
    };
    const populateProjectDropdowns = () => { const dropdowns = [taskProjectSelect, document.getElementById('edit-task-project-select'), filterProject]; dropdowns.forEach(dropdown => { const selectedValue = dropdown.value; dropdown.innerHTML = `<option value="${dropdown.id === 'filter-project' ? 'all' : 'none'}">${dropdown.id === 'filter-project' ? 'All Projects' : 'No Project'}</option>`; stateManager.projects.forEach(project => { const option = document.createElement('option'); option.value = project.id; option.textContent = project.name; dropdown.appendChild(option); }); dropdown.value = selectedValue; }); };

    // --- FILTERING LOGIC ---
    const getFilteredProjects = () => { let filtered = [...stateManager.projects]; const { status, tasksDue } = stateManager.projectFilters; if (status !== 'all') filtered = filtered.filter(p => p.status === status); if (tasksDue !== 'all') { const today = new Date(); today.setHours(0, 0, 0, 0); filtered = filtered.filter(project => { const projectTasks = stateManager.getTasksForProject(project.id); if (projectTasks.length === 0) return false; return projectTasks.some(task => { if (!task.due_date) return false; const dueDate = new Date(task.due_date); if (tasksDue === 'today') return dueDate.toDateString() === today.toDateString(); if (tasksDue === 'tomorrow') { const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1); return dueDate.toDateString() === tomorrow.toDateString(); } if (tasksDue === 'this-week') { const dayOfWeek = today.getDay(); const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dayOfWeek); const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); return dueDate >= startOfWeek && dueDate <= endOfWeek; } if (tasksDue === 'overdue') return dueDate < today && !task.completed; return false; }); }); } return filtered; };
    const getFilteredTasks = () => { let filtered = [...stateManager.tasks]; const { project, priority, dateRange } = stateManager.taskFilters; if (project !== 'all') filtered = filtered.filter(task => String(task.project_id) === String(project)); if (priority !== 'all') filtered = filtered.filter(task => String(task.priority) === String(priority)); if (dateRange !== 'all') { const today = new Date(new Date().toDateString()); if (dateRange === 'today') { filtered = filtered.filter(task => task.due_date && new Date(task.due_date).toDateString() === today.toDateString()); } else if (dateRange === 'this-week') { const dayOfWeek = today.getDay(); const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - dayOfWeek); const endOfWeek = new Date(startOfWeek); endOfWeek.setDate(startOfWeek.getDate() + 6); filtered = filtered.filter(task => task.due_date && new Date(task.due_date) >= startOfWeek && new Date(task.due_date) <= endOfWeek); } else if (dateRange === 'overdue') { filtered = filtered.filter(task => task.due_date && !task.completed && new Date(task.due_date) < today); } } return filtered; };

    // --- VIEW & EVENT HANDLERS ---
    const switchView = (view, projectId = null) => { stateManager.currentProjectId = projectId; [projectsView, tasksView, singleProjectView].forEach(v => v.classList.add('hidden')); [tabBtnProjects, tabBtnTasks].forEach(b => b.classList.remove('active')); if (view === 'projects') { projectsView.classList.remove('hidden'); tabBtnProjects.classList.add('active'); renderProjects(); } else if (view === 'tasks') { tasksView.classList.remove('hidden'); tabBtnTasks.classList.add('active'); renderTasks(taskList, getFilteredTasks(), noTasksMessage); } else if (view === 'single-project') { singleProjectView.classList.remove('hidden'); tabBtnProjects.classList.add('active'); renderSingleProjectPage(projectId); } };
    const handleAddProject = async (e) => { e.preventDefault(); const addButton = e.target.querySelector('button[type="submit"]'); startButtonLoading(addButton); const newProject = await stateManager.addProject({ name: document.getElementById('project-name').value.trim(), client_name: document.getElementById('project-client-name').value.trim(), address: document.getElementById('project-address').value.trim(), status: document.getElementById('project-status').value, value: document.getElementById('project-value').value, client_phone: document.getElementById('project-client-phone').value.trim(), client_email: document.getElementById('project-client-email').value.trim(), notes: document.getElementById('project-notes').value.trim() ? [{ id: Date.now(), text: document.getElementById('project-notes').value.trim() }] : [], }); if (newProject) { renderProjects(); populateProjectDropdowns(); addProjectForm.reset(); } stopButtonLoading(addButton); };
    const handleAddTask = async (e) => { e.preventDefault(); const addButton = e.target.querySelector('button[type="submit"]'); startButtonLoading(addButton); const newTask = await stateManager.addTask({ title: document.getElementById('task-title').value.trim(), project_id: document.getElementById('task-project-select').value, due_date: document.getElementById('task-due-date').value, due_time: document.getElementById('task-due-time').value, priority: document.getElementById('task-priority').value, }); if (newTask) { renderTasks(taskList, getFilteredTasks(), noTasksMessage); addTaskForm.reset(); } stopButtonLoading(addButton); };
    const handleTaskInteraction = async (e) => { const taskElement = e.target.closest('.task-item'); if (!taskElement) return; const taskId = Number(taskElement.dataset.id); if (e.target.closest('.delete-btn')) { openConfirmationModal('Delete Task?', 'Are you sure you want to delete this task?', async () => { if (await stateManager.deleteTask(taskId)) { taskElement.remove(); } }); } else if (e.target.closest('.edit-task-btn')) { const task = stateManager.tasks.find(t => t.id === taskId); if(task) openEditTaskModal(task); } else if (e.target.type === 'checkbox') { await stateManager.updateTask({ id: taskId, completed: e.target.checked }); taskElement.classList.toggle('completed', e.target.checked); } };
    const handleProjectListClick = (e) => { const card = e.target.closest('[data-id]'); if (!card) return; const projectId = Number(card.dataset.id); if (e.target.closest('.edit-project-btn')) { const project = stateManager.getProject(projectId); if(project) openEditProjectModal(project); } else if (e.target.closest('.project-card-main')) { switchView('single-project', projectId); } };
    
    // --- MODAL & UPDATE HANDLERS ---
    const openEditTaskModal = (task) => { const form = document.getElementById('edit-task-form'); form.querySelector('#edit-task-id').value = task.id; form.querySelector('#edit-task-title').value = task.title; form.querySelector('#edit-task-project-select').value = task.project_id || 'none'; form.querySelector('#edit-task-due-date').value = task.due_date || ''; form.querySelector('#edit-task-due-time').value = task.due_time || ''; form.querySelector('#edit-task-priority').value = task.priority; editTaskModal.classList.remove('opacity-0', 'pointer-events-none'); editTaskModal.querySelector('.modal-container').classList.remove('scale-95'); };
    const closeEditTaskModal = () => { editTaskModal.classList.add('opacity-0', 'pointer-events-none'); editTaskModal.querySelector('.modal-container').classList.add('scale-95'); };
    const openEditProjectModal = (project) => { const form = document.getElementById('edit-project-form'); form.querySelector('#edit-project-id').value = project.id; form.querySelector('#edit-project-name').value = project.name; form.querySelector('#edit-project-status').value = project.status || 'lead'; form.querySelector('#edit-project-client-name').value = project.client_name || ''; form.querySelector('#edit-project-client-company').value = project.client_company || ''; form.querySelector('#edit-project-address').value = project.address || ''; form.querySelector('#edit-project-value').value = project.value || ''; form.querySelector('#edit-project-client-phone').value = project.client_phone || ''; form.querySelector('#edit-project-client-email').value = project.client_email || ''; form.querySelector('#edit-project-type').value = project.project_type || ''; form.querySelector('#edit-project-category').value = project.project_category || ''; form.querySelector('#edit-services-required').value = project.services_required || ''; form.querySelector('#edit-possession-date').value = project.possession_date || ''; form.querySelector('#edit-project-area').value = project.project_area || ''; form.querySelector('#edit-area-unit').value = project.area_unit || ''; editProjectModal.classList.remove('opacity-0', 'pointer-events-none'); editProjectModal.querySelector('.modal-container').classList.remove('scale-95'); };
    const closeEditProjectModal = () => { editProjectModal.classList.add('opacity-0', 'pointer-events-none'); editProjectModal.querySelector('.modal-container').classList.add('scale-95'); };
    const handleUpdateTask = async (e) => { e.preventDefault(); const form = e.target; const saveButton = form.querySelector('button[type="submit"]'); startButtonLoading(saveButton); const updatedTask = await stateManager.updateTask({ id: form.querySelector('#edit-task-id').value, title: form.querySelector('#edit-task-title').value.trim(), project_id: form.querySelector('#edit-task-project-select').value, due_date: form.querySelector('#edit-task-due-date').value, due_time: form.querySelector('#edit-task-due-time').value, priority: form.querySelector('#edit-task-priority').value, }); if (updatedTask) { if (tasksView.classList.contains('hidden')) renderSingleProjectPage(stateManager.currentProjectId); else renderTasks(taskList, getFilteredTasks(), noTasksMessage); } stopButtonLoading(saveButton); closeEditTaskModal(); };
    const handleUpdateProject = async (e) => { e.preventDefault(); const form = e.target; const saveButton = form.querySelector('button[type="submit"]'); startButtonLoading(saveButton); const projectId = Number(form.querySelector('#edit-project-id').value); const updatedProject = await stateManager.updateProject({ id: projectId, name: form.querySelector('#edit-project-name').value.trim(), client_name: form.querySelector('#edit-project-client-name').value.trim(), client_company: form.querySelector('#edit-project-client-company').value.trim(), address: form.querySelector('#edit-project-address').value.trim(), status: form.querySelector('#edit-project-status').value, value: form.querySelector('#edit-project-value').value, client_phone: form.querySelector('#edit-project-client-phone').value.trim(), client_email: form.querySelector('#edit-project-client-email').value.trim(), project_type: form.querySelector('#edit-project-type').value.trim(), project_category: form.querySelector('#edit-project-category').value.trim(), services_required: form.querySelector('#edit-services-required').value.trim(), possession_date: form.querySelector('#edit-possession-date').value || null, project_area: form.querySelector('#edit-project-area').value || null, area_unit: form.querySelector('#edit-area-unit').value.trim(), }); if (updatedProject) { renderProjects(); populateProjectDropdowns(); if(stateManager.currentProjectId === projectId) renderSingleProjectPage(projectId); } stopButtonLoading(saveButton); closeEditProjectModal(); };
    const handleTaskFilterChange = () => { stateManager.taskFilters.project = filterProject.value; stateManager.taskFilters.priority = filterPriority.value; stateManager.taskFilters.dateRange = filterDate.value; renderTasks(taskList, getFilteredTasks(), noTasksMessage); };
    const handleClearTaskFilters = () => { filterProject.value = 'all'; filterPriority.value = 'all'; filterDate.value = 'all'; handleTaskFilterChange(); };
    const handleProjectFilterChange = () => { stateManager.projectFilters.status = filterProjectStatus.value; stateManager.projectFilters.tasksDue = filterProjectTasksDue.value; renderProjects(); };
    const handleClearProjectFilters = () => { filterProjectStatus.value = 'all'; filterProjectTasksDue.value = 'all'; handleProjectFilterChange(); };
    const handleAddNote = async (e) => { e.preventDefault(); const addButton = e.target.querySelector('button[type="submit"]'); startButtonLoading(addButton); const noteText = document.getElementById('new-note-text').value.trim(); const projectId = stateManager.currentProjectId; if (!noteText || !projectId) { stopButtonLoading(addButton); return; } const result = await stateManager.addNote(projectId, noteText); if (result) { renderNotes(result.project); addNoteForm.reset(); } stopButtonLoading(addButton); };
    const handleDeleteNote = (e) => { const deleteButton = e.target.closest('.delete-note-btn'); if (!deleteButton) return; const noteElement = deleteButton.closest('[data-note-id]'); const noteId = Number(noteElement.dataset.noteId); const projectId = stateManager.currentProjectId; openConfirmationModal('Delete Note?', 'Are you sure you want to delete this note?', async () => { if (await stateManager.deleteNote(projectId, noteId)) { noteElement.remove(); } }); };
    const handleLogout = async () => { await _supabase.auth.signOut(); window.location.href = 'login.html'; };
    
    // NEW: Handler for the delete project button
    const handleDeleteProject = async (e) => {
        e.preventDefault();
        const projectId = Number(document.getElementById('edit-project-id').value);
        if (!projectId) return;

        openConfirmationModal(
            'Delete Project?',
            'This will permanently delete the project and ALL of its associated tasks. This action cannot be undone.',
            async () => {
                const success = await stateManager.deleteProject(projectId);
                if (success) {
                    closeEditProjectModal();
                    switchView('projects'); // Go back to the main project list
                }
            }
        );
    };

    // --- INITIALIZATION ---
    const init = async () => {
        showLoader();
        await stateManager.loadData();
        
        setupThemeSwitcher('theme-switcher', 'taskrTheme');

        populateProjectDropdowns();
        switchView('projects');

        // Event Listeners
        logoutBtn.addEventListener('click', handleLogout);
        tabBtnProjects.addEventListener('click', () => switchView('projects'));
        tabBtnTasks.addEventListener('click', () => switchView('tasks'));
        backToProjectsBtn.addEventListener('click', () => switchView('projects'));
        addProjectForm.addEventListener('submit', handleAddProject);
        addTaskForm.addEventListener('submit', handleAddTask);
        addNoteForm.addEventListener('submit', handleAddNote);
        projectList.addEventListener('click', handleProjectListClick);
        taskList.addEventListener('click', handleTaskInteraction);
        singleProjectTaskList.addEventListener('click', handleTaskInteraction);
        notesListContainer.addEventListener('click', handleDeleteNote);
        editProjectForm.addEventListener('submit', handleUpdateProject);
        cancelEditProjectBtn.addEventListener('click', closeEditProjectModal);
        deleteProjectBtn.addEventListener('click', handleDeleteProject); // NEW
        editTaskForm.addEventListener('submit', handleUpdateTask);
        cancelEditTaskBtn.addEventListener('click', closeEditTaskModal);
        filterProject.addEventListener('change', handleTaskFilterChange);
        filterPriority.addEventListener('change', handleTaskFilterChange);
        filterDate.addEventListener('change', handleTaskFilterChange);
        clearFiltersBtn.addEventListener('click', handleClearTaskFilters);
        filterProjectStatus.addEventListener('change', handleProjectFilterChange);
        filterProjectTasksDue.addEventListener('change', handleProjectFilterChange);
        clearProjectFiltersBtn.addEventListener('click', handleClearProjectFilters);

        hideLoader();
    }
    
    init();
});